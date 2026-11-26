import Screen from "./screen.js";
import UserList from "../userlist.js";

/* global $ */

class Waiting extends Screen {
    constructor() {
        super();

        this.id = "#waiting";
        this.setTitle("Waiting for other players...");
        this.userList = new UserList($("#waiting-players"));
    }

    updateWaitingList({ players, leaderId, onSkip, nextRound, count, finalCount }) {
        this.setSubtitle(`${count}/${finalCount}`);
        $("#waiting-next-round").toggleClass("d-none", !nextRound);
        this.userList.update(players, leaderId, onSkip);
    }
}

export default Waiting;
