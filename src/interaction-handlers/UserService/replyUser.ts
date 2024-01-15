// Dependencies
import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import { StringSelectMenuInteraction } from "discord.js";

export default class extends InteractionHandler {
    constructor(
        ctx: InteractionHandler.LoaderContext,
        options: InteractionHandler.Options
    ) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu,
        });
    }

    parse(interaction: StringSelectMenuInteraction) {
        const [category, action] = interaction.customId.split(".");

        if (category !== "userservice" && action !== "replyuser") {
            return this.none();
        }

        return this.some();
    }

    async run(interaction: StringSelectMenuInteraction) {
        // Defer Reply
        const deferredReply = await interaction.deferReply({
            ephemeral: true,
        });

        // Variables
        const chosenUser = interaction.values[0];

        // Reset Components
        interaction.message.edit({
            components: interaction.message.components,
        });

        // UserID Exist Check
        if (!chosenUser) {
            return await interaction.editReply(
                "Couldn't find requested User ID."
            );
        }
        // Return with UserID
        return await interaction.editReply(`<@${chosenUser}>`);
    }
}
