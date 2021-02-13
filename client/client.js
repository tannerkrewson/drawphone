//
//  Drawphone Client
//  By Tanner Krewson
//

/* global $, swal, fabric, io, ga */

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-sweetalert/dist/sweetalert.css";
import "typeface-pangolin";
import "@fortawesome/fontawesome-free/svgs/solid/pencil-alt.svg";
import "@fortawesome/fontawesome-free/svgs/solid/phone-alt.svg";
import "@fortawesome/fontawesome-free/svgs/solid/arrow-right.svg";
import "./styles.css";

import "bootstrap";
import io from "socket.io-client";
import { fabric } from "fabric";
import "blueimp-canvas-to-blob";
import swal from "bootstrap-sweetalert";
import Dexie from "dexie";

import ml5 from "ml5";

//prevent page from refreshing when Join game buttons are pressed
$(() => {
    $("form").submit(() => false);

    // arrow function won't set "this"
    $(".close").on("click", function () {
        $(this).parent().parent().remove();
    });
});

//
//  Constants
//
const HIDDEN = "d-none";
const DRAWING = "drawing";
const WORD = "word";
const FIRST_WORD = "first-word";

//
//  UI Methods
//

function hideAll() {
    $("#mainmenu").addClass(HIDDEN);
    $("#joinmenu").addClass(HIDDEN);
    $("#newmenu").addClass(HIDDEN);
    $("#lobby").addClass(HIDDEN);
    $("#game").addClass(HIDDEN);
    $("#result").addClass(HIDDEN);
    $("#waiting").addClass(HIDDEN);
    $("#replace").addClass(HIDDEN);
    $("#previous-player-container").addClass(HIDDEN);
    $("#previous-player-arrow").addClass(HIDDEN);
    $("#loading").addClass(HIDDEN);
}

function showElement(jq) {
    $(jq).removeClass(HIDDEN);
}

// http://stackoverflow.com/questions/20618355/the-simplest-possible-javascript-countdown-timer
function startTimer(duration, onTick) {
    let timer = duration;
    let minutes;
    let seconds;

    const tick = () => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        onTick(`${minutes}:${seconds}`);

        if (--timer < 0) {
            timer = duration;
        }
    };

    tick();
    return setInterval(tick, 1000);
}

//
//  Objects
//

class Drawphone {
    constructor() {
        this.screens = [];

        const self = this;
        this.mainMenu = new MainMenu(
            () => {
                //ran when Join Game button is pressed
                self.joinMenu.show();
            },
            () => {
                //ran when New Game button is pressed
                self.newMenu.show();
            }
        );

        this.joinMenu = new JoinMenu(() => {
            //ran when Back button is pressed
            self.mainMenu.show();
        });

        this.newMenu = new NewMenu(() => {
            //ran when Back button is pressed
            self.mainMenu.show();
        });

        this.lobby = new Lobby();

        this.game = new Game(() => {
            //ran when the player sends
            self.waiting.show();
        });

        this.results = new Results(() => {
            //ran when done button on results page is tapped
            self.lobby.show();
        });

        this.waiting = new Waiting();

        this.replace = new Replace();

        this.screens.push(this.mainMenu);
        this.screens.push(this.joinMenu);
        this.screens.push(this.newMenu);
        this.screens.push(this.lobby);
        this.screens.push(this.game);
        this.screens.push(this.results);
        this.screens.push(this.waiting);
        this.screens.push(this.replace);
    }

    initializeAll() {
        this.screens.forEach((screen) => {
            screen.initialize();
        });

        this.attachSocketListeners();
    }

    attachSocketListeners() {
        socket.on("joinGameRes", this.lobby.show.bind(this.lobby));

        socket.on("updatePlayerList", this.lobby.update.bind(this.lobby));

        socket.on("updateSettings", this.lobby.update.bind(this.lobby));

        socket.on("nextLink", this.game.newLink.bind(this.game));

        socket.on("viewResults", this.results.show.bind(this.results));

        socket.on("showWaitingList", this.waiting.show.bind(this.waiting));

        socket.on(
            "updateWaitingList",
            this.waiting.updateWaitingList.bind(this.waiting)
        );

        socket.on("replacePlayer", this.replace.show.bind(this.replace));
    }

    begin() {
        this.mainMenu.show();
    }
}

