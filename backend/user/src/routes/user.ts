import express from 'express'
import { loginUser, verifyUser } from '../controllers/user.js';

const router =express.Router();

//route for login
router.post("/login",loginUser);

// route for verify user
router.post("/verify",verifyUser);


export default router;