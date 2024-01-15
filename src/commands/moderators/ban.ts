// Dependencies
import ChannelConfig from "../../util/schemas/config/channel.js";
import infractions from "../../util/schemas/moderation/infractions.js";
import currentBans from "../../util/schemas/moderation/currentBans.js";

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
        super(context, { ...options });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("ban")
                .setDescription("Ban a user.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you would like to ban.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("time")
                        .setDescription("The time for the ban.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban.")
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
        const timestamp = moment().unix();

        const selectedUser = interaction.options.getUser("user");
        const selectedTime = interaction.options.getString("time");
        const selectedReason = interaction.options.getString("reason");

        // Parameter Check
        if (!selectedUser || !selectedTime || !selectedReason) {
            return await interaction.editReply("Interaction has failed.");
        }

        // More Variables
        const selectedMember = currentGuild.members.cache.get(
            selectedUser.id
        ) as GuildMember;

        let banTimeMilliseconds: any;
        let banTimestamp: any;

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
            selectedMember?.permissions.has(PermissionFlagsBits.ManageMessages)
        ) {
            return await interaction.editReply({
                content: `You cannot ban other staff members.`,
            });
        }

        // Validate Selected Time
        try {
            banTimeMilliseconds = timestring(selectedTime) * 1000;
            banTimestamp = timestamp + timestring(selectedTime);
        } catch (e) {
            return await interaction.editReply(
                "Failed to convert time. Please ensure you wrote it properly."
            );
        }

        // Ban Embed
        const banEmbed = new EmbedBuilder()
            .setTitle("You have been banned from DevConnect.")
            .setDescription(
                [
                    `You have received a ban for the following reason:`,
                    `\`\`\``,
                    `${selectedReason}`,
                    `\`\`\``,
                    ``,
                    `It will expire on <t:${banTimestamp}:f>.`,
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
                    selectedMember?.displayAvatarURL() ||
                    selectedUser.displayAvatarURL()
                }`,
            })
            .addFields(
                {
                    name: "Type",
                    value: "`BAN`",
                    inline: true,
                },
                {
                    name: "Expires",
                    value: `<t:${banTimestamp}:f>`,
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

        // Attempt Ban
        try {
            // Create Infraction
            const newBan = await infractions.create({
                type: "Ban",

                user: selectedUser.id,
                moderator: interaction.user.id,

                reason: selectedReason,

                punishment_start: `${timestamp}`,
                punishment_end: `${banTimestamp}`,
            });
            const currentBan = await currentBans.create({
                guildid: currentGuild.id,
                userid: selectedUser.id,

                expires: banTimestamp,
                has_failed: false,
            });

            // Set Modlog Embed Footer
            modlogEmbed.setFooter({
                text: `ID: ${newBan.id}`,
            });

            // Send Modlog
            fetchedModLogsChannel.send({
                embeds: [modlogEmbed],
                components: [userSelect],
            });

            // Send User Message
            await selectedUser
                .send({
                    embeds: [banEmbed],
                })
                .catch((e) => {
                    console.log("Failed to DM Ban Embed. Are their DMs off?");
                });

            // Ban User
            await currentGuild.members
                .ban(selectedUser, {
                    reason: selectedReason,
                })
                .catch(async (e) => {
                    await newBan.deleteOne();
                    await currentBan.deleteOne();
                    return await interaction.editReply("Failed to ban user.");
                });

            // Return Reply
            return await interaction.editReply(
                `Successfully banned ${selectedUser} ***(${selectedUser.id})***.\nInfraction ID: \`${newBan.id}\``
            );
        } catch (e) {
            return await interaction.editReply(
                "Failed to ban the selected user."
            );
        }
    }
}
