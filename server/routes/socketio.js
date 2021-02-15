import stripTags from "striptags";

export default ({ drawphone, io }) => {
    const dp = drawphone;

    io.on("connection", (socket) => {
        let thisGame;
        let thisUser;

        const safeSon = (event, action) =>
            socket.on(event, (...params) => {
                try {
                    action(...params);
                } catch (e) {
                    console.error(e);
                }
            });

        safeSon("joinGame", ({ code, name }) => {
            thisGame = dp.findGame(code);
            const theName = stripTags(name);
            if (!thisGame) {
                socket.emit("joinGameRes", {
                    success: false,
                    error: "Game not found",
                });
            } else if (theName.length <= 2 || theName.length > 16) {
                socket.emit("joinGameRes", {
                    success: false,
                    error: "Name too short/long",
                });
            } else {
                const thisRound = thisGame.currentRound;
                if (!thisGame.inProgress) {
                    thisUser = thisGame.addPlayer(theName, socket);
                    socket.emit("joinGameRes", {
                        success: true,
                        game: thisGame.getJsonGame(),
                        you: thisUser.getJson(),
                    });
                } else {
                    thisUser = thisGame.newPlayer(theName, socket);
                    thisRound.potentialPlayers.push(thisUser);
                    thisRound.sendUpdateToPotentialPlayers(thisGame.code);
                }
            }
        });

        safeSon("newGame", ({ name }) => {
            if (dp.locked) {
                sendLockedError(socket, dp.minutesUntilRestart);
                return;
            }

            const theName = stripTags(name);
            if (theName.length > 2 && theName.length <= 16) {
                thisGame = dp.newGame();
                thisUser = thisGame.addPlayer(theName, socket);
                socket.emit("joinGameRes", {
                    success: true,
                    game: thisGame.getJsonGame(),
                    you: thisUser.getJson(),
                });
            } else {
                socket.emit("joinGameRes", {
                    success: false,
                    error: "Name too short/long",
                });
            }
        });

        safeSon(
            "tryStartGame",
            ({ timeLimit, wordPackName, showNeighbors, turnLimit }) => {
                if (!thisUser || !thisGame) return;

                if (dp.locked) {
                    sendLockedError(socket, dp.minutesUntilRestart);
                    return;
                }

                if (timeLimit !== false && thisUser.isHost) {
                    thisGame.startNewRound(
                        timeLimit,
                        wordPackName,
                        showNeighbors,
                        turnLimit
                    );
                }
            }
        );

        safeSon("tryReplacePlayer", ({ playerToReplace }) => {
            const thisRound = thisGame.currentRound;

            if (!thisGame || !thisRound) return;

            const toReplaceId = playerToReplace.id;

            if (thisUser && thisRound.canBeReplaced(toReplaceId)) {
                thisUser = thisRound.replacePlayer(
                    toReplaceId,
                    thisUser,
                    thisGame.code
                );
                thisGame.initPlayer(thisUser);
                thisRound.updateWaitingList();
                thisRound.nextLinkIfEveryoneIsDone();
            } else {
                thisRound.sendUpdateToPotentialPlayers(thisGame.code);
            }
        });

        safeSon("kickPlayer", (data) => {
            if (!thisGame || !thisUser) return;

            const idToKick = data.playerToKick.id;
            const playerToKick = thisGame.getPlayer(idToKick);
            if (thisUser.isHost && playerToKick) {
                //this will simulate the 'disconnect' event, and run all of the
                //	methods that were tied into that in the initPlayer function
                playerToKick.socket.disconnect();
            }
        });

        safeSon("replacePlayerWithBot", ({ playerToReplaceWithBot }) => {
            const isInGame = thisGame && thisGame.currentRound;
            const isHost = thisUser && thisUser.isHost;
            if (!isInGame || !isHost) return;

            const oldPlayer = playerToReplaceWithBot;
            const botPlayer = thisGame.newBotPlayer(
                `👻 The Ghost of ${oldPlayer.name}`
            );
            const thisRound = thisGame.currentRound;

            if (botPlayer && thisRound.canBeReplaced(oldPlayer.id)) {
                thisRound.replacePlayer(oldPlayer.id, botPlayer);
                thisRound.updateWaitingList();
                thisRound.nextLinkIfEveryoneIsDone();
            }
        });

        safeSon("hostUpdatedSettings", (setting) => {
            if (!thisGame || !thisUser) return;

            if (thisUser.isHost) {
                thisGame.sendUpdatedSettings(setting);
            }
        });

        safeSon("addBotPlayer", () => {
            if (!thisGame || !thisUser) return;

            if (thisUser.isHost) {
                thisGame.addBotPlayer();
            }
        });

        safeSon("removeBotPlayer", () => {
            if (!thisGame || !thisUser) return;

            if (thisUser.isHost) {
                thisGame.removeBotPlayer();
            }
        });
    });
};

const sendLockedError = (socket, minutesUntilRestart) => {
    socket.emit("joinGameRes", {
        success: false,
        error: "Oopsie woopsie",
        content: `The Drawphone server is pending an update, and will be restarted ${getTimeLeft(
            minutesUntilRestart
        )}. Try again then! <div style="font-size: .75em;margin-top:.8em">If you're the techy type, check the update status <a href="https://github.com/tannerkrewson/drawphone/actions" target="_blank" rel="noopener noreferrer">here</a>.</div>`,
    });
};

const getTimeLeft = (minutes) => {
    if (minutes <= 0) return "momentarily";
    return `in ${minutes} minute${parseInt(minutes) !== 1 ? "s" : ""}`;
};
