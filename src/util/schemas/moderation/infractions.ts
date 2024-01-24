import { Schema, model } from "mongoose"

let infractionsSchema = new Schema({
    type: String,

    user: String,
    moderator: String,

    reason: String,
    evidence: String,
    
    punishment_start: String,
    punishment_end: String,
})

export default model("Infractions", infractionsSchema, "Infractions")