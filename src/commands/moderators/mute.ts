// Dependencies
import ChannelConfig from "../../util/schemas/config/channel.js";
import infractions from "../../util/schemas/moderation/infractions.js";

import timestring from "timestring";
import moment from "moment";
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
                .setName("mute")
                .setDescription("Mute a user.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you would like to mute.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("time")
                        .setDescription("The time for the mute.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the mute.")
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
        const timestamp = moment().unix();

        const selectedUser = interaction.options.getUser("user");
        const selectedTime = interaction.options.getString("time");
        const selectedReason = interaction.options.getString("reason");

        // Parameter Check
        if (!selectedUser || !selectedTime || !selectedReason) {
            return await interaction.editReply("Interaction has failed.");
        }

        // More Variables
        const currentMember = interaction.member! as GuildMember;
        const currentGuild = interaction.guild!;

        let selectedMember = currentGuild.members.cache.get(
            selectedUser.id
        ) as GuildMember;

        let muteTimeMilliseconds: any;
        let muteTimestamp: any;

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
        if (!selectedMember) {
            return await interaction.editReply(
                "The user is not a member in the server."
            );
        }

        // Permission Check
        if (
            selectedMember.permissions.has(PermissionFlagsBits.ManageMessages)
        ) {
            return await interaction.editReply({
                content: `You cannot mute other staff members.`,
            });
        }

        // Validate Selected Time
        try {
            muteTimeMilliseconds = timestring(selectedTime) * 1000;
            muteTimestamp = timestamp + timestring(selectedTime);
        } catch (e) {
            return await interaction.editReply(
                "Failed to convert time. Please ensure you wrote it properly."
            );
        }

        // Mute Embed
        const muteEmbed = new EmbedBuilder()
            .setTitle("You have received a mute.")
            .setDescription(
                [
                    `You have received a mute for the following reason:`,
                    `\`\`\``,
                    `${selectedReason}`,
                    `\`\`\``,
                    ``,
                    `It will expire on <t:${muteTimestamp}:f>.`,
                ].join("\n")
            )
            .setColor("Red");

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
            .setTitle("New Infraction")
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
                    value: "`MUTE`",
                    inline: true,
                },
                {
                    name: "Expires",
                    value: `<t:${muteTimestamp}:f>`,
                    inline: true,
                },
                {
                    name: " ",
                    value: " ",
                    inline: true,
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
            if (selectedMember.isCommunicationDisabled()) {
                return await interaction.editReply(
                    "This user is already muted."
                );
            }

            // Create Infraction
            const newMute = await infractions.create({
                type: "Mute",

                user: selectedUser.id,
                moderator: interaction.user.id,

                reason: selectedReason,

                punishment_start: `${timestamp}`,
                punishment_end: `${muteTimestamp}`,
            });

            // Set Modlog Embed Footer
            modlogEmbed.setFooter({
                text: `ID: ${newMute.id}`,
            });

            // Send Modlog
            fetchedModLogsChannel.send({
                embeds: [modlogEmbed],
                components: [userSelect],
            });

            // Send User Message
            selectedUser
                .send({
                    embeds: [muteEmbed],
                })
                .catch((e) => {
                    console.log("Failed to DM Mute Embed. Are their DMs off?");
                });

            // Timeout User
            await selectedMember
                .timeout(muteTimeMilliseconds, selectedReason)
                .catch(async (e) => {
                    await newMute.deleteOne();
                    return await interaction.editReply(
                        "Failed to timeout user."
                    );
                });

            // Return Reply
            return await interaction.editReply(
                `Successfully muted ${selectedUser} ***(${selectedUser.id})***.\nInfraction ID: \`${newMute.id}\``
            );
        } catch (e) {
            return await interaction.editReply(
                "Failed to mute the user. Please ensure the mute doesn't exceed 28 days."
            );
        }
    }
}
