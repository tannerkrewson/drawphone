module.exports = function(app) {
	var dp = app.drawphone;
	var stripTags = require("striptags");

	app.io.on("connection", function(socket) {
		var thisGame;
		var thisUser;

		socket.on("joinGame", onJoinGame);

		socket.on("newGame", function(data) {
			if (dp.locked) {
				sendLockedError(socket, dp.minutesUntilRestart);
				return;
			}

			var theName = stripTags(data.name);
			if (theName.length > 2 && theName.length <= 16) {
				thisGame = dp.newGame();
				thisUser = thisGame.addPlayer(theName, socket);
				socket.emit("joinGameRes", {
					success: true,
					game: thisGame.getJsonGame(),
					you: thisUser.getJson()
				});
			} else {
				socket.emit("joinGameRes", {
					success: false,
					error: "Name too short/long"
				});
			}
		});

		socket.on("tryStartGame", function(data) {
			if (!thisUser || !thisGame) return;

			if (dp.locked) {
				sendLockedError(socket, dp.minutesUntilRestart);
				return;
			}

			if (data.timeLimit !== false && thisUser.isAdmin) {
				thisGame.startNewRound(
					data.timeLimit,
					data.wordPackName,
					data.showNeighbors
				);
			}
		});

		socket.on("tryReplacePlayer", function(data) {
			if (!thisGame || !thisGame.currentRound) return;

			var thisRound = thisGame.currentRound;
			var toReplaceId = data.playerToReplace.id;
			if (thisUser && thisRound.canBeReplaced(toReplaceId)) {
				thisUser = thisRound.replacePlayer(toReplaceId, thisUser);
				thisGame.initPlayer(thisUser);
				thisRound.updateWaitingList();
				thisRound.nextLinkIfEveryoneIsDone();
			} else {
				//give the user semi-useful error message,
				//  instead of literally nothing happening
				onJoinGame({
					code: thisGame.code,
					name: thisUser.name
				});
			}
		});

		socket.on("kickPlayer", function(data) {
			if (!thisGame || !thisUser) return;

			var idToKick = data.playerToKick.id;
			var playerToKick = thisGame.getPlayer(idToKick);
			if (thisUser.isAdmin && playerToKick) {
				//this will simulate the 'disconnect' event, and run all of the
				//	methods that were tied into that in the initPlayer function
				playerToKick.socket.disconnect();
			}
		});

		function onJoinGame(data) {
			thisGame = dp.findGame(data.code);
			var theName = stripTags(data.name);
			if (!thisGame) {
				socket.emit("joinGameRes", {
					success: false,
					error: "Game not found"
				});
			} else if (theName.length <= 2 || theName.length > 16) {
				socket.emit("joinGameRes", {
					success: false,
					error: "Name too short/long"
				});
			} else {
				if (!thisGame.inProgress) {
					thisUser = thisGame.addPlayer(theName, socket);
					socket.emit("joinGameRes", {
						success: true,
						game: thisGame.getJsonGame(),
						you: thisUser.getJson()
					});
				} else if (
					thisGame.currentRound.disconnectedPlayers.length > 0
				) {
					thisUser = thisGame.newPlayer(theName, socket);
					socket.emit("replacePlayer", {
						gameCode: thisGame.code,
						players: thisGame.currentRound.getPlayersThatNeedToBeReplaced()
					});
				} else {
					socket.emit("joinGameRes", {
						success: false,
						error: "Game in progress"
					});
				}
			}
		}
	});
};

const sendLockedError = (socket, minutesUntilRestart) => {
	socket.emit("joinGameRes", {
		success: false,
		error: "Oopsie woopsie",
		content:
			"The Drawphone server is pending an update, and will be restarted " +
			getTimeLeft(minutesUntilRestart) +
			'. Try again then! <div style="font-size: .75em;margin-top:.8em">' +
			"If you're the techy type, check the update status " +
			'<a href="https://github.com/tannerkrewson/drawphone/actions" ' +
			'target="_blank" rel="noopener noreferrer">here</a>.</div>'
	});
};

const getTimeLeft = minutes => {
	if (minutes <= 0) return "momentarily";
	return "in " + minutes + " minute" + (parseInt(minutes) !== 1 ? "s" : "");
};
