import Screen from "./screen.js";
import UserList from "../userlist.js";
import WordPacks from "../../server/app/words.js";

/* global $, ga */

class Lobby extends Screen {
    constructor({ emit }) {
        super();
        this.id = "#lobby";
        this.setTitle("Drawphone");
        this.userList = new UserList($("#lobby-players"));
        this.wordPackDropdown = $("#lobby-settings-wordpack");
        this.wordFirstCheckbox = $("#lobby-settings-wordfirst");
        this.matureCheckbox = $("#lobby-settings-mature");
        this.startButton = $("#lobby-start");

        const change = (key, value) => emit("settings", { key, value });
        this.wordPackDropdown.on("change", () => {
            const selected = this.wordPackDropdown.val();
            change("pack", selected);
            ga("send", "event", "Lobby", "word pack change", selected);
        });
        this.wordFirstCheckbox.on("change", () =>
            change("wordFirst", this.wordFirstCheckbox.is(":checked")),
        );
        this.matureCheckbox.on("change", () =>
            change("mature", this.matureCheckbox.is(":checked")),
        );
        $("#timelimit-minus").on("click", () => change("time", -1));
        $("#timelimit-plus").on("click", () => change("time", 1));
        $("#turnlimit-minus").on("click", () => change("turns", -1));
        $("#turnlimit-plus").on("click", () => change("turns", 1));
        this.startButton.on("click", async () => {
            const { time, turns, wordFirst, pack } = this.settings;
            const playerCount = this.playerCount;
            if (!(await emit("start"))) return;
            ga("send", "event", "Game", "start");
            ga("send", "event", "Game", "time limit", time);
            ga("send", "event", "Game", "turn limit", turns);
            ga("send", "event", "Game", "word pack", wordFirst ? false : pack);
            ga("send", "event", "Game", "number of players", playerCount);
            ga("send", "event", "Game", "number of total players", playerCount);
        });
    }

    updatePlayerList({ players, settings, leader, previous, started, saving }) {
        this.userList.update(players);
        this.settings = settings;
        this.playerCount = players.length;
        const twoWordFirst = players.length === 2 && settings?.wordFirst;
        this.setSubtitle(
            started
                ? leader
                    ? twoWordFirst
                        ? "Players write first word needs three players."
                        : "Telephone with pictures"
                    : "Waiting for the party leader..."
                : "Waiting for the party...",
        );
        $("#lobby-settings").toggleClass("d-none", !leader || !started);
        $("#lobby-prevres").toggleClass("d-none", !previous);
        this.startButton
            .toggleClass("d-none", !leader || !started)
            .text(previous ? "Play Again" : "Start Game")
            .prop("disabled", !players.length || twoWordFirst || saving);

        if (!settings) return;
        this.wordPackDropdown.empty();
        for (const name of WordPacks.getAllPackNames(!settings.mature)) {
            $("<option>").text(name).appendTo(this.wordPackDropdown);
        }
        this.wordPackDropdown.val(settings.pack).prop("disabled", settings.wordFirst);
        this.wordFirstCheckbox.prop("checked", settings.wordFirst);
        this.matureCheckbox.prop("checked", settings.mature);
        $("#lobby-settings-turnlimit").text(players.length === 1 ? "Demo" : settings.turns);
        $("#turnlimit-minus, #turnlimit-plus").prop("disabled", players.length <= 3);
        $("#lobby-settings-timelimit").text(
            settings.time === 0 ? "No time limit" : `${settings.time} seconds`,
        );
    }
}

export default Lobby;
