// Dependencies
import globalConfig from "../../config.js";
import ChannelConfig from "../../util/schemas/config/channel.js";

import { Command } from "@sapphire/framework";
import { PermissionFlagsBits, ChannelType } from "discord.js";

// Command
export default class extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            preconditions: ["checkRanInGuild"],
        });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("sc")
                    .setDescription("Set the channel for a specific key.")
                    .setDefaultMemberPermissions(
                        PermissionFlagsBits.Administrator
                    )
                    .addStringOption((option) =>
                        option
                            .setName("key")
                            .setDescription(
                                "The key in which you would like to change the value of."
                            )
                            .addChoices(
                                {
                                    name: "Moderation Logs",
                                    value: "modlogs",
                                },
                                {
                                    name: "Bot Updates",
                                    value: "bot_updates",
                                },
                                {
                                    name: "Bot Releases",
                                    value: "bot_releases",
                                }
                            )
                            .setRequired(true)
                    )
                    .addChannelOption((option) =>
                        option
                            .setName("channel")
                            .setDescription(
                                "The channel that you would like to set for this key."
                            )
                            .addChannelTypes(
                                ChannelType.GuildText,
                                ChannelType.GuildForum
                            )
                            .setRequired(true)
                    );
            },
            {
                guildIds: globalConfig.allowedGuilds,
            }
        );
    }

    async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Variables
        const editKey = interaction.options.getString("key");
        const editChannel = interaction.options.getChannel("channel");

        // Variables Check
        if (!editKey || !editChannel) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Configuration Check
        let selectedConfiguration = await ChannelConfig.findOne({
            channel_key: editKey,
        });

        // If Non-Existent, Create New Entry
        if (!selectedConfiguration) {
            selectedConfiguration = await ChannelConfig.create({
                channel_key: editKey,
            });
        }

        // Update Value in DB
        await selectedConfiguration.updateOne({
            channel_id: editChannel.id,
        });

        // Return Reply
        return await interaction.editReply(
            `Successfully set the key \`${editKey}\` to ${editChannel}.`
        );
    }
}
