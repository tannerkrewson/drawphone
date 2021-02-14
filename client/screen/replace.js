import Screen from "./screen.js";

/* global $, ga */

class Replace extends Screen {
    constructor() {
        super();
        this.id = "#replace";
        this.setTitle("Choose a player to replace");
    }

    initialize(props) {
        // when leave button is clicked, refresh the page
        $("#replace-leave").on("click", () => location.reload());

        super.initialize(props);
    }

    show({ data }) {
        const { gameCode, players } = data;

        const choices = $("#replace-choices");
        choices.empty();

        if (players.length) {
            players.forEach((player) => {
                const button = $(
                    `<button type="button">${player.name}</button>`
                );

                button.addClass("btn btn-default btn-lg");
                button.on("click", () => this.sendChoice(player));

                choices.append(button);
                choices.append("<br>");
            });
        } else {
            choices.append(
                "<p>This game is currently full. If you stay on this page, it " +
                    "will automatically update to let you know if someone has " +
                    "left!</p>"
            );
        }

        Screen.gameCode = gameCode;
        this.setSubtitle("Ready to join game...");
        super.show();
    }

    sendChoice(playerToReplace) {
        this.socket.emit("tryReplacePlayer", {
            playerToReplace,
        });
        ga("send", "event", "Player replacement", "replace", this.timeLimit);
    }
}

export default Replace;
