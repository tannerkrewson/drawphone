import Screen from "./screen.js";
import { getDrawingCanvas } from "../canvas.js";
import { DRAWING, WORD, FIRST_WORD } from "../../shared/enums.js";

/* global $, ga */

class Game extends Screen {
    constructor({ submit, showDrawing, showError }) {
        super();
        this.id = "#game";
        this.wordInput = $("#game-word-in");
        this.timerDisplay = $("#game-timer");
        this.submit = submit;
        this.showDrawing = showDrawing;
        this.showError = showError;

        window.addEventListener("resize", () => this.resizeCanvas());
        $("#game-drawing").on("pointerdown", "canvas", () => this.startTimer());
        $("#game-send").on("click", () => this.checkIfDone());
        this.wordInput.on("keydown", (event) => {
            if (event.key === "Enter") this.checkIfDone();
        });
    }

    stopTimer() {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    startTimer() {
        if (!this.timeLimit || this.timer || this.deadline) return;
        this.deadline = Date.now() + this.timeLimit * 1000;
        try {
            localStorage.setItem(this.key + ":deadline", this.deadline);
        } catch {
            // Drawing still works when storage is unavailable.
        }
        this.countDown();
    }

    countDown() {
        const update = () => {
            const left = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
            if (left === 0) {
                this.stopTimer();
                this.timerDisplay.text("Time is up.");
                this.checkIfDone(true);
                ga("send", "event", "Drawing", "timer forced submit", this.timeLimit);
            } else {
                const minutes = Math.floor(left / 60);
                const seconds = String(left % 60).padStart(2, "0");
                this.timerDisplay.text(`${minutes}:${seconds} left to finish your drawing`);
            }
        };
        this.timer = setInterval(update, 250);
        update();
    }

    newLink({ link, count, finalCount, timeLimit, key, ink, id, turn }) {
        this.stopTimer();
        this.key = key;
        this.idOfRound = id;
        this.turn = turn;
        this.timeLimit = timeLimit;
        this.drawing = link.type === WORD;
        this.deadline = 0;
        this.setSubtitle(`${count}/${finalCount}`);
        $("#game-drawing, #game-draw-buttons").toggleClass("d-none", !this.drawing);
        $("#game-drawing-undo, #game-drawing-redo").toggleClass(
            "d-none",
            !this.drawing || (timeLimit > 0 && timeLimit <= 5),
        );
        $("#game-word").toggleClass("d-none", this.drawing);
        this.wordInput.val("");
        this.setPending(false);
        if (this.drawing) {
            this.setTitle(`Please draw: ${link.data}`);
            this.show();
            this.canvas ??= getDrawingCanvas();
            this.resizeCanvas();
            this.canvas.begin(key, ink);
            this.timerDisplay.text(
                timeLimit ? "Begin drawing to start the timer." : "No time limit to draw.",
            );
            try {
                this.deadline = Number(localStorage.getItem(key + ":deadline")) || 0;
            } catch {
                // The timer can start when this player begins to draw.
            }
            if (timeLimit && this.deadline) this.countDown();
        } else {
            this.setTitle(
                link.type === FIRST_WORD ? "What should be drawn?" : "What is this a drawing of?",
            );
            const image = $("#game-word-drawingtoname").get(0);
            image.removeAttribute("src");
            image.hidden = !link.ref;
            const status = $("#game-drawing-status").get(0);
            status.textContent = "";
            if (link.type === DRAWING) this.showDrawing(image, status, link);
            this.show();
        }
    }

    setPending(pending) {
        this.pending = pending;
        $("#game-send").prop("disabled", pending);
        $(
            "#game-drawing, #game-draw-buttons, #game-word, #game-drawing-undo, #game-drawing-redo",
        ).prop("inert", pending);
    }

    async checkIfDone(timedOut = false) {
        if (this.pending) return;
        if (this.drawing && this.canvas.isBlank && !timedOut && !this.expired()) {
            this.showError("Please draw a picture, then try again.");
            return;
        }
        const word = this.drawing ? undefined : this.wordInput.val().trim();
        if (!this.drawing && !word) {
            this.showError("Please enter a guess, then try again.");
            return;
        }

        const { key, idOfRound: id, turn, drawing } = this;
        this.stopTimer();
        this.setPending(true);
        const accepted = await this.submit(
            { id, turn },
            drawing ? this.canvas.bytes() : undefined,
            word,
        );
        if (accepted) {
            try {
                localStorage.removeItem(key);
                localStorage.removeItem(key + ":deadline");
            } catch {
                // The round was already submitted successfully.
            }
            ga("send", "event", "Link", "submit", drawing ? DRAWING : WORD);
        }
        if (this.key === key) {
            this.setPending(false);
            if (!accepted && this.deadline && !this.expired()) this.countDown();
        }
    }

    expired() {
        return this.deadline && this.deadline <= Date.now();
    }

    resizeCanvas() {
        const width = $("#game-drawing").width();
        if (width > 0) this.canvas?.resize(width);
    }
}

export default Game;
