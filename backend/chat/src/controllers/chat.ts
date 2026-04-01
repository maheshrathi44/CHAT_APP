import axios from "axios";
import TryCatch from "../config/TryCatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Messages } from "../models/Messages.js";
import { Chat } from "../models/chat.js";


// Controller to create a new chat between two users
export const createNewChat = TryCatch(async (req: AuthenticatedRequest, res) => {

    // Logged-in user id (from JWT middleware)
    const userId = req.user?._id;

    // Other user id sent from frontend
    const { otherUserId } = req.body;

    // Validation
    if (!otherUserId) {
        res.status(400).json({
            message: "Other userId is required",
        });
        return;
    }

    // Check if chat already exists between these two users
    const existingChat = await Chat.findOne({
        users: { $all: [userId, otherUserId], $size: 2 },
    });

    // If exists, return existing chat id
    if (existingChat) {
        res.json({
            message: "Chat already exists",
            chatId: existingChat._id,
        });
        return;
    }

    // Otherwise create new chat
    const newChat = await Chat.create({
        users: [userId, otherUserId],
    });

    // Send new chat id
    res.status(201).json({
        message: "New Chat Added",
        chatId: newChat._id,
    });
});


// Controller to get all chats of logged-in user
export const getAllChats = TryCatch(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    // Validate user
    if (!userId) {
        res.status(400).json({
            message: "UserId is missing",
        });
        return;
    }

    // Find all chats where this user is a participant
    const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });

    // For each chat, get other user info + unseen messages count
    const chatWithUserData = await Promise.all(
        chats.map(async (chat) => {

            // Find the other user in the chat
            const otherUserId = chat.users.find((id) => id !== userId);

            // Count unseen messages sent by the other user
            const unseenCount = await Messages.countDocuments({
                chatId: chat._id,
                sender: { $ne: userId as any },
                seen: false,
            });

            try {
                // Call user service to get other user's details
                const { data } = await axios.get(
                    `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
                );

                return {
                    user: data,
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    },
                };
            } catch (error) {
                // If user service fails, return fallback user
                console.log(error);
                return {
                    user: { _id: otherUserId, name: "Unknown User" },
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    },
                };
            }
        })
    );

    // Send chats with user info + unseen count
    res.json({
        chats: chatWithUserData,
    });
});


export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
    const senderId = req.user?._id // logged in user id
    const { chatId, text } = req.body // chat id and text message
    const imageFile = req.file; // image from multer + cloudinary

    // user must be logged in
    if (!senderId) {
        res.status(401).json({
            message: "unauthorised",
        });
        return;
    }

    // chat id must be present
    if (!chatId) {
        res.status(400).json({
            message: "ChatId required",
        });
        return;
    }

    // message cannot be empty (need text or image)
    if (!text && !imageFile) {
        res.status(401).json({
            message: "Either text or image is required",
        });
        return;
    }

    // find chat from DB
    const chat = await Chat.findById(chatId)

    if (!chat) {
        res.status(404).json({
            message: "Chat not found",
        });
        return;
    }

    // check if sender is part of this chat
    const isUserInChat = chat.users.some(
        (userId)=>userId.toString()=== senderId.toString()
    );

    if(!isUserInChat){
        res.status(403).json({
            message: "You are not participant of this Chat",
        });
        return;
    }

    // find other user in chat (receiver)
    const otherUserId = chat.users.find(
        (userId) => userId.toString()!== senderId.toString()
    );

    if(!otherUserId){
        res.status(401).json({
            message: "NO other user",
        });
        return;
    }

    // base message object
    let messageData: any = {
        chatId: chatId,
        sender :senderId,
        seen: false,
        seenAt: undefined,
    };

    // if image message
    if(imageFile){
        messageData.image ={
            url: imageFile.path,      // cloudinary image url
            publicId: imageFile.filename, // cloudinary public id
        };
        messageData.messageType = "image";
        messageData.text = text||""; // optional text with image
    }else{
        // if text message
        messageData.text = text;
        messageData.messageType = "text";
    }

    // save message to DB
    const message = new Messages(messageData);
    const savedMessage = await message.save();

    // text to show in chat list latest message
    const latestMessageText = imageFile? "📷 Image": text;

    // update chat latest message
    await Chat.findByIdAndUpdate(chatId,{
        latestMessage:{
            text: latestMessageText,
            sender: senderId,
        },
        updatedAt: new Date(),
    },
    {
        new:true,
    });

    // TODO: emit socket event here for real-time message

    // send response
    res.status(201).json({
        message:savedMessage,
        sender: senderId,
    });

});


export const getMessagesByChat = TryCatch(async(req:AuthenticatedRequest,res)=>{
    const userId = req.user?._id;          // Logged-in user id
    const {chatId} = req.params;           // Chat id from URL params

    // Check if user logged in
    if (!userId) {
        res.status(401).json({
            message: "Unauthorised",
        });
        return;
    }

    // Check if chatId provided
    if (!chatId) {
        res.status(400).json({
            message: "ChatId required",
        });
        return;
    }

    const chat = await Chat.findById(chatId);  // Find chat by id

    // Chat not found
    if (!chat) {
        res.status(404).json({
            message: "Chat not found",
        });
        return;
    }

    // Check if logged-in user is part of this chat
    const isUserInChat = chat.users.some(
        (id)=>id.toString()=== userId.toString()
    );  //DIFF

    if(!isUserInChat){
        res.status(403).json({
            message: "You are not participant of this Chat",
        });
        return;
    }

    // Find unread messages sent by other user
    const messagesToMarkSeen = await Messages.find({
        chatId: chatId,
        sender: {$ne: userId.toString()},
        seen: false,
    });

    // Mark those messages as seen
    await Messages.updateMany({
        chatId: chatId,
        sender: {$ne: userId.toString()},
        seen: false,
    },{
        seen:true,
        seenAt: new Date(),
    });

    // Get all messages of this chat sorted by time
    const messages = await Messages.find({chatId}).sort({createdAt: 1});

    // Get the other participant id (not the logged-in user)
    const otherUserId = chat.users.find(
        (id)=>id.toString()!== userId.toString()
    );

    try {
        // Call user service to get other user's details
        const { data } = await axios.get(
            `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
        );

        if(!otherUserId){
            res.status(400).json({
                message: "No other user",
            });
            return;
        }

        // TODO: socket emit for seen messages

        // Send messages + other user info
        res.json({
            messages,
            user: data,
        })
    } catch (error) {
        console.log(error);

        // If user service fails, still send messages
        res.json({
            messages,
            user: {_id: otherUserId,name:"Unknown User"},
        });
    }
});