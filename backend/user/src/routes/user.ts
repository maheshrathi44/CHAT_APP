import express from 'express'
import { getAUser, getAllUsers, loginUser, myProfile, updateName, verifyUser } from '../controllers/user.js';
import { isAuth } from '../middleware/isAuth.js';

const router =express.Router();

//route for login
router.post("/login",loginUser);

// route for verify user
router.post("/verify",verifyUser);

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