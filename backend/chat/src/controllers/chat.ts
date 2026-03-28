import TryCatch from "../config/TryCatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.js";

// Controller to create a new chat between two users
export const createNewChat = TryCatch(async (req: AuthenticatedRequest, res) => {

    // Get logged-in user id from JWT middleware
    const userId = req.user?._id;

    // Get the other user id from request body
    const { otherUserId } = req.body;

    // Validate if other user id is provided
    if (!otherUserId) {
        res.status(400).json({
            message: "Other userId is required",
        });
        return;
    }

    // Check if a chat already exists between these two users
    const existingChat = await Chat.findOne({
        users: { $all: [userId, otherUserId], $size: 2 },
    });

    // If chat already exists, return existing chat
    if (existingChat) {
        res.json({
            message: "Chat already exists",
            chatId: existingChat._id,
        });
        return;
    }

    // If chat does not exist, create a new chat
    const newChat = await Chat.create({
        users: [userId, otherUserId],
    });

    // Send response with new chat id
    res.status(200).json({
        message: "New Chat Added",
        chatId: newChat._id,
    });
});