import express from 'express';
import IsAuth from '../middlewares/isAuth.js';
import { createNewChat, getAllChats, sendMessage } from '../controllers/chat.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

router.post("/chat/new",IsAuth,createNewChat);
router.get("/chat/all",IsAuth,getAllChats);
router.post("/message",IsAuth,upload.single('image'),sendMessage)

export default router;