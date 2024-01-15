// Dependencies
import mongoose from "mongoose";
import moment from "moment";

import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

// Command
export default class extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("ping")
                .setDescription("See DC Moderation's bot statistics.")
        );
    }

    async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Fetching Message
        const originalMessage = await interaction.deferReply({
            ephemeral: true,
            fetchReply: true,
        });

        // Variables
        const fu = moment.duration(interaction.client.uptime, "milliseconds");
        const formattedUptime = `${fu.days()}d ${fu.hours()}h ${fu.minutes()}m ${fu.seconds()}s`;

        // Database States
        const DB_States = [
            "Database not Connected.",
            "Database Connected.",
            "Connecting to Database.",
            "Disconnecting from Database.",
        ];

        // Embed
        const pingEmbed = new EmbedBuilder()
            .setTitle("Moderation Ping Test")
            .setColor("#ff304f")
            .addFields(
                {
                    name: "⏱️ Uptime",
                    value: `${formattedUptime}`,
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
            .setFooter({
                text: "DC Moderation",
            })
            .setTimestamp();

        return await interaction.editReply({
            embeds: [pingEmbed],
        });
    }
}

