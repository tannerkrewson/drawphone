import { showElement, hideAll } from "../util.js";

/* global $ */

class Screen {
    constructor() {
        this.socket;

        this.id = "";
        this.title = "Loading Drawphone...";
        this.subtitle = "Just a moment!";
        this.isLoading = true;

        this.defaultTitle =
            '<div class="animated-title"><span class="drawphone-d">D</span><span class="drawphone-r">r</span><span class="drawphone-a">a</span><span class="drawphone-w">w</span><span class="drawphone-p">p</span><span class="drawphone-h">h</span><span class="drawphone-o">o</span><span class="drawphone-n">n</span><span class="drawphone-e">e</span></div>';
        this.defaultSubtitle = "Telephone with pictures";
    }

    initialize({ socket, rocketcrabMode }) {
        this.socket = socket;
        this.rocketcrabMode = rocketcrabMode;
    }

    show() {
        hideAll();
        showElement(this.id);

        $("#title").html(this.title);
        $("#subtitle").text(this.subtitle);
    }

    setTitle(title) {
        this.title = title;
        $("#title").html(this.title);
    }

    setSubtitle(subtitle) {
        this.subtitle = subtitle;
        $("#subtitle").html(this.subtitle);
    }

    showTitles() {
        $("#title").html(this.title);
        $("#subtitle").html(this.subtitle);
    }

    setDefaultTitles() {
        this.setTitle(this.defaultTitle);
        this.setSubtitle(this.defaultSubtitle);
    }

    waitingForResponse(isLoading) {
        this.isLoading = isLoading;
        hideAll();
        if (isLoading) {
            showElement("#loading");
        } else {
            showElement(this.id);
        }
    }
}

Screen.gameCode = "";

Screen.getGameCodeHTML = () =>
    `<span class="gamecode">${Screen.gameCode}</span>`;

export default Screen;
