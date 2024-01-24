// Env
import { config } from "dotenv";
config();

// Dependencies
import channelConfig from "../../util/schemas/config/channel.js";
import { startUpdate } from "../../util/services/UpdateService/index.js";

import { Listener } from "@sapphire/framework";
import {
    Message,
    TextChannel,
    ChannelType,
    Embed,
    EmbedBuilder,
} from "discord.js";

// Main Function
export default class extends Listener {
    constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: "messageCreate",
        });
    }

    async run(message: Message) {
        // Variables
        const currentEmbed = message.embeds[0]! as Embed;
        let currentVersion: String;

        let successString: String;

        // Bot Updates Channel
        const botReleases = await channelConfig.findOne({
            channel_key: "bot_releases",
        });
        const botUpdates = await channelConfig.findOne({
            channel_key: "bot_updates",
        });
        const botUpdatesChannel = message.guild?.channels.cache.find(
            (c) => c.id === botUpdates?.channel_id
        ) as TextChannel;
        if (!botUpdates || !botUpdatesChannel) {
            return;
        }

        // Pre-Checks
        if (message.channel.type !== ChannelType.GuildText) {
            return;
        }
        if (
            message.author.displayName !== "GitHub" ||
            message.channel.id !== botReleases?.channel_id
        ) {
            return;
        }
        if (
            !currentEmbed.title ||
            !currentEmbed.title.includes("New release") ||
            !currentEmbed.title.includes(`${process.env.GIT_REPO}`)
        ) {
            return;
        }

        currentVersion = `${currentEmbed.title.split("published: ")[1]}`;

        // Attempt Git Update
        const attemptedUpdate = await startUpdate();

        if (!attemptedUpdate) {
            successString = "Failed to automatically update bot.";
        } else {
            successString =
                "The bot has updated itself. It will restart to apply changes.";
        }

        // Release Embed
        const releaseEmbed = new EmbedBuilder()
            .setTitle("New Bot Release Detected")
            .setURL(message.url)
            .setColor("#FD324E")
            .setDescription(
                [
                    `**Version**: \`${currentVersion}\``,
                    `**Release Link**: [GitHub](${currentEmbed.url})`,
                    ``,
                    `${successString}`,
                ].join("\n")
            );

        // Author/Footer Check
        if (
            currentEmbed.author &&
            currentEmbed.author.name &&
            currentEmbed.author.iconURL
        ) {
            releaseEmbed.setFooter({
                text: `Release by: ${currentEmbed.author.name}`,
                iconURL: `${currentEmbed.author.iconURL}`,
            });
        }

        // Send Update Embed
        await botUpdatesChannel.send({
            embeds: [releaseEmbed],
        });

        // Restart Bot
        return process.exit(0);
    }
}
