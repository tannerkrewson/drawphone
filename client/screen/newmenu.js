import Screen from "./screen.js";

/* global $, */

class NewMenu extends Screen {
    constructor(onBack) {
        super();

        this.id = "#newmenu";
        this.backButton = $("#newmenu-back");
        this.goButton = $("#newmenu-go");
        this.onBack = onBack;

        this.setDefaultTitles();
    }

    initialize(props) {
        super.initialize(props);

        this.backButton.click(this.onBack);
        this.goButton.click(function () {
            if (!this.isLoading) {
                this.waitingForResponse(true);
                const name = $("#newinname").val();

                this.socket.open();
                this.socket.emit("newGame", {
                    name,
                });
            }
        });
    }
}

export default NewMenu;
