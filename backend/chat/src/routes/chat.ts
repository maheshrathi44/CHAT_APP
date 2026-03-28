import express from 'express';
import IsAuth from '../middlewares/isAuth.js';
import { createNewChat } from '../controllers/chat.js';

const router = express.Router();

router.post("/chat/new",IsAuth,createNewChat);

export default router;