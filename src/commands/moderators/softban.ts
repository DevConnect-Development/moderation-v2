// Dependencies
import ChannelConfig from "../../util/schemas/config/channel.js";
import infractions from "../../util/schemas/moderation/infractions.js";

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
                .setName("softban")
                .setDescription(
                    "Softban a user, and delete all their messages."
                )
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you would like to ban.")
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
        const timestamp = moment().unix();

        const selectedUser = interaction.options.getUser("user");
        const selectedReason = interaction.options.getString("reason");

        // Parameter Check
        if (!selectedUser || !selectedReason) {
            return await interaction.editReply("Interaction has failed.");
        }

        // More Variables
        const currentGuild = interaction.guild!;

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
                content: `You cannot softban other staff members.`,
            });
        }

        // Ban Embed
        const banEmbed = new EmbedBuilder()
            .setTitle("You have received a softban from DevConnect.")
            .setDescription(
                [
                    `You have received a softban for the following reason:`,
                    `\`\`\``,
                    `${selectedReason}`,
                    `\`\`\``,
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
                    value: "`SOFTBAN`",
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

        // Attempt Ban
        try {
            // Create Infraction
            const newBan = await infractions.create({
                type: "Softban",

                user: selectedUser.id,
                moderator: interaction.user.id,

                reason: selectedReason,

                punishment_start: timestamp,
                punishment_end: null,
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
            selectedUser
                .send({
                    embeds: [banEmbed],
                })
                .catch((e) => {
                    console.log(
                        "Failed to DM Softban Embed. Are their DMs off?"
                    );
                });

            // Ban User
            try {
                await selectedMember.ban({
                    deleteMessageSeconds: 604800,
                    reason: selectedReason,
                });
                await currentGuild.members.unban(selectedUser.id);
            } catch (e) {
                await newBan.deleteOne();
                return await interaction.editReply("Failed to softban user.");
            }

            // Return Reply
            return await interaction.editReply(
                `Successfully softbanned ${selectedUser} ***(${selectedUser.id})***.\nInfraction ID: \`${newBan.id}\``
            );
        } catch (e) {
            return await interaction.editReply(
                "Failed to softban the selected user."
            );
        }
    }
}
