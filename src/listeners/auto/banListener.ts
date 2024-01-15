// Dependencies
import channelConfig from "../../util/schemas/config/channel.js";
import currentBans from "../../util/schemas/moderation/currentBans.js";

import { Cron } from "croner"
import moment from "moment";

import { Listener } from "@sapphire/framework";
import { Client, TextChannel, EmbedBuilder } from "discord.js";

export default class extends Listener {
    constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: "ready",
        });
    }

    async run(client: Client) {
        Cron("*/2 * * * * *", async () => {
            // Variables
            const currentTimestamp = moment().unix();

            // Current Bans
            const currentBansList = await currentBans.find();

            if (currentBansList.length < 1) {
                return;
            }

            currentBansList.forEach(async (b) => {
                // Variables
                const expiredNumber = Number(b.expires);

                // Exist Check
                if (
                    !expiredNumber ||
                    !b.id ||
                    !b.guildid ||
                    !b.userid ||
                    !b.expires
                ) {
                    return currentBans.findByIdAndDelete(b.id);
                }

                // Expired Check
                if (expiredNumber > currentTimestamp) {
                    return;
                }

                // Guild
                const selectedGuild = client.guilds.cache.get(b.guildid);
                if (!selectedGuild) return;

                // Variables
                const fetchedBans = await selectedGuild.bans.fetch();

                // Channels
                const modLogsChannel = await channelConfig.findOne({
                    channel_key: "modlogs",
                });
                const fetchedModLogsChannels = client.channels.cache.find(
                    (c) => c.id === modLogsChannel?.channel_id
                ) as TextChannel;

                // Failed Check
                if (b.has_failed) {
                    return;
                }

                const failedInfractionEmbed = new EmbedBuilder()
                    .setTitle("Failed Infraction Removal")
                    .addFields(
                        {
                            name: "Type",
                            value: "`UNBAN`",
                            inline: true,
                        },
                        {
                            name: "Expires",
                            value: `<t:${b.expires}:f>`,
                            inline: true,
                        },
                        {
                            name: "Reason",
                            value: `Auto Unban could not find the user in the bans database:\n<@${b.userid}> ***(${b.userid})***`
                        }
                    )
                    .setColor("Red")
                    .setTimestamp();

                try {
                    if (fetchedBans.find((u) => u.user.id === b.userid)) {
                        await currentBans.findByIdAndDelete(b.id);
                        return await selectedGuild.members.unban(b.userid);
                    } else {
                        await currentBans.findByIdAndUpdate(b.id, {
                            has_failed: true,
                        });

                        if(fetchedModLogsChannels) {
                            await fetchedModLogsChannels.send({
                                embeds: [failedInfractionEmbed]
                            })
                        }

                        return;
                    }
                } catch (e) {
                    return console.log(`FAILED TO UNBAN: ${b.userid}`);
                }
            });
        });
    }
}
