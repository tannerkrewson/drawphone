import crown from "@fortawesome/fontawesome-free/svgs/solid/crown.svg?inline";

/* global $ */

class UserList {
    constructor(container) {
        this.container = container;
    }

    update(players, leaderId, onSkip) {
        this.container.empty();
        for (const player of players) {
            const item = $("<li>").addClass("user-container");
            const box = $("<div>").addClass("user").text(player.name);
            if (leaderId != null && player.id === leaderId) {
                $("<img class='host-icon mr-2' width='16' height='16' alt='Host'>")
                    .attr("src", crown)
                    .prependTo(box);
            }
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
