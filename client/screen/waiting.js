import { promptKickPlayer, promptReplaceBot } from "../util.js";
import { HIDDEN } from "../../shared/enums.js";
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

    show() {
        this.setSubtitle($("subtitle").html());
        super.show();
    }

    updateWaitingList({ data, you }) {
        const { notFinished, disconnected } = data;

        //show/hide the host notice
        if (you.isHost) {
            $("#waiting-hostmsg").removeClass(HIDDEN);
            this.userList.update(
                notFinished,
                disconnected,
                (player) => promptKickPlayer(player, this.socket),
                (player) => promptReplaceBot(player, this.socket)
            );
        } else {
            $("#waiting-hostmsg").addClass(HIDDEN);
            this.userList.update(notFinished, disconnected);
        }
    }
}

export default Waiting;