class Screen {
    constructor() {
        this.id = "";
        this.title = "Loading Drawphone...";
        this.subtitle = "Just a moment!";
        this.isLoading = true;

        this.defaultTitle =
            '<div class="animated-title"><span class="drawphone-d">D</span><span class="drawphone-r">r</span><span class="drawphone-a">a</span><span class="drawphone-w">w</span><span class="drawphone-p">p</span><span class="drawphone-h">h</span><span class="drawphone-o">o</span><span class="drawphone-n">n</span><span class="drawphone-e">e</span></div>';
        this.defaultSubtitle = "Telephone with pictures";
    }

    initialize() {}

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

    initialize() {
        super.initialize();

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

    initialize() {
        super.initialize();

        this.backButton.click(this.onBack);
        this.goButton.click(function () {
            if (!this.isLoading) {
                this.waitingForResponse(true);
                const code = $("#joinincode").val();
                const name = $("#joininname").val();

                socket.open();
                socket.emit("joinGame", {
                    code,
                    name,
                });
            }
        });

        const self = this;

        this.codeInput.on("input", () => {
            self.codeInput.val(
                self.codeInput
                    .val()
                    .substring(0, 4)
                    .toLowerCase()
                    .replace(/[^a-z]/g, "")
            );
            if (self.codeInput.val()) {
                self.codeInput.addClass("gamecode-entry");
            } else {
                self.codeInput.removeClass("gamecode-entry");
            }
        });

        this.setDefaultTitles();
    }
}

class NewMenu extends Screen {
    constructor(onBack) {
        super();

        this.id = "#newmenu";
        this.backButton = $("#newmenu-back");
        this.goButton = $("#newmenu-go");
        this.onBack = onBack;

        this.setDefaultTitles();
    }

    initialize() {
        super.initialize();

        this.backButton.click(this.onBack);
        this.goButton.click(function () {
            if (!this.isLoading) {
                this.waitingForResponse(true);
                const name = $("#newinname").val();

                socket.open();
                socket.emit("newGame", {
                    name,
                });
            }
        });
    }
}

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
        this.wordPackDropdown = $("#lobby-settings-wordpack");
        this.gameSettingsBots = $("#lobby-settings-bots");
        this.addBotButton = $("#lobby-settings-addbot");
        this.removeBotButton = $("#lobby-settings-removebot");
        this.viewPreviousResultsButton = $("#lobby-prevres");
        this.gameCode = "";

        //this is what the host selects from the dropdowns
        this.selectedTimeLimit = 0;
        this.wordPack = false;
        this.showNeighbors = false;

