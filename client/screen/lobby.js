import swal from "bootstrap-sweetalert";

import { HIDDEN } from "../../shared/enums.js";
import { getNewTurnLimit } from "../../shared/util.js";
import Screen from "./screen.js";
import UserList from "../userlist.js";

/* global $, ga */

class Lobby extends Screen {
    constructor() {
        super();

        this.id = "#lobby";
        this.leaveButton = $("#lobby-leave");
        this.startButton = $("#lobby-start");
        this.gameSettings = $("#lobby-settings");
        this.wordFirstCheckbox = $("#lobby-settings-wordfirst");
        this.showNeighborsCheckbox = $("#lobby-settings-showNeighbors");
        this.timeLimitDisplay = $("#lobby-settings-timelimit");
        this.timeLimitMinus = $("#timelimit-minus");
        this.timeLimitPlus = $("#timelimit-plus");
        this.turnLimitDisplay = $("#lobby-settings-turnlimit");
        this.turnLimitMinus = $("#turnlimit-minus");
        this.turnLimitPlus = $("#turnlimit-plus");
        this.gameTimeDisplay = $("#lobby-settings-gametime");
        this.wordPackDropdown = $("#lobby-settings-wordpack");
        this.gameSettingsBots = $("#lobby-settings-bots");
        this.addBotButton = $("#lobby-settings-addbot");
        this.removeBotButton = $("#lobby-settings-removebot");
        this.viewPreviousResultsButton = $("#lobby-prevres");
        this.gameCode = "";

        //these is what the host selects from the Options
        this.selectedTimeLimit = 0;
        this.selectedTurnLimit;
        this.wordPack = false;
        this.showNeighbors = false;

        this.userList = new UserList($("#lobby-players"));
    }

    initialize(props) {
        super.initialize(props);

        this.leaveButton.click(() => {
            ga("send", "event", "Lobby", "leave");
            //refresh the page
            location.reload();
        });

        this.viewPreviousResultsButton.click(() => {
            this.socket.emit("viewPreviousResults", {});

            ga("send", "event", "Lobby", "view previous results");
        });

        this.wordFirstCheckbox.prop("checked", false);
        this.showNeighborsCheckbox.prop("checked", false);
        this.timeLimitDisplay.text("No time limit");
        this.turnLimitDisplay.text("N/A");
        this.gameTimeDisplay.text("");
        this.wordPackDropdown.prop("selectedIndex", 0);
        this.wordPackDropdown.prop("disabled", false);

        ga("send", "event", "Lobby", "created");
    }

    show(data) {
        this.socket.off("disconnect");
        this.socket.on("disconnect", (reason) => {
            // if the disconnection was initiated by the server
            // it was likely a kick from the host
            if (reason === "io server disconnect") {
                onActualDisconnect();
            }
        });

        this.socket.off("reconnect_failed");
        this.socket.on("reconnect_failed", () => {
            onActualDisconnect();
        });

        const onActualDisconnect = () => {
            swal("Connection lost!", "Reloading...", "error");
            ga("send", "exception", {
                exDescription: "Socket connection lost",
                exFatal: false,
            });
            //refresh the page
            location.reload();
        };

        //if this was called by a socket.io event
        if (data) {
            if (data.success) {
                Screen.gameCode = data.game.code;
                this.selectedTimeLimit = false;
                this.update({
                    success: true,
                    gameCode: data.game.code,
                    player: data.you,
                    data: {
                        players: data.game.players,
                        canViewLastRoundResults:
                            data.game.canViewLastRoundResults,
                    },
                });
            } else {
                ga("send", "exception", {
                    exDescription: data.error,
                    exFatal: false,
                });

                if (data.content) {
                    swal({
                        title: data.error,
                        type: "error",
                        text: data.content,
                        html: true,
                    });
                } else {
                    swal(data.error, "", "error");
                }
                this.waitingForResponse(false);
                return;
            }
        }

        this.waitingForResponse(false);

        super.show();
    }

