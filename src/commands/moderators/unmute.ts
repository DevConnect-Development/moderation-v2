// Dependencies
import globalConfig from "../../config.js";
import ChannelConfig from "../../util/schemas/config/channel.js";
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
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("unmute")
                    .setDescription("Remove the mute from a user")
                    .addUserOption((option) =>
                        option
                            .setName("user")
                            .setDescription(
                                "The user you would like to unmute."
                            )
                            .setRequired(true)
                    )
                    .addStringOption((option) =>
                        option
                            .setName("reason")
                            .setDescription("The reason for the unmute.")
                            .setRequired(true)
                    )
                    .setDefaultMemberPermissions(
                        PermissionFlagsBits.ModerateMembers
                    );
            },
            {
                guildIds: globalConfig.allowedGuilds,
            }
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

        // More Variables
        let selectedMember = currentGuild.members.cache.get(
            selectedUser.id
        ) as GuildMember;

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

        // Permission Check
        if (
            selectedMember.permissions.has(PermissionFlagsBits.ManageMessages)
        ) {
            return await interaction.editReply({
                content: `You cannot manage the mute of other staff members.`,
            });
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
                iconURL: `${
                    selectedMember.displayAvatarURL() ||
                    selectedUser.displayAvatarURL()
                }`,
            })
            .addFields(
                {
                    name: "Type",
                    value: "`UNMUTE`",
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

        // Attempt Mute
        try {
            if (!selectedMember.isCommunicationDisabled()) {
                return await interaction.editReply(
                    "This user currently does not have an active mute."
                );
            }

            // Send Modlog
            fetchedModLogsChannel.send({
                embeds: [modlogEmbed],
                components: [userSelect],
            });

            // Remove Timeout
            await selectedMember.timeout(null).catch(async (e) => {
                return await interaction.editReply(
                    "Failed to remove timeout from user."
                );
            });

            // Return Reply
            return await interaction.editReply(
                `Successfully removed the mute from ${selectedUser} ***(${selectedUser.id})***.`
            );
        } catch (e) {
            return await interaction.editReply("Failed to unmute the user.");
        }
    }
}
