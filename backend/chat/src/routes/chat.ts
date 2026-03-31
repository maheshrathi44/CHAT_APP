import express from 'express';
import IsAuth from '../middlewares/isAuth.js';
import { createNewChat, getAllChats, getMessagesByChat, sendMessage } from '../controllers/chat.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

router.post("/chat/new",IsAuth,createNewChat);
router.get("/chat/all",IsAuth,getAllChats);
router.post("/message",IsAuth,upload.single('image'),sendMessage)
router.get("/message/:chatId",IsAuth,getMessagesByChat);

export default router;