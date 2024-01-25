// Env
import { config } from "dotenv";
config();

// Dependencies
import globalConfig from "../../config.js";

import { Subcommand } from "@sapphire/plugin-subcommands";
import { PermissionFlagsBits, REST, Routes } from "discord.js";

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
                    name: "global",
                    chatInputRun: "globalCommands",
                },
                {
                    name: "guild",
                    chatInputRun: "guildCommands",
                },
            ],
        });
    }

    registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("resetcommands")
                    .setDescription("Reset all guild commands in the server.")
                    .setDefaultMemberPermissions(
                        PermissionFlagsBits.Administrator
                    )
                    .addSubcommand((option) =>
                        option
                            .setName("global")
                            .setDescription("Remove all global commands.")
                    )
                    .addSubcommand((option) =>
                        option
                            .setName("guild")
                            .setDescription("Remove all guild commands.")
                    );
            },
            {
                guildIds: globalConfig.allowedGuilds,
            }
        );
    }

    public async globalCommands(
        interaction: Subcommand.ChatInputCommandInteraction
    ) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Variables
        const restClient = new REST().setToken(`${process.env.TOKEN}`);

        // Remove Commands
        await restClient
            .put(Routes.applicationCommands(`${process.env.CLIENT_ID}`), {
                body: [],
            })
            .catch(async (e) => {
                return await interaction.editReply(
                    "Failed to remove global commands."
                );
            });

        // Return Reply
        await interaction.editReply(
            "Successfully removed global commands. Restarting the bot now."
        );

        // Exit
        return process.exit(0)
    }

    public async guildCommands(
        interaction: Subcommand.ChatInputCommandInteraction
    ) {
        // Deferred Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Remove Commands
        await interaction.guild?.commands.set([]).catch(async (e) => {
            return await interaction.editReply(
                "Failed to remove guild commands."
            );
        });

        // Return Reply
        return await interaction.editReply(
            "Successfully removed guild commands."
        );
    }
}
