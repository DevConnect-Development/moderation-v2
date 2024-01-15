import { Schema, model } from "mongoose"

let currentBansSchema = new Schema({
    guildid: String,
    userid: String,

    expires: String,
    has_failed: Boolean,
})

export default model("Current Bans", currentBansSchema, "Current Bans")