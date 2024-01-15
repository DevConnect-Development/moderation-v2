// Dependencies
import ChannelConfig from "../../util/schemas/config/channel.js";
import currentBans from "../../util/schemas/moderation/currentBans.js";

import { createUserSelect } from "../../util/services/UserService/index.js";

import { Command } from "@sapphire/framework";
import {
    PermissionFlagsBits,
    TextChannel,
    GuildMember,
    EmbedBuilder,
} from "discord.js";

// Command
export default class extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            preconditions: ["checkRanInGuild"],
        });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("unban")
                .setDescription("Remove a user's ban.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription(
                            "The user you would like to remove the ban from."
                        )
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban removal.")
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
        );
    }

    async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply();

        // Variables
        const currentGuild = interaction.guild!;

        const selectedUser = interaction.options.getUser("user");
        const selectedReason = interaction.options.getString("reason");

        // Parameter Check
        if (!selectedUser || !selectedReason) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Channels
        let modlogsChannel = await ChannelConfig.findOne({
            channel_key: "modlogs",
        });
        const fetchedModLogsChannel = currentGuild.channels.cache.find(
            (c) => c.id === modlogsChannel?.channel_id
        ) as TextChannel;

        // Channel Validity Check
        if (!modlogsChannel || !fetchedModLogsChannel) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Modlog Embed
        const userSelect = createUserSelect([
            {
                name: `${selectedUser.username} (${selectedUser.id})`,
                userid: selectedUser.id,
                description: "The Punished User",
            },
            {
                name: `${interaction.user.username} (${interaction.user.id})`,
                userid: interaction.user.id,
                description: "The Moderator",
            },
        ]);

        const modlogEmbed = new EmbedBuilder()
            .setTitle("Infraction Removal")
            .setAuthor({
                name: `${selectedUser.username} (${selectedUser.id})`,
                iconURL: `${selectedUser.displayAvatarURL()}`,
            })
            .addFields(
                {
                    name: "Type",
                    value: "`UNBAN`",
                    inline: false,
                },
                {
                    name: "Reason",
                    value: selectedReason,
                    inline: true,
                },
                {
                    name: "Moderator",
                    value: `<@${interaction.user.id}>\n(${interaction.user.id})`,
                    inline: true,
                }
            )
            .setColor("Red")
            .setTimestamp();

        // Attempt Unban
        try {
            const currentUserBan = await currentBans.findOne({
                userid: selectedUser.id,
            });

            if (!currentUserBan) {
                return await interaction.editReply(
                    "The user is currently not banned."
                );
            }

            await currentUserBan.deleteOne();

            // Send Modlog
            fetchedModLogsChannel.send({
                embeds: [modlogEmbed],
                components: [userSelect],
            });

            // Unban User
            await currentGuild.members
                .unban(selectedUser.id, selectedReason)
                .catch(async (e) => {
                    return await interaction.editReply("Failed to unban user.")
                });

            // Return Reply
            return await interaction.editReply(
                `Successfully removed the ban from ${selectedUser} ***(${selectedUser.id})***.`
            );
        } catch (e) {
            return await interaction.editReply(
                "Failed to unban the selected user."
            );
        }
    }
}
