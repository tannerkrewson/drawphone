import { showElement, hideAll } from "../util.js";

/* global $ */

class Screen {
    constructor() {
        this.id = "";
        this.title = "Loading Drawphone...";
        this.subtitle = "Just a moment!";

    }

    show() {
        hideAll();
        showElement(this.id);

        $("#title").text(this.title);
        $("#subtitle").text(this.subtitle);
    }

    setTitle(title) {
        this.title = title;
        $("#title").text(this.title);
    }

    setSubtitle(subtitle) {
        this.subtitle = subtitle;
        $("#subtitle").text(this.subtitle);
    }

}

export default Screen;
