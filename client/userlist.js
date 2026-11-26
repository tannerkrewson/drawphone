/* global $ */

class UserList {
    constructor(container) {
        this.container = container;
    }

    update(players, onSkip) {
        this.container.empty();
        for (const player of players) {
            const item = $("<li>").addClass("user-container");
            const box = $("<div>").addClass("user").text(player.name);
            if (player.vacant) {
                box.addClass("disconnected");
                if (onSkip) {
                    $("<button type='button'>")
                        .addClass("btn btn-default ml-2")
                        .text("Skip")
                        .on("click", () => onSkip(player.seat))
                        .appendTo(box);
                }
            }
            item.append(box).appendTo(this.container);
        }
    }
}

export default UserList;
