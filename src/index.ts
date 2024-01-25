// Env
import { config } from "dotenv";
config();

// Dependencies
import { start as MongoStart } from "./util/modules/mongodb.js";
import botClient from "./class/client.js";

// Create Client
const Client = new botClient();
await Client.start();
await MongoStart();
