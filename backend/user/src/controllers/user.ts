import bcrypt from "bcryptjs";
import TryCatch from "../config/TryCatch.js";
import { generateToken } from "../config/generateToken.js";
import { publishToQueue } from "../config/rabbitmq.js";
import { buildOtpEmail } from "../config/otpEmail.js";
import { redisClient } from "../index.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import { User } from "../model/user.js";

export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        res.status(404).json({
            message: "No account found with this email. Please register first.",
        });
        return;
    }

    //rate limit queue so that user can generate only one otp at a time

    const rateLimitKey = `otp:ratelimit:${email}`
    const rateLimit = await redisClient.get(rateLimitKey)
    if (rateLimit) {
        res.status(429).json({
            message: "Too many requests. Please wait before requesting more new otp",
        });
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    //otp expires after 5 minutes
    const otpKey= `otp:${email}`
    await redisClient.set(otpKey,otp,{
        EX: 300,
    })

    //user can send next otp after 1 minute 
    await redisClient.set(rateLimitKey,"true",{
        EX: 60,
    });

    const { subject, text, html } = buildOtpEmail(otp, "sign in to ChatApp");

    const message = {
        to: email,
        subject,
        body: text,
        html,
    };

    await publishToQueue("send-otp",message)

    res.status(200).json({
        message: " OTP has been sent to your Email "
    })

});


//TO verify the user after OTP 

export const verifyUser = TryCatch(async(req,res)=>{
    const {email,otp:enteredOtp} =req.body;

    if(!email||!enteredOtp){
        res.status(400).json({
            message: "Email and OTP both are required",
        })
    }

    const otpKey = `otp:${email}`;

    const storedOtp = await redisClient.get(otpKey);
    
    //CONDITION TO CHECK OTP 
    if(!storedOtp||storedOtp!==enteredOtp){
        res.status(400).json({
            message:"Invalid or expired OTP entered"
        })
    }

    //if itp is correct
    await redisClient.del(otpKey)

    const user = await User.findOne({email});

    if(!user){
        res.status(404).json({
            message: "No account found with this email. Please register first.",
        });
        return;
    }

    //create token
    const token = generateToken(user);

    res.json({
        message:"User verified",
        user,
        token,
    })

});


// FETCH THE PROFILE
export const myProfile = TryCatch(async(req: AuthenticatedRequest,res)=>{
    const user =req.user;

    res.json(user);
})


//controller to update name
export const updateName = TryCatch(async(req:AuthenticatedRequest,res)=>{
    const user =await User.findById(req.user?._id)

    if(!user){
        res.status(404).json({
            message: "Please Login",
        });
        return;
    }

    user.name = req.body.name;

    await user.save();

    const token = generateToken(user);

    res.json({
        message: "User Updated",
        user,
        token,
    });

});


//get all users profile
export const getAllUsers = TryCatch(async(req:AuthenticatedRequest,res)=>{
    const Users =await User.find();

    res.json(Users);
});

//getonly one user

export const getAUser =TryCatch(async(req:AuthenticatedRequest,res)=>{
    const user= await User.findById(req.params.id);

    res.json(user);

})


// REGISTER - step 1: create a pending (unverified) account and email an OTP
export const registerUser = TryCatch(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({
            message: "Name, email and password are all required",
        });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({
            message: "Password must be at least 6 characters",
        });
        return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.verified) {
        res.status(400).json({
            message: "This email is already registered. Please login instead.",
        });
        return;
    }

    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many requests. Please wait before requesting a new otp",
        });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
        // unverified account retrying registration - refresh their details
        existingUser.name = name;
        existingUser.password = hashedPassword;
        await existingUser.save();
    } else {
        await User.create({ name, email, password: hashedPassword, verified: false });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;
    await redisClient.set(otpKey, otp, { EX: 300 });
    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    const { subject, text, html } = buildOtpEmail(otp, "verify your ChatApp account");

    await publishToQueue("send-otp", { to: email, subject, body: text, html });

    res.status(200).json({
        message: "OTP has been sent to your email to complete registration",
    });
});


// REGISTER - step 2: confirm the OTP, activate the account, issue a token
export const verifyRegisterOtp = TryCatch(async (req, res) => {
    const { email, otp: enteredOtp } = req.body;

    if (!email || !enteredOtp) {
        res.status(400).json({
            message: "Email and OTP both are required",
        });
        return;
    }

    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);

    if (!storedOtp || storedOtp !== enteredOtp) {
        res.status(400).json({
            message: "Invalid or expired OTP entered",
        });
        return;
    }

    await redisClient.del(otpKey);

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404).json({
            message: "No pending registration found for this email",
        });
        return;
    }

    user.verified = true;
    await user.save();

    const token = generateToken(user);

    res.json({
        message: "Account verified successfully",
        user,
        token,
    });
});


// LOGIN with email + password (no OTP wait)
export const loginWithPassword = TryCatch(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({
            message: "Email and password are required",
        });
        return;
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.password) {
        res.status(400).json({
            message: "Invalid email or password",
        });
        return;
    }

    if (!user.verified) {
        res.status(403).json({
            message: "Please verify your email before logging in",
        });
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        res.status(400).json({
            message: "Invalid email or password",
        });
        return;
    }

    // strip the hash before it ever reaches the JWT payload or the response body
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    const token = generateToken(userWithoutPassword);

    res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token,
    });
});


// Resend an OTP for either the login or the register flow
export const resendOtp = TryCatch(async (req, res) => {
    const { email, purpose } = req.body;

    if (!email) {
        res.status(400).json({
            message: "Email is required",
        });
        return;
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        res.status(404).json({
            message: "No account found with this email. Please register first.",
        });
        return;
    }

    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many requests. Please wait before requesting a new otp",
        });
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;
    await redisClient.set(otpKey, otp, { EX: 300 });
    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    const { subject, text, html } = buildOtpEmail(otp, purpose || "sign in to ChatApp");

    await publishToQueue("send-otp", { to: email, subject, body: text, html });

    res.status(200).json({
        message: "OTP has been resent to your email",
    });
});