        this.userList = new UserList($("#lobby-players"));
    }

    initialize() {
        super.initialize();

        this.leaveButton.click(() => {
            ga("send", "event", "Lobby", "leave");
            //refresh the page
            location.reload();
        });

        this.viewPreviousResultsButton.click(() => {
            socket.emit("viewPreviousResults", {});

            ga("send", "event", "Lobby", "view previous results");
        });

        this.wordFirstCheckbox.prop("checked", false);
        this.showNeighborsCheckbox.prop("checked", false);
        this.timeLimitDisplay.text("No time limit");
        this.wordPackDropdown.prop("selectedIndex", 0);
        this.wordPackDropdown.prop("disabled", false);

        ga("send", "event", "Lobby", "created");
    }

    show(data) {
        socket.off("disconnect");
        socket.on("disconnect", (reason) => {
            // if the disconnection was initiated by the server
            // it was likely a kick from the host
            if (reason === "io server disconnect") {
                onActualDisconnect();
            }
        });

        socket.off("reconnect_failed");
        socket.on("reconnect_failed", () => {
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
        if (ROCKETCRAB_MODE) {
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

            this.initHost();
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
        } else if (name === "timelimit") {
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

            socket.emit("hostUpdatedSettings", {
                name: "wordfirst",
                value: this.wordFirstCheckbox.is(":checked"),
            });
        });
        onWordFirstChange();

        this.showNeighborsCheckbox.on("change", () => {
            this.showNeighbors = !!this.showNeighborsCheckbox.is(":checked");
            socket.emit("hostUpdatedSettings", {
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

            socket.emit("hostUpdatedSettings", {
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
            socket.emit("hostUpdatedSettings", {
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
            socket.emit("addBotPlayer");
        });

        this.removeBotButton.on("click", () => socket.emit("removeBotPlayer"));
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
        socket.emit("tryStartGame", {
            timeLimit: this.selectedTimeLimit,
            wordPackName: this.wordPack,
            showNeighbors: this.showNeighbors,
        });
        ga("send", "event", "Game", "start");
        ga("send", "event", "Game", "time limit", this.selectedTimeLimit);
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

class Game extends Screen {
    constructor(onWait) {
        super();

        this.id = "#game";
        this.onWait = onWait;

        this.wordInput = $("#game-word-in");
        this.timerDisplay = $("#game-timer");

        this.neighboringPlayers = $("#neighboring-players-container");
        this.leftPlayer = $("#previous-player");
        this.youPlayer = $("#you-player");
        this.rightPlayer = $("#next-player");

        this.canvas;

        this.submitTimer;

        window.addEventListener("resize", this.resizeCanvas.bind(this), false);
    }

    initialize() {
        super.initialize();
        const doneButton = $("#game-send");

        //bind clear canvas to clear drawing button
        const self = this;

        //if user touches the canvas, it not blank no more
        $("#game-drawing").on("mousedown touchstart", () => {
            //if this is their first mark
            if (
                self.canvas.isBlank &&
                self.timeLimit > 0 &&
                !self.submitTimer
            ) {
                //start the timer
                self.displayTimerInterval = startTimer(
                    self.timeLimit,
                    (timeLeft) => {
                        self.timerDisplay.text(
                            `${timeLeft} left to finish your drawing`
                        );
                    }
                );
                self.submitTimer = window.setTimeout(() => {
                    //when the time runs out...
                    //we don't care if it is blank
                    self.canvas.isBlank = false;
                    //submit
                    self.onDone();
                    ga(
                        "send",
                        "event",
                        "Drawing",
                        "timer forced submit",
                        self.timeLimit
                    );
                }, self.timeLimit * 1000);
            }
            self.canvas.isBlank = false;
        });

        doneButton.click(() => {
            self.onDone();
        });

        //run done when enter key is pressed in word input
        $("#game-word-in").keypress(({ which }) => {
            const key = which;
            if (key === 13) {
                self.onDone();
            }
        });
    }

    show() {
        super.show();

        if (ROCKETCRAB_MODE) {
            this.setSubtitle("🚀🦀");
        } else {
            this.setSubtitle(`Game code: ${Screen.getGameCodeHTML()}`);
        }

        //allow touch events on the canvas
        $("#game-drawing").css("pointer-events", "auto");
        this.done = false;
    }

    showDrawing(disallowChanges) {
        if (!disallowChanges) {
            this.canvas = getDrawingCanvas();
        }

        let shouldShowUndoButtons;

        showElement("#game-drawing");
        this.show();

        if (this.timeLimit > 0) {
            this.timerDisplay.text("Begin drawing to start the timer.");

            if (this.timeLimit <= 5) {
                //if the time limit is less than 5 seconds
                //	don't show the undo button
                //because players don't really have enough time to try drawing again
                //	when they only have 5 seconds
                shouldShowUndoButtons = false;
            } else {
                shouldShowUndoButtons = true;
            }
        } else {
            this.timerDisplay.text("No time limit to draw.");
            shouldShowUndoButtons = true;
        }

        if (disallowChanges) {
            //lock the canvas so the user can't make any changes
            $("#game-drawing").css("pointer-events", "none");
            shouldShowUndoButtons = false;
        }

        this.showButtons(shouldShowUndoButtons);
    }

    showWord() {
        showElement("#game-word");
        this.showButtons(false);
        this.show();
    }

    showButtons(showClearButton) {
        if (showClearButton) {
            showElement("#game-drawing-redo");
            showElement("#game-drawing-undo");
            $("#game-drawing-redo").addClass("disabled");
            $("#game-drawing-undo").addClass("disabled");

            showElement("#game-draw-buttons");
        } else {
            $("#game-drawing-redo").addClass(HIDDEN);
            $("#game-drawing-undo").addClass(HIDDEN);
        }
        showElement("#game-buttons");
    }

    hideBoth() {
        $("#game-drawing").addClass(HIDDEN);
        $("#game-word").addClass(HIDDEN);
        $("#game-buttons").addClass(HIDDEN);
        $("#game-draw-buttons").addClass(HIDDEN);
    }

    newLink({ data }) {
        const lastLink = data.link;
        const lastLinkType = lastLink.type;
        const count = data.count;
        const finalCount = data.finalCount;

        const showNeighbors = data.showNeighbors;
        const playerList = data.players;
        const thisPlayer = data.thisPlayer;

        const newLinkType =
            lastLinkType === DRAWING || lastLinkType === FIRST_WORD
                ? WORD
                : DRAWING;
        this.timeLimit = data.timeLimit;

        if (lastLinkType === DRAWING) {
            //show the previous drawing
            $("#game-word-drawingtoname").attr("src", lastLink.data);

            this.setTitle("What is this a drawing of?");

            //show the word creator
            this.showWord();
        } else if (lastLinkType === WORD) {
            this.setTitle(
                `<span class="avoidwrap">Please draw:&nbsp;</span><span class="avoidwrap">${lastLink.data}</span>`
            );

            //show drawing creator
            this.showDrawing();

            //calculate size of canvas dynamically
            this.resizeCanvas();
        } else if (lastLinkType === FIRST_WORD) {
            $("#game-word-drawingtoname").removeAttr("src");
            this.setTitle("What should be drawn?");

            //show the word creator
            this.showWord();
        }

        this.setSubtitle(
            `${this.subtitle} &nbsp; - &nbsp; ${count}/${finalCount}`
        );

        this.showNeighbors(
            showNeighbors,
            playerList,
            thisPlayer,
            count,
            finalCount
        );

        //this will be ran when the done button is clicked, or
        //  the enter key is pressed in the word input
        this.onDone = function () {
            this.checkIfDone(newLinkType);
        };
        this.waitingForResponse(false);
    }

    checkIfDone(newLinkType) {
        this.done = true;

        //disable the submit timer to prevent duplicate sends
        clearTimeout(this.submitTimer);
        clearInterval(this.displayTimerInterval);
        this.submitTimer = undefined;
        this.displayTimerInterval = undefined;

        //hide the drawing
        this.hideBoth();

        let newLink;
        if (newLinkType === DRAWING) {
            if (this.canvas.isBlank) {
                showElement("#game-drawing");
                showElement("#game-buttons");
                showElement("#game-draw-buttons");
                swal(
                    "Your picture is blank!",
                    "Please draw a picture, then try again.",
                    "info"
                );
            } else {
                // convert canvas to an SVG string, encode it in base64, and send it as a dataurl
                newLink = `data:image/svg+xml;base64,${btoa(
                    this.canvas.toSVG()
                )}`;

                this.canvas.remove();
                this.sendLink(newLinkType, newLink);
            }
        } else if (newLinkType === WORD) {
            newLink = $("#game-word-in").val().trim();
            //check if it is blank
            if (newLink === "") {
                this.showWord();
                swal(
                    "Your guess is blank!",
                    "Please enter a guess, then try again.",
                    "info"
                );
            } else {
                //clear the input
                $("#game-word-in").val("");
                this.sendLink(newLinkType, newLink);
            }
        }
    }

    sendLink(type, data) {
        this.setTitle("Sending...");

        socket.emit("finishedLink", {
            link: {
                type,
                data,
            },
        });
        ga("send", "event", "Link", "submit", type);
        this.onWait();
    }

    resizeCanvas() {
        const container = $("#game-drawing");
        if (this.canvas) {
            this.canvas.setHeight(container.width());
            this.canvas.setWidth(container.width());
            this.canvas.renderAll();
        }
    }

    setTimer() {
        if (this.timeLimit && !this.timeLimit === 0) {
            window.setTimeout();
        }
    }

    showNeighbors(showNeighbors, playerList, thisPlayer, count, finalCount) {
        if (!showNeighbors) {
            this.neighboringPlayers.addClass(HIDDEN);
            return;
        }

        this.neighboringPlayers.removeClass(HIDDEN);

        let playerIdx;
        const numPlayers = playerList.length;
        for (playerIdx = 0; playerIdx < numPlayers; playerIdx++) {
            if (playerList[playerIdx].id === thisPlayer.id) {
                break;
            }
        }
        this.leftPlayer.text(playerList[(playerIdx + 1) % numPlayers].name);
        this.youPlayer.text(thisPlayer.name);
        this.rightPlayer.text(
            playerList[(playerIdx - 1 + numPlayers) % numPlayers].name
        );

        if (count > 1) {
            showElement("#previous-player-container");
            showElement("#previous-player-arrow");
        }

        if (count === finalCount) {
            $("#next-player-container").addClass(HIDDEN);
            $("#next-player-arrow").addClass(HIDDEN);
        }
    }
}

class Results extends Screen {
    constructor(onDoneViewingResults) {
        super();

        this.onDoneViewingResults = onDoneViewingResults;

        this.id = "#result";
    }

    initialize() {
        const self = this;
        $("#result-done").on("click", () => {
            self.onDoneViewingResults();
        });
    }

    show({ data }, isArchivePage) {
        socket.off("disconnect");

        const { chains, roundTime } = data;

        if (roundTime) {
            ga("send", "event", "Results", "round time per player", roundTime);
        }

        this.render(chains[0], chains);

        super.show();

        if (!isArchivePage && !data.isViewPreviousResults) {
            addResultsToStorage(chains);
        }
    }

    render(chainToShow, allChains) {
        const chainNumber = allChains.indexOf(chainToShow);

        this.setTitle(`Results #${chainNumber + 1}`);
        const subtitle = `${chainToShow.owner.name} should present these results to the group!`;
        this.setSubtitle(subtitle);
        this.displayChain(chainToShow);
        this.displayOtherChainButtons(allChains, chainToShow);
    }

    displayChain({ links }) {
        const results = $("#result-content");
        results.empty();

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (i === 0 && link.type === WORD) {
                results.append(
                    `<h4>The first word:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            } else if (i === 1 && links[0].type === FIRST_WORD) {
                results.append(
                    `<h4>${link.player.name} wanted someone to draw:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            } else if (link.type === DRAWING) {
                results.append(
                    `<h4>${link.player.name} drew:</h4><img class="drawing mb-4" src="${link.data}"></img>`
                );
            } else if (link.type === WORD) {
                results.append(
                    `<h4>${link.player.name} thought that was:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            }
        }

        let wentFromBox = "";
        wentFromBox += '<br><div class="well">';
        const firstIndex = links[0].type === FIRST_WORD ? 1 : 0;
        wentFromBox += `<h4>You started with:</h4><h1>${links[firstIndex].data}</h1><br>`;
        wentFromBox += `<h4>and ended up with:</h4><h1>${
            links[links.length - 1].data
        }</h1>`;
        wentFromBox += "</div>";
        results.append(wentFromBox);
    }

    displayOtherChainButtons(chainsToList, { id }) {
        const others = $("#result-others");
        others.empty();

        if (chainsToList.length > 1) {
            others.append("<h4>View more results:</h4>");
        }

        const self = this;
        for (let i = 0; i < chainsToList.length; i++) {
            const chain = chainsToList[i];

            const disabled = chain.id === id ? "disabled" : "";

            // "players write first word" chains have the first word at index 1.
            const buttonLabel = chain.links[0].data || chain.links[1].data;

            const button = $(
                `<button type="button"${disabled}>${
                    i + 1
                }. ${buttonLabel}</button>`
            );
            button.addClass("btn btn-default btn-lg");
            ((thisChain, chainList) => {
                button.click(() => {
                    self.render(thisChain, chainList);

                    //jump to top of the page
                    window.scrollTo(0, 0);

                    ga("send", "event", "Results", "display another chain");
                });
            })(chain, chainsToList);
            others.append(button);
        }
    }
}

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
                promptKickPlayer,
                promptReplaceBot
            );
        } else {
            $("#waiting-hostmsg").addClass(HIDDEN);
            this.userList.update(notFinished, disconnected);
        }
    }
}

const promptKickPlayer = (tappedPlayer) => {
    //ran when the client taps one of the usernames

    swal(
        {
            title: `Kick ${tappedPlayer.name}?`,
            text:
                "Someone will have to join this game to replace them. (Or, you could use a bot!)",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-danger",
            confirmButtonText: "Kick",
            closeOnConfirm: false,
        },
        () => {
            socket.emit("kickPlayer", {
                playerToKick: tappedPlayer,
            });
            swal("Done!", `${tappedPlayer.name} was kicked.`, "success");
            ga("send", "event", "User list", "Host kick player");
        }
    );
    ga("send", "event", "User list", "Host tap player");
};

const promptReplaceBot = (tappedPlayer) => {
    //ran when the client taps one of the disconnected players

    swal(
        {
            title: `Replace ${tappedPlayer.name} with a bot?`,
            text: "Fair warning, the bots aren't very smart!",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-danger",
            confirmButtonText: "Replace",
            closeOnConfirm: false,
        },
        () => {
            socket.emit("replacePlayerWithBot", {
                playerToReplaceWithBot: tappedPlayer,
            });
            swal(
                "Done!",
                `${tappedPlayer.name} was replaced with a bot.`,
                "success"
            );
            ga("send", "event", "User list", "Host replace player with a bot");
        }
    );
    ga("send", "event", "User list", "Host tap player");
};

class Replace extends Screen {
    constructor() {
        super();
        this.id = "#replace";
        this.setTitle("Choose a player to replace");
    }

    initialize() {
        // when leave button is clicked, refresh the page
        $("#replace-leave").on("click", () => location.reload());

        super.initialize();
    }

    show({ data }) {
        const { gameCode, players } = data;

        const choices = $("#replace-choices");
        choices.empty();

        if (players.length) {
            players.forEach((player) => {
                const button = $(
                    `<button type="button">${player.name}</button>`
                );

                button.addClass("btn btn-default btn-lg");
                button.on("click", () => this.sendChoice(player));

                choices.append(button);
                choices.append("<br>");
            });
        } else {
            choices.append(
                "<p>This game is currently full. If you stay on this page, it " +
                    "will automatically update to let you know if someone has " +
                    "left!</p>"
            );
        }

        Screen.gameCode = gameCode;
        this.setSubtitle("Ready to join game...");
        super.show();
    }

    sendChoice(playerToReplace) {
        socket.emit("tryReplacePlayer", {
            playerToReplace,
        });
        ga("send", "event", "Player replacement", "replace", self.timeLimit);
    }
}

class UserList {
    constructor(ul) {
        this.ul = ul;
        this.numberOfPlayers = 0;
        this.realPlayers = 0;
        this.botPlayers = 0;
    }

    update(newList, disconnectedList, onKick, onBotReplace) {
        //clear all of the user boxes using jquery
        this.ul.empty();

        this.draw(newList, false, onKick);
        if (disconnectedList) {
            if (disconnectedList.length > 0) {
                $("#waiting-disconnectedmsg").removeClass(HIDDEN);
                this.draw(disconnectedList, true, onBotReplace);
            } else {
                $("#waiting-disconnectedmsg").addClass(HIDDEN);
            }
        }
    }

    draw(list, makeBoxDark, onClick) {
        this.numberOfPlayers = 0;
        this.realPlayers = 0;
        this.botPlayers = 0;

        list.forEach((player) => {
            this.numberOfPlayers++;
            player.isAi ? this.botPlayers++ : this.realPlayers++;

            const listBox = $("<span></span>");
            const listItem = $(`<li>${player.name}</li>`).appendTo(listBox);
            listItem.addClass("user");
            if (makeBoxDark) {
                listItem.addClass("disconnected");
            }
            listBox.addClass("col-xs-6");
            listBox.addClass("user-container");

            if (onClick) {
                listBox.on("click", () => onClick(player));
            }

            listBox.appendTo(this.ul);
        });
    }
}

// https://github.com/abhi06991/Undo-Redo-Fabricjs
function getDrawingCanvas() {
    const thisCanvas = new fabric.Canvas("game-drawing-canvas");
    thisCanvas.isDrawingMode = true;
    thisCanvas.isBlank = true;
    thisCanvas.freeDrawingBrush.width = 4;

    const state = {
        canvasState: [],
        currentStateIndex: -1,
        undoStatus: false,
        redoStatus: false,
        undoFinishedStatus: 1,
        redoFinishedStatus: 1,
        undoButton: $("#game-drawing-undo"),
        redoButton: $("#game-drawing-redo"),
        colorInput: $("#game-drawing-color"),
        recentColorButton1: $("#game-drawing-recent-color1"),
        recentColorButton2: $("#game-drawing-recent-color2"),
        recentColorButton3: $("#game-drawing-recent-color3"),
        brushsizeInput: $("#game-drawing-brushsize"),
        brushsize: 4,
        color: "#000000",
    };
    thisCanvas.on("path:created", () => {
        updateCanvasState();
    });

    const updateCanvasState = () => {
        state.undoButton.removeClass("disabled");
        thisCanvas.isBlank = false;
        if (state.undoStatus == false && state.redoStatus == false) {
            const jsonData = thisCanvas.toJSON();
            const canvasAsJson = JSON.stringify(jsonData);
            if (state.currentStateIndex < state.canvasState.length - 1) {
                const indexToBeInserted = state.currentStateIndex + 1;
                state.canvasState[indexToBeInserted] = canvasAsJson;
                const numberOfElementsToRetain = indexToBeInserted + 1;
                state.canvasState = state.canvasState.splice(
                    0,
                    numberOfElementsToRetain
                );
            } else {
                state.canvasState.push(canvasAsJson);
            }
            state.currentStateIndex = state.canvasState.length - 1;
            if (
                state.currentStateIndex == state.canvasState.length - 1 &&
                state.currentStateIndex != -1
            ) {
                state.redoButton.addClass("disabled");
            }
        }
    };

    const undo = () => {
        if (state.undoFinishedStatus) {
            if (state.currentStateIndex == -1) {
                state.undoStatus = false;
            } else {
                if (state.canvasState.length >= 1) {
                    state.undoFinishedStatus = 0;
                    if (state.currentStateIndex != 0) {
                        state.undoStatus = true;
                        thisCanvas.loadFromJSON(
                            state.canvasState[state.currentStateIndex - 1],
                            () => {
                                thisCanvas.renderAll();
                                state.undoStatus = false;
                                state.currentStateIndex -= 1;
                                state.undoButton.removeClass("disabled");
                                if (
                                    state.currentStateIndex !==
                                    state.canvasState.length - 1
                                ) {
                                    state.redoButton.removeClass("disabled");
                                }
                                state.undoFinishedStatus = 1;
                            }
                        );
                    } else if (state.currentStateIndex == 0) {
                        thisCanvas.clear();
                        state.undoFinishedStatus = 1;
                        state.undoButton.addClass("disabled");
                        state.redoButton.removeClass("disabled");
                        thisCanvas.isBlank = true;
                        state.currentStateIndex -= 1;
                    }
                }
            }
        }
    };

    const redo = () => {
        if (state.redoFinishedStatus) {
            if (
                state.currentStateIndex == state.canvasState.length - 1 &&
                state.currentStateIndex != -1
            ) {
                state.redoButton.addClass("disabled");
            } else {
                if (
                    state.canvasState.length > state.currentStateIndex &&
                    state.canvasState.length != 0
                ) {
                    state.redoFinishedStatus = 0;
                    state.redoStatus = true;
                    thisCanvas.loadFromJSON(
                        state.canvasState[state.currentStateIndex + 1],
                        () => {
                            thisCanvas.isBlank = false;
                            thisCanvas.renderAll();
                            state.redoStatus = false;
                            state.currentStateIndex += 1;
                            if (state.currentStateIndex != -1) {
                                state.undoButton.removeClass("disabled");
                            }
                            state.redoFinishedStatus = 1;
                            if (
                                state.currentStateIndex ==
                                    state.canvasState.length - 1 &&
                                state.currentStateIndex != -1
                            ) {
                                state.redoButton.addClass("disabled");
                            }
                        }
                    );
                }
            }
        }
    };

    const changeColor = () => {
        state.recentColorButton3.css(
            "background-color",
            state.recentColorButton2.css("background-color")
        );
        state.recentColorButton2.css(
            "background-color",
            state.recentColorButton1.css("background-color")
        );
        state.recentColorButton1.css(
            "background-color",
            thisCanvas.freeDrawingBrush.color
        );
        thisCanvas.freeDrawingBrush.color = state.colorInput.val();
    };

    const rgbToHex = (rgb) => {
        if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        function hex(x) {
            return `0${parseInt(x).toString(16)}`.slice(-2);
        }
        return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
    };

    const recallColor = (index, color) => {
        state.colorInput.val(rgbToHex(color));
        if (index >= 3) {
            state.recentColorButton3.css(
                "background-color",
                state.recentColorButton2.css("background-color")
            );
        }
        if (index >= 2) {
            state.recentColorButton2.css(
                "background-color",
                state.recentColorButton1.css("background-color")
            );
        }
        if (index >= 1) {
            state.recentColorButton1.css(
                "background-color",
                thisCanvas.freeDrawingBrush.color
            );
        }
        thisCanvas.freeDrawingBrush.color = state.colorInput.val();
    };

    const changeBrushsize = () => {
        thisCanvas.freeDrawingBrush.width =
            parseInt(state.brushsizeInput.val(), 10) || 1;
    };

    state.undoButton.on("click", undo);
    state.redoButton.on("click", redo);

    state.colorInput.on("change", changeColor);
    state.recentColorButton1.on("click", () => {
        recallColor(1, state.recentColorButton1.css("background-color"));
    });
    state.recentColorButton2.on("click", () => {
        recallColor(2, state.recentColorButton2.css("background-color"));
    });
    state.recentColorButton3.on("click", () => {
        recallColor(3, state.recentColorButton3.css("background-color"));
    });
    state.brushsizeInput.on("change", changeBrushsize);

    thisCanvas.remove = () => {
        state.undoButton.off("click");
        state.redoButton.off("click");
        state.colorInput.val("#000000");
        state.colorInput.off("change");
        state.recentColorButton1.off("click");
        state.recentColorButton2.off("click");
        state.recentColorButton3.off("click");
        state.brushsizeInput.val(4);
        thisCanvas.dispose();
        $("#game-drawing-canvas").empty();
    };

    return thisCanvas;
}

//
//  Main
//

var socket = io({ autoConnect: false, reconnectionAttempts: 3 });

//try to join the dev game
const relativeUrl = window.location.pathname + window.location.search;

if (relativeUrl === "/dev") {
    socket.open();
    socket.emit("joinGame", {
        code: "ffff",
        name: Math.random().toString().substring(2, 6),
    });
}

const urlParams = new URLSearchParams(window.location.search);
const isRocketcrab = urlParams.get("rocketcrab") === "true";
const name = urlParams.get("name");
//const isHost = urlParams.get("ishost") === "true";
const code = urlParams.get("code");

const ROCKETCRAB_MODE = isRocketcrab && name && code;

if (ROCKETCRAB_MODE) {
    socket.open();
    socket.emit("joinGame", {
        code,
        name,
    });
}

const drawphone = new Drawphone();
drawphone.initializeAll();
drawphone.begin();

if (relativeUrl === "/archive") {
    renderArchive();
}

async function renderArchive() {
    const archive = $("#archive");
    const archiveContent = $("#archive-content");
    const result = $("#result");
    if (!localStorage) {
        archiveContent.text("This browser does not support local storage.");
        return;
    }

    const resultsList = (await getResultsListFromStorage()).reverse();

    if (resultsList.length === 0) {
        archiveContent.text(
            "No results found on this device. Play a game first!"
        );
        return;
    }

    let lastDate;
    for (let i = 0; i < resultsList.length; i++) {
        const results = resultsList[i];

        const theDate = new Date(results.date).toLocaleDateString("en-us", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        if (theDate !== lastDate) {
            if (i > 0) archiveContent.append("<br>");
            archiveContent.append(theDate);

            lastDate = theDate;
        }

        const button = $(
            `<button type="button">${getQuickInfoStringOfResults(
                results
            )}</button>`
        );
        button.addClass("btn btn-default prevresbtn");

        ((chains) => {
            button.click(() => {
                drawphone.results.show(
                    {
                        data: { chains },
                        you: { id: "this id doesn't exist" },
                    },
                    true
                );

                result.show();
                archive.hide();

                //jump to top of the page
                window.scrollTo(0, 0);

                ga("send", "event", "Archive", "display another chain");
            });
        })(results.chains);
        archiveContent.append(button);
    }

    drawphone.results.onDoneViewingResults = () => {
        archive.show();
        result.hide();

        //jump to top of the page
        window.scrollTo(0, 0);
    };
}

function addResultsToStorage(chains) {
    const db = initArchiveDb();
    db.archive.add({ date: new Date(), chains });
}

function getResultsListFromStorage() {
    const db = initArchiveDb();
    return db.archive.toArray();
}

function initArchiveDb() {
    const db = new Dexie("DrawphoneDatabase");
    db.version(1).stores({
        archive: "++id,date,chains",
    });
    return db;
}

function getQuickInfoStringOfResults({ date, chains }) {
    let result = "";
    result += new Date(date).toLocaleTimeString("en-us", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    result += ": ";

    const firstChainLinks = chains[0].links;
    result += firstChainLinks[0].data || firstChainLinks[1].data;
    result += " to ";
    result += firstChainLinks[firstChainLinks.length - 1].data;

    if (chains.length === 1) return result;

    result += ", ";
    const secondChainLinks = chains[1].links;
    result += secondChainLinks[0].data || secondChainLinks[1].data;
    result += " to ";
    result += secondChainLinks[secondChainLinks.length - 1].data;
    result += ", etc.";
    return result;
}

socket.on("makeAIGuess", ({ data: drawingToGuess }) => {
    const image = new Image();

    const isDoodle = drawingToGuess.startsWith("data");

    image.onload = () => {
        if (isDoodle) {
            const canvas = document.createElement("canvas");
            canvas.height = 565;
            canvas.width = 565;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 565, 565);
            ctx.drawImage(image, 0, 0);

            classify(canvas, true);
        } else {
            classify(image, false);
        }
    };

    image.onabort = onMakeAIGuessError;
    image.onerror = onMakeAIGuessError;
    image.crossOrigin = "anonymous";
    image.src = drawingToGuess;
});

function classify(image, isDoodle) {
    const model = isDoodle ? "DoodleNet" : "MobileNet";

    console.log("running", model);

    const classifier = ml5.imageClassifier(model, () =>
        classifier.classify(image, 1, (err, results) => {
            if (err) {
                onMakeAIGuessError(err);
                return;
            }

            const [firstPrediction] = results;
            const { label, confidence } = firstPrediction;

            socket.emit("AIGuessResult", {
                success: true,
                link: {
                    type: "word",
                    data: label.split(",")[0],
                },
            });
        })
    );
}

function onMakeAIGuessError(e) {
    console.error(e);
    socket.emit("AIGuessResult", {
        success: false,
    });
}
