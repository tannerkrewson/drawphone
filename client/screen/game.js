import swal from "bootstrap-sweetalert";

import Screen from "./screen.js";
import { startTimer, showElement } from "../util.js";
import { getDrawingCanvas } from "../canvas.js";
import { HIDDEN, DRAWING, WORD, FIRST_WORD } from "../../shared/enums.js";

/* global $, ga */

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

    initialize(props) {
        super.initialize(props);
        const doneButton = $("#game-send");

        //bind clear canvas to clear drawing button

        //if user touches the canvas, it not blank no more
        $("#game-drawing").on("mousedown touchstart", () => {
            //if this is their first mark
            if (
                this.canvas.isBlank &&
                this.timeLimit > 0 &&
                !this.submitTimer
            ) {
                //start the timer
                this.displayTimerInterval = startTimer(
                    this.timeLimit,
                    (timeLeft) => {
                        this.timerDisplay.text(
                            `${timeLeft} left to finish your drawing`
                        );
                    }
                );
                this.submitTimer = window.setTimeout(() => {
                    //when the time runs out...
                    //we don't care if it is blank
                    this.canvas.isBlank = false;
                    //submit
                    this.onDone();
                    ga(
                        "send",
                        "event",
                        "Drawing",
                        "timer forced submit",
                        this.timeLimit
                    );
                }, this.timeLimit * 1000);
            }
            this.canvas.isBlank = false;
        });

        doneButton.click(() => {
            this.onDone();
        });

        //run done when enter key is pressed in word input
        $("#game-word-in").keypress(({ which }) => {
            const key = which;
            if (key === 13) {
                this.onDone();
            }
        });
    }

    show() {
        super.show();

        if (this.rocketcrabMode) {
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

        this.socket.emit("finishedLink", {
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

export default Game;
