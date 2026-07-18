import express from 'express'
import { getAUser, getAllUsers, loginUser, loginWithPassword, myProfile, registerUser, resendOtp, updateName, verifyRegisterOtp, verifyUser } from '../controllers/user.js';
import { isAuth } from '../middleware/isAuth.js';

const router =express.Router();

//route for login (otp-based, passwordless)
router.post("/login",loginUser);

// route for verify user (otp-based, passwordless)
router.post("/verify",verifyUser);

// route for register - step 1: create pending account + send otp
router.post("/register",registerUser);

// route for register - step 2: verify otp + activate account
router.post("/register/verify",verifyRegisterOtp);

// route for login with email + password
router.post("/login/password",loginWithPassword);

// route to resend an otp (login or register flow)
router.post("/otp/resend",resendOtp);

//fetch profile
router.get("/me",isAuth,myProfile);

//getall user
router.get("/user/all",isAuth,getAllUsers);


//getone user
router.get("/user/:id",getAUser);
//No need for authorization here becuase we need to get a user data in chat app so a user should be avle to see other user profile in order to chat with him.



//update_name
router.post("/update/user",isAuth,updateName);


export default router;