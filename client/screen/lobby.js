import Screen from "./screen.js";
import UserList from "../userlist.js";
import { getNewTurnLimit } from "../../shared/util.js";
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
        const demo = $("#demo-confirm").get(0);
        const start = async () => {
            if (this.startButton.prop("disabled")) return;
            const { time, turns, wordFirst, pack } = this.settings;
            const playerCount = this.playerCount;
            if (!(await emit("start"))) return;
            ga("send", "event", "Game", "start");
            ga("send", "event", "Game", "time limit", time);
            ga("send", "event", "Game", "turn limit", turns);
            ga("send", "event", "Game", "word pack", wordFirst ? false : pack);
            ga("send", "event", "Game", "number of players", playerCount);
            ga("send", "event", "Game", "number of total players", playerCount);
        };
        this.startButton.on("click", () => {
            if (this.playerCount !== 1) return start();
            demo.showModal();
        });
        $("#demo-confirm button[value='cancel']").on("click", () => demo.close());
        $("#demo-confirm button[value='start']").on("click", () => {
            demo.close();
            start();
        });
    }

    updatePlayerList({ players, settings, leader, leaderId, previous, started, saving }) {
        this.userList.update(players, leaderId);
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
        $("#lobby-settings").toggleClass("d-none", !started || !settings);
        $(".lobby-setting").prop("disabled", !leader);
        $("#lobby-prevres").toggleClass("d-none", !previous);
        this.startButton
            .toggleClass("d-none", !leader || !started)
            .prop(
                "disabled",
                !leader ||
                    !players.length ||
                    twoWordFirst ||
                    saving ||
                    (!settings?.wordFirst && !settings?.pack),
            );

        if (!settings) return;
        this.wordPackDropdown
            .empty()
            .append($("<option disabled value=''>").text("Select a word pack..."));
        for (const name of WordPacks.getAllPackNames(!settings.mature)) {
            $("<option>").text(name).appendTo(this.wordPackDropdown);
        }
        this.wordPackDropdown
            .val(settings.pack ?? "")
            .prop("disabled", !leader || settings.wordFirst);
        this.wordFirstCheckbox.prop("checked", settings.wordFirst);
        this.matureCheckbox.prop("checked", settings.mature);
        const validTurns = players.length > 1 && settings.turns <= players.length;
        const { isMax } = getNewTurnLimit({
            modifier: 0,
            prevTurnLimit: settings.turns,
            numPlayers: players.length,
            isWordFirst: settings.wordFirst,
        });
        $("#lobby-settings-turnlimit").text(
            validTurns ? `${settings.turns} turns${isMax ? " (max)" : ""}` : "N/A",
        );
        $("#lobby-settings-gametime").text(
            validTurns ? `(round will take about ${settings.turns} minutes)` : "",
        );
        $("#turnlimit-minus, #turnlimit-plus").prop("disabled", !leader || players.length <= 3);
        $("#lobby-settings-timelimit").text(
            settings.time === 0 ? "No time limit" : `${settings.time} seconds`,
        );
    }
}

export default Lobby;
