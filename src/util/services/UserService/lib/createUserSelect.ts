// Dependencies
import { StringSelectMenuBuilder, ActionRowBuilder } from "discord.js";

// Interface
interface userList {
    name: String;
    userid: String;

    description: String;
}
type userListArray = Array<userList>;

export default function (
    currentUserList: userListArray,
    selectPlaceholder?: String
) {
    const mappedArray = currentUserList.map((u) => ({
        label: u.name,
        value: u.userid,
        description: u.description,
    }));

    const selectMenu =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("userservice.replyuser")
                .setPlaceholder(
                    `${selectPlaceholder || "Reply with User Mention"}`
                )
                .setOptions(mappedArray as any)
        );

    return selectMenu;
}
