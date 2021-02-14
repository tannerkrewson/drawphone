/* global $ */

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-sweetalert/dist/sweetalert.css";
import "typeface-pangolin";
import "@fortawesome/fontawesome-free/svgs/solid/pencil-alt.svg";
import "@fortawesome/fontawesome-free/svgs/solid/phone-alt.svg";
import "@fortawesome/fontawesome-free/svgs/solid/arrow-right.svg";
import "./styles.css";

import "bootstrap";
import io from "socket.io-client";

import Drawphone from "./drawphone.js";
import { renderArchive } from "./archive.js";
import { classify, onMakeAIGuessError } from "./util.js";

//prevent page from refreshing when Join game buttons are pressed
$(() => {
    $("form").submit(() => false);

    // arrow function won't set "this"
    $(".close").on("click", function () {
        $(this).parent().parent().remove();
    });
});

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

const rocketcrabMode = isRocketcrab && name && code;

if (rocketcrabMode) {
    socket.open();
    socket.emit("joinGame", {
        code,
        name,
    });
}

const drawphone = new Drawphone({ socket, rocketcrabMode });
drawphone.initializeAll();
drawphone.begin();

if (relativeUrl === "/archive") {
    renderArchive(drawphone);
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

            classify(canvas, true, socket);
        } else {
            classify(image, false, socket);
        }
    };

    image.onabort = (e) => onMakeAIGuessError(e, socket);
    image.onerror = (e) => onMakeAIGuessError(e, socket);
    image.crossOrigin = "anonymous";
    image.src = drawingToGuess;
});
