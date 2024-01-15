// Dependencies
import { Precondition } from "@sapphire/framework";
import { CommandInteraction } from "discord.js";

export class checkRanInGuild extends Precondition {
    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkRanInGuild(interaction);
    }

    private async checkRanInGuild(interaction: CommandInteraction) {
        let currentString: string;

        // Guild Check
        if (!interaction.inCachedGuild()) {
            currentString = "This command must be ran in the server.";
            await interaction.reply({
                ephemeral: true,
                content: currentString,
            });
            return this.error({
                message: currentString,
            });
        }

        // Return Command
        return this.ok();
    }
}
