// Dependencies
import globalConfig from "../../config.js";

import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";

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
                    .setName("resetcommands")
                    .setDescription("Reset all guild commands in the server.")
                    .setDefaultMemberPermissions(
                        PermissionFlagsBits.Administrator
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
