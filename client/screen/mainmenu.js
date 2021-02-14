import Screen from "./screen.js";

/* global $ */

class MainMenu extends Screen {
    constructor(onJoin, onNew) {
        super();

        this.id = "#mainmenu";
        this.joinButton = $("#joinbtn");
        this.newButton = $("#newbtn");
        this.archiveButton = $("#archivebtn");
        this.howButton = $("#howbtn");
        this.onJoin = onJoin;
        this.onNew = onNew;

        this.setDefaultTitles();
    }

    initialize(props) {
        super.initialize(props);

        this.joinButton.click(this.onJoin);
        this.newButton.click(this.onNew);
        this.archiveButton.click(() => {
            window.location.href = "/archive";
        });
        this.howButton.click(() => {
            window.location.href = "/how-to-play";
        });
    }
}

export default MainMenu;
