// Dependencies
import mongoose from "mongoose";
import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

// Command
export default class extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName("ping").setDescription("See bot statistics.")
        );
    }

    async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Fetching Message
        const originalMessage = await interaction.reply({
            ephemeral: true,
            content: "Fetching Data...",
            fetchReply: true,
        });

        const DB_States = [
            "Database not Connected.",
            "Database Connected.",
            "Connecting to Database.",
            "Disconnesting from Database.",
        ];

        mongoose.connection.readyState;

        // Embed
        const pingEmbed = new EmbedBuilder()
            .setTitle("Moderation Ping Test")
            .addFields(
                {
                    name: "⏱️ Uptime",
                    value: `${Math.round(
                        interaction.client.uptime / 60000
                    )} Minutes`,
                    inline: true,
                },
                {
                    name: "🗃️ Database Status",
                    value: `${DB_States[mongoose.connection.readyState]}`,
                    inline: true,
                },
                {
                    name: " ",
                    value: " ",
                    inline: true,
                },
                {
                    name: "📍 Roundtrip Latency",
                    value: `${
                        originalMessage.createdTimestamp -
                        interaction.createdTimestamp
                    }ms`,
                    inline: true,
                },
                {
                    name: "💖 Websocket Heartbeat",
                    value: `${interaction.client.ws.ping}ms`,
                    inline: true,
                }
            )
            .setColor("#ff304f");

        return await interaction.editReply({
            content: "",
            embeds: [pingEmbed],
        });
    }
}
