// Env
import { config } from "dotenv";
config();

// Config Export
export default {
    allowedGuilds: [`${process.env.GUILD_ID}`],
};
