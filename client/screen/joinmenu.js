import Screen from "./screen.js";

/* global $ */

class JoinMenu extends Screen {
    constructor(onBack) {
        super();

        this.id = "#joinmenu";
        this.backButton = $("#joinmenu-back");
        this.goButton = $("#joinmenu-go");
        this.codeInput = $("#joinincode");
        this.onBack = onBack;

        this.setDefaultTitles();
    }

    initialize(props) {
        super.initialize(props);

        this.backButton.click(this.onBack);
        this.goButton.click(function () {
            if (!this.isLoading) {
                this.waitingForResponse(true);
                const code = $("#joinincode").val();
                const name = $("#joininname").val();

                this.socket.open();
                this.socket.emit("joinGame", {
                    code,
                    name,
                });
            }
        });

        this.codeInput.on("input", () => {
            this.codeInput.val(
                this.codeInput
                    .val()
                    .substring(0, 4)
                    .toLowerCase()
                    .replace(/[^a-z]/g, "")
            );
            if (this.codeInput.val()) {
                this.codeInput.addClass("gamecode-entry");
            } else {
                this.codeInput.removeClass("gamecode-entry");
            }
        });

        this.setDefaultTitles();
    }
}

export default JoinMenu;
