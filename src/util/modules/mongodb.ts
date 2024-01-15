// Dependencies
import mongoose from "mongoose";

// Env
import { config } from "dotenv";
config();

// Variables
const dbString = process.env.MONGO_URL
let Client: any

export async function start() {
    try {
        Client = await mongoose.connect(`${dbString}`)
    } catch (e) {
        return console.error("Failed to connect to MongoDB.")
    }

    return console.log("Successfully connected to MongoDB.")
}

export async function close() {
    try {
        await Client.close()
    } catch (e) {
        return console.error("Failed to close MongoDB connection.")
    }

    return console.log("Successfully closed MongoDB connection.")
}

export default Client;