    update(res) {
        if (!res.success) {
            ga("send", "exception", {
                exDescription: res.error,
                exFatal: false,
            });
            swal("Error updating lobby", res.error, "error");

            return;
        }

        Screen.gameCode = res.gameCode;
        if (this.rocketcrabMode) {
            this.title = "Drawphone";
        } else {
            this.title = `Game Code: ${Screen.getGameCodeHTML()}`;
        }

        this.subtitle = "Waiting for players...";
        if (res.event === "updatePlayerList" && res.data.players) {
            this.userList.update(res.data.players);
        }
        this.checkIfReadyToStart();

        if (res.player.isHost) {
            //show the start game button
            this.startButton.removeClass(HIDDEN);
            //show the game Settings
            this.gameSettings.removeClass(HIDDEN);
            this.gameSettingsBots.removeClass(HIDDEN);
            for (let setting of this.gameSettings.find(".lobby-setting")) {
                $(setting).prop("disabled", false);
            }

            if (res.data.players) {
                this.prevNumPlayers = this.numPlayers;
                this.numPlayers = res.data.players.length;
                this.initHost();
            }
        } else {
            this.clearHostHandlers();

            this.startButton.addClass(HIDDEN);
            this.gameSettings.removeClass(HIDDEN);
            this.gameSettingsBots.addClass(HIDDEN);

            // set settings disabled for players
            for (let setting of this.gameSettings.find(".lobby-setting")) {
                $(setting).prop("disabled", true);
            }

            if (res.data.setting) {
                this.updateNonHostSettings(res.data.setting);
            }
        }

        if (res.data.canViewLastRoundResults) {
            this.viewPreviousResultsButton.removeClass(HIDDEN);
        } else {
            this.viewPreviousResultsButton.addClass(HIDDEN);
        }
    }

    updateNonHostSettings({ name, value }) {
        // update if host changes
        const settingToUpdate = this.gameSettings.find(
            `#lobby-settings-${name}`
        );

        if (["wordfirst", "showNeighbors"].includes(name)) {
            settingToUpdate.prop("checked", value);
        } else if (["timelimit", "turnlimit", "gametime"].includes(name)) {
            settingToUpdate.text(value);
        } else {
            settingToUpdate.prop("value", value);
        }

        // change wordpack to default (on player screens) if host turns on firstword
        if (name === "wordfirst" && value === true) {
            this.gameSettings
                .find(`#lobby-settings-wordpack`)
                .val("Select a word pack...");
        }
    }

    clearHostHandlers() {
        this.startButton.off("click");
        this.wordFirstCheckbox.off("change");
        this.showNeighborsCheckbox.off("change");
        this.timeLimitMinus.off("click");
        this.timeLimitPlus.off("click");
        this.turnLimitMinus.off("click");
        this.turnLimitPlus.off("click");
        this.wordPackDropdown.off("change");
        this.addBotButton.off("click");
        this.removeBotButton.off("click");
    }

