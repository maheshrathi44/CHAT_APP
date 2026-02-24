import TryCatch from "../config/TryCatch.js";
import { publishToQueue } from "../config/rabbitmq.js";
import { redisClient } from "../index.js";

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