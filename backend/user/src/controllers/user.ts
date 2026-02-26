import TryCatch from "../config/TryCatch.js";
import { generateToken } from "../config/generateToken.js";
import { publishToQueue } from "../config/rabbitmq.js";
import { redisClient } from "../index.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import { User } from "../model/user.js";

export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body

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

    const message = {
        to: email,
        subject: "Your OTP Code",
        body: `Your OTP is ${otp} . It is valid for 5 minutes only `
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

    let user = await User.findOne({email});

    //IF user not found than create name from first 8 characters 
    if(!user){
        const name= email.slice(0,8)
        user = await User.create({name,email});
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