    initHost() {
        this.clearHostHandlers();

        this.startButton.on("click", () => {
            const ready = !this.isLoading && this.checkIfReadyToStart();
            if (this.userList.numberOfPlayers === 1 && ready) {
                swal(
                    {
                        title: "Demo mode",
                        text:
                            "Would you like to play Drawphone with just yourself to see how it works?",
                        type: "info",
                        showCancelButton: true,
                    },
                    () => {
                        this.start.bind(this)();
                    }
                );
            } else if (ready) {
                this.start.bind(this)();
            } else {
                swal(
                    "Not ready to start",
                    "Make sure have selected a word pack, a drawing time limit, and that you have at least four players.",
                    "error"
                );
                ga("send", "event", "Lobby", "disallowed start attempt");
            }
        });

        const changeTurnLimit = (modifier) => {
            const oldTurnLimit = this.selectedTurnLimit;
            const isWordFirst = this.wordFirstCheckbox.is(":checked");

            const {
                newTurnLimit,
                isMax,
                isTurnLimitUnchanged,
            } = getNewTurnLimit({
                modifier,
                prevTurnLimit: oldTurnLimit,
                numPlayers: this.numPlayers,
                prevNumPlayers: this.prevNumPlayers,
                isWordFirst,
            });

            this.selectedTurnLimit = newTurnLimit;

            const isTurnLimitValid = this.selectedTurnLimit <= this.numPlayers;

            const newDisplay = isTurnLimitValid
                ? `${this.selectedTurnLimit} turns${isMax ? " (max)" : ""}`
                : "N/A";

            const gameTimeText = isTurnLimitValid
                ? `(round will take about ${this.selectedTurnLimit} minutes)`
                : "";

            this.turnLimitDisplay.text(newDisplay);
            this.gameTimeDisplay.text(gameTimeText);

            this.prevNumPlayers = this.numPlayers;

            if (isTurnLimitUnchanged) return;

            this.checkIfReadyToStart();

            this.socket.emit("hostUpdatedSettings", {
                name: "turnlimit",
                value: newDisplay,
            });

            this.socket.emit("hostUpdatedSettings", {
                name: "gametime",
                value: gameTimeText,
            });
        };

        this.turnLimitMinus.on("click", () => changeTurnLimit(-1));
        this.turnLimitPlus.on("click", () => changeTurnLimit(1));

        changeTurnLimit(0);

        const onWordFirstChange = () => {
            if (this.wordFirstCheckbox.is(":checked")) {
                this.wordPack = false;
                this.wordPackDropdown.prop("selectedIndex", 0);
                this.wordPackDropdown.prop("disabled", true);
            } else {
                this.wordPackDropdown.prop("disabled", false);
            }

            this.checkIfReadyToStart();
        };
        this.wordFirstCheckbox.on("change", () => {
            onWordFirstChange();
            changeTurnLimit(0);

            this.socket.emit("hostUpdatedSettings", {
                name: "wordfirst",
                value: this.wordFirstCheckbox.is(":checked"),
            });
        });
        onWordFirstChange();

        this.showNeighborsCheckbox.on("change", () => {
            this.showNeighbors = !!this.showNeighborsCheckbox.is(":checked");
            this.socket.emit("hostUpdatedSettings", {
                name: "showNeighbors",
                value: this.showNeighborsCheckbox.is(":checked"),
            });

            this.checkIfReadyToStart();
            ga("send", "event", "Lobby", "show neighbors", this.showNeighbors);
        });

        const changeTimeLimit = (modifier) => {
            const oldTimeLimit = this.selectedTimeLimit;
            if (oldTimeLimit >= 30) modifier *= 15;
            if (oldTimeLimit < 30) modifier *= 5;

            this.selectedTimeLimit = Math.max(0, oldTimeLimit + modifier);

            const newDisplay =
                this.selectedTimeLimit === 0
                    ? "No time limit"
                    : `${this.selectedTimeLimit} seconds`;
            this.timeLimitDisplay.text(newDisplay);

            if (oldTimeLimit === this.selectedTimeLimit) return;

            this.checkIfReadyToStart();

            this.socket.emit("hostUpdatedSettings", {
                name: "timelimit",
                value: newDisplay,
            });
        };

        this.timeLimitMinus.on("click", () => changeTimeLimit(-1));
        this.timeLimitPlus.on("click", () => changeTimeLimit(1));

        changeTimeLimit(0);

        const onWordPackDropdownChange = () => {
            const selected = this.wordPackDropdown[0].value;
            this.wordPack =
                selected === "Select a word pack..." ? false : selected;

            this.checkIfReadyToStart();
        };

        this.wordPackDropdown.on("change", () => {
            onWordPackDropdownChange();
            this.socket.emit("hostUpdatedSettings", {
                name: "wordpack",
                value: this.wordPackDropdown[0].value,
            });

            ga("send", "event", "Lobby", "word pack change", this.wordPack);
        });
        onWordPackDropdownChange();

        this.addBotButton.on("click", () => {
            swal(
                "Bad bot",
                'Warning! The bots are a little janky. They think most drawings are "rain". But, they are real bots that make their best guesses based on the Mobilenet and Doodlenet machine learning models. 🤖',
                "warning"
            );
            this.socket.emit("addBotPlayer");
        });

        this.removeBotButton.on("click", () =>
            this.socket.emit("removeBotPlayer")
        );
    }

    checkIfReadyToStart() {
        if (
            this.selectedTimeLimit !== false &&
            (this.wordPack !== false ||
                this.wordFirstCheckbox.is(":checked")) &&
            (this.userList.numberOfPlayers >= 4 ||
                this.userList.numberOfPlayers === 1)
        ) {
            //un-grey-out start button
            this.startButton.removeClass("disabled");
            return true;
        } else {
            this.startButton.addClass("disabled");
            return false;
        }
    }

    start() {
        this.waitingForResponse(true);
        this.socket.emit("tryStartGame", {
            timeLimit: this.selectedTimeLimit,
            wordPackName: this.wordPack,
            showNeighbors: this.showNeighbors,
            turnLimit: this.selectedTurnLimit,
        });
        ga("send", "event", "Game", "start");
        ga("send", "event", "Game", "time limit", this.selectedTimeLimit);
        ga("send", "event", "Game", "turn limit", this.selectedTurnLimit);
        ga("send", "event", "Game", "word pack", this.wordPack);
        ga(
            "send",
            "event",
            "Game",
            "number of players",
            this.userList.realPlayers
        );
        ga("send", "event", "Game", "number of bots", this.userList.botPlayers);
        ga(
            "send",
            "event",
            "Game",
            "number of total players",
            this.userList.numberOfPlayers
        );
    }
}

export default Lobby;
