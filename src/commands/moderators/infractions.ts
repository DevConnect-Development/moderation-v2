// Dependencies
import globalConfig from "../../config.js";
import infractions from "../../util/schemas/moderation/infractions.js";

import splitArray from "../../util/modules/splitArray.js";

import { Subcommand } from "@sapphire/plugin-subcommands";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import {
    PermissionFlagsBits,
    GuildMember,
    EmbedBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} from "discord.js";

// Action Emojis
const actionEmojis = {
    Warning: "⚠️",
    Mute: "🔇",
    Ban: "🔨",
    Softban: "🔨",
};

// Command
export default class extends Subcommand {
    constructor(
        context: Subcommand.LoaderContext,
        options: Subcommand.Options
    ) {
        super(context, {
            ...options,
            subcommands: [
                {
                    name: "check",
                    chatInputRun: "checkInfractions",
                },
                {
                    name: "view",
                    chatInputRun: "viewInfraction",
                },
            ],
        });
    }

    registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("infractions")
                    .setDescription("Infractions related commands.")
                    .addSubcommand((command) =>
                        command
                            .setName("check")
                            .setDescription("Check a user's infractions.")
                            .addUserOption((option) =>
                                option
                                    .setName("user")
                                    .setDescription(
                                        "The user to check infractions for."
                                    )
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand((command) =>
                        command
                            .setName("view")
                            .setDescription("View a specific infraction.")
                            .addStringOption((option) =>
                                option
                                    .setName("id")
                                    .setDescription("The infraction ID.")
                                    .setRequired(true)
                            )
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

    public async checkInfractions(
        interaction: Subcommand.ChatInputCommandInteraction
    ) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Variables
        const chosenUser = interaction.options.getUser("user");

        // Pagination Config
        const newPagination = new PaginatedMessage();

        // Parameter Check
        if (!chosenUser) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Get Infractions
        const userInfractions = await infractions
            .find({
                user: chosenUser.id,
            })
            .sort("-punishment_start");
        const userInfractionsLength = userInfractions.length;

        // Infractions Check
        if (userInfractions.length < 1) {
            return await interaction.editReply({
                content: "User has no infractions.",
                components: [],
            });
        }

        // Chunk Array
        const infractionChunks = splitArray(userInfractions, 4);

        // Set Pagination Actions
        newPagination.setActions([
            {
                emoji: "⬅️",
                customId: "x-previous",
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                run: ({ handler }) => {
                    if (handler.index === 0) {
                        handler.index = handler.pages.length - 1;
                    } else {
                        --handler.index;
                    }
                },
            },
            {
                emoji: "➡️",
                customId: "x-next",
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                run: ({ handler }) => {
                    if (handler.index === handler.pages.length - 1) {
                        handler.index = 0;
                    } else {
                        ++handler.index;
                    }
                },
            },
        ]);

        // Loop Infractions
        infractionChunks.forEach(async (chunk) => {
            newPagination.addAsyncPageEmbed(async (embed) => {
                const embedDescription = [];

                for (const infraction of chunk) {
                    const moderatorUser = interaction.client.users.cache.find(
                        (u) => u.id === infraction.moderator
                    );

                    const infractionType = `${infraction.type}` as
                        | "Warning"
                        | "Mute"
                        | "Ban"
                        | "Softban";
                    const punishmentStart = `<t:${infraction.punishment_start}:f>`;
                    let punishmentEnd;

                    if (infraction.punishment_end !== null) {
                        punishmentEnd = `<t:${infraction.punishment_end}:f>`;
                    } else {
                        punishmentEnd = "";
                    }

                    embedDescription.push(
                        [
                            `**\`${actionEmojis[infractionType]}\` ${infractionType}** - ${punishmentStart}`,
                            `\`${infraction.id}\`\n`,
                            `Moderator: ${moderatorUser} (${infraction.moderator})`,
                            infraction.evidence
                                ? `Evidence: [Attachment](${infraction.evidence})`
                                : "",
                            punishmentEnd ? `Expires: ${punishmentEnd}` : "",
                            `Reason: **${infraction.reason}**`,
                        ]
                            .filter(Boolean)
                            .join("\n")
                    );
                }

                // Set Extra Embed Info
                embed
                    .setAuthor({
                        name: `${chosenUser!.username}'s Infractions`,
                        iconURL: `${chosenUser!.displayAvatarURL()}`,
                    })
                    .setColor("Green")
                    .setDescription(
                        embedDescription.join(
                            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        )
                    )
                    .setFooter({
                        text: `${userInfractionsLength} Total Infractions`,
                    });

                // Return Embed
                return embed;
            });
        });

        // Run Pagination
        newPagination.run(interaction);
    }

    public async viewInfraction(
        interaction: Subcommand.ChatInputCommandInteraction
    ) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Variables
        const chosenInfraction = interaction.options.getString("id");

        // Parameter Check
        if (!chosenInfraction) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Fetched Infraction
        const fetchedInfraction = await infractions
            .findById(chosenInfraction)
            .catch(async (e) => {
                return undefined;
            });
        if (!fetchedInfraction) {
            return await interaction.editReply(
                "Could not find the specified infraction."
            );
        }

        // Variables
        const selectedUser = interaction.client.users.cache.find(
            (u) => u.id === fetchedInfraction.user
        );

        const infractionType = `${fetchedInfraction.type}` as
            | "Warning"
            | "Mute"
            | "Ban"
            | "Softban";

        // Components
        const editButton = new ButtonBuilder()
            .setCustomId(`infraction.edit.${fetchedInfraction.id}`)
            .setLabel("Edit Infraction")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);
        const removeButton = new ButtonBuilder()
            .setCustomId(`infraction.remove.${fetchedInfraction.id}`)
            .setLabel("Remove Infraction")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true);

        const infractionAR =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                editButton,
                removeButton
            );

        // Infraction Embed
        const infractionEmbed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(
                [
                    `**\`${actionEmojis[infractionType]}\` ${infractionType}** - <t:${fetchedInfraction.punishment_start}:f>`,
                    `\`👤\` **Offending User** - <@${fetchedInfraction.user}>\n`,
                    `Moderator: <@${fetchedInfraction.moderator}> (${fetchedInfraction.moderator})`,
                    fetchedInfraction.evidence
                        ? `Evidence: [Attachment](${fetchedInfraction.evidence})`
                        : "",
                    fetchedInfraction.punishment_end
                        ? `Expires: <t:${fetchedInfraction.punishment_end}:f>`
                        : "",
                    `Reason: **${fetchedInfraction.reason}**`,
                ]
                    .filter(Boolean)
                    .join("\n")
            )
            .setFooter({
                text: `ID: ${fetchedInfraction.id}`,
            });

        // Return Reply
        return await interaction.editReply({
            embeds: [infractionEmbed],
            components: [infractionAR],
        });
    }
}
