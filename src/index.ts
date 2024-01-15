// Dependencies
import { start } from "./util/modules/mongodb.js"
import botClient from "./class/client.js"

// Env
import { config } from "dotenv";
config();

// Create Client
const Client = new botClient
start()
Client.start()