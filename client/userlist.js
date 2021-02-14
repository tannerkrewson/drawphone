import { HIDDEN } from "../shared/enums.js";

/* global $ */

class UserList {
    constructor(ul) {
        this.ul = ul;
        this.numberOfPlayers = 0;
        this.realPlayers = 0;
        this.botPlayers = 0;
    }

    update(newList, disconnectedList, onKick, onBotReplace) {
        //clear all of the user boxes using jquery
        this.ul.empty();

        this.draw(newList, false, onKick);
        if (disconnectedList) {
            if (disconnectedList.length > 0) {
                $("#waiting-disconnectedmsg").removeClass(HIDDEN);
                this.draw(disconnectedList, true, onBotReplace);
            } else {
                $("#waiting-disconnectedmsg").addClass(HIDDEN);
            }
        }
    }

    draw(list, makeBoxDark, onClick) {
        this.numberOfPlayers = 0;
        this.realPlayers = 0;
        this.botPlayers = 0;

        list.forEach((player) => {
            this.numberOfPlayers++;
            player.isAi ? this.botPlayers++ : this.realPlayers++;

            const listBox = $("<span></span>");
            const listItem = $(`<li>${player.name}</li>`).appendTo(listBox);
            listItem.addClass("user");
            if (makeBoxDark) {
                listItem.addClass("disconnected");
            }
            listBox.addClass("col-xs-6");
            listBox.addClass("user-container");

            if (onClick) {
                listBox.on("click", () => onClick(player));
            }

            listBox.appendTo(this.ul);
        });
    }
}

export default UserList;
