import swal from "bootstrap-sweetalert";
import ml5 from "ml5";

import { HIDDEN } from "../shared/enums.js";

/* global $, ga */

export function hideAll() {
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

export function showElement(jq) {
    $(jq).removeClass(HIDDEN);
}

// http://stackoverflow.com/questions/20618355/the-simplest-possible-javascript-countdown-timer
export function startTimer(duration, onTick) {
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

export const promptKickPlayer = (tappedPlayer, socket) => {
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

export const promptReplaceBot = (tappedPlayer, socket) => {
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

export function classify(image, isDoodle, socket) {
    const model = isDoodle ? "DoodleNet" : "MobileNet";

    console.log("running", model);

    const classifier = ml5.imageClassifier(model, () =>
        classifier.classify(image, 1, (err, results) => {
            if (err) {
                onMakeAIGuessError(err);
                return;
            }

            const [firstPrediction] = results;
            const { label /*, confidence */ } = firstPrediction;

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

export function onMakeAIGuessError(e, socket) {
    console.error(e);
    socket.emit("AIGuessResult", {
        success: false,
    });
}
