// Dependencies
import channelConfig from "../../util/schemas/config/channel.js";
import infractions from "../../util/schemas/moderation/infractions.js";

import moment from "moment";

import { Command } from "@sapphire/framework";
import {
    PermissionFlagsBits,
    GuildMember,
    TextChannel,
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
                .setName("warn")
                .setDescription("Warn a user.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you would like to warn.")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the warning.")
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        );
    }

    async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Variables
        const currentGuild = interaction.guild!;
        const timestamp = moment().unix();

        const selectedUser = interaction.options.getUser("user");
        const selectedReason = interaction.options.getString("reason");
        const selectedProof = interaction.options.getAttachment("proof");

        // Parameter Check
        if (!selectedUser || !selectedReason) {
            return await interaction.reply({
                ephemeral: true,
                content: "Interaction has failed.",
            });
        }

        //More Variables
        let selectedMember = currentGuild.members.cache.get(
            selectedUser.id
        ) as GuildMember;

        // Permissions Check
        if (
            selectedMember?.permissions.has(PermissionFlagsBits.ManageMessages)
        ) {
            return await interaction.reply({
                ephemeral: true,
                content: "You cannot warn other staff members.",
            });
        }

        // Moderation Logs
        const modlogsChannel = await channelConfig.findOne({
            channel_key: "modlogs",
        });
        const fetchedModLogsChannel = currentGuild.channels.cache.find(
            (c) => c.id === modlogsChannel?.channel_id
        ) as TextChannel;

        // Channel Validity Check
        if (!modlogsChannel || !fetchedModLogsChannel) {
            return await interaction.reply({
                ephemeral: true,
                content: "Interaction has failed.",
            });
        }

        // Warning Embed
        const warningEmbed = new EmbedBuilder()
            .setTitle("You have received a warning.")
            .setDescription(
                [
                    `You have received a warning in DevConnect for the following reason:`,
                    `\`\`\``,
                    `${selectedReason}`,
                    `\`\`\``,
                ].join("\n")
            )
            .setColor("Red");

        // Modlog Embed
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
                    value: "`WARN`",
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

        // Attempt Warning
        try {
            const newWarning = await infractions.create({
                type: "Warning",

                user: selectedUser.id,
                moderator: interaction.user.id,

                reason: selectedReason,

                punishment_start: `${timestamp}`,
                punishment_end: null,
            });

            modlogEmbed.setFooter({
                text: `ID: ${newWarning.id}`,
            });
            fetchedModLogsChannel.send({
                embeds: [modlogEmbed],
            });

            // Send Warn Embed
            selectedUser
                .send({
                    embeds: [warningEmbed],
                })
                .catch((e) => {
                    console.log(
                        "Failed to DM Warning Embed. Are their DMs off?"
                    );
                });

            // Return Reply
            return await interaction.reply(
                `Successfully warned ${selectedUser} ***(${selectedUser.id})***.\nInfraction ID: \`${newWarning.id}\``
            );
        } catch (e) {
            return await interaction.reply({
                ephemeral: true,
                content: `Failed to warn user.`,
            });
        }
    }
}
