// Dependencies
import globalConfig from "../../config.js";
import infractions from "../../util/schemas/moderation/infractions.js";

import { Command } from "@sapphire/framework";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import { PermissionFlagsBits, ComponentType, ButtonStyle } from "discord.js";

// Command
export default class extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("infractions")
                    .setDescription("Check infractions.")
                    .addUserOption((option) =>
                        option
                            .setName("user")
                            .setDescription(
                                "The user to check infractions for."
                            )
                            .setRequired(false)
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

        // Server Check
        if (
            !interaction.inCachedGuild() ||
            !interaction.member.joinedTimestamp
        ) {
            return await interaction.editReply(
                "Please use this command in the server."
            );
        }

        // Variables
        let chosenUser = interaction.options.getUser("user");
        const newPagination = new PaginatedMessage();

        const actionEmojis = {
            Warning: "⚠️",
            Mute: "🔇",
            Ban: "🔨",
            Softban: "🔨",
        };

        // Permission Check
        if (!chosenUser) {
            chosenUser = interaction.user;
        } else {
            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageMessages
                )
            ) {
                return await interaction.editReply(
                    "You do not have permission to see other users' infractions."
                );
            }
        }

        // Parameter Check
        if (!chosenUser) {
            return await interaction.editReply("Interaction has failed.");
        }

        // Get Infractions
        let userInfractions = await infractions
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
        function chunkArray(array: Array<any>, chunkSize: number) {
            const results = [];
            while (array.length) {
                results.push(array.splice(0, chunkSize));
            }
            return results;
        }
        const infractionChunks = chunkArray(userInfractions, 4);

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

                return embed;
            });
        });

        // Run Pagination
        newPagination.run(interaction);
    }
}
