import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: String;
    email: String;
    password?: string;
    verified: boolean;
}

const schema: Schema<IUser> = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        select: false,
    },
    verified: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
}
);

export const User = mongoose.model<IUser>("User", schema)