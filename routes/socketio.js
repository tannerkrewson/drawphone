module.exports = app => {

	const dp = app.drawphone;
	const stripTags = require('striptags');

	app.io.on('connection', socket => {

		let thisGame;
		let thisUser;

		socket.on('joinGame', onJoinGame);

		socket.on('newGame', data => {
			const theName = stripTags(data.name);
			if (theName.length > 2 && theName.length <= 16) {
				thisGame = dp.newGame();
				thisUser = thisGame.addPlayer(theName, socket);
				socket.emit('joinGameRes', {
					success: true,
					game: thisGame.getJsonGame(),
					you: thisUser.getJson()
				});
			} else {
				socket.emit('joinGameRes', {
					success: false,
					error: 'Name too short/long'
				});
			}
		});

		socket.on('tryStartGame', data => {
			if (data.timeLimit !== false && thisUser.isAdmin) {
				thisGame.startNewRound(data.timeLimit, data.wordPackName);
			}
		});

		socket.on('tryReplacePlayer', data => {
			if (!thisGame || !thisGame.currentRound) return;

			const thisRound = thisGame.currentRound;
			const toReplaceId = data.playerToReplace.id;
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

		socket.on('kickPlayer', function(data) {
			const idToKick = data.playerToKick.id;
			const playerToKick = thisGame.getPlayer(idToKick);
			if (thisUser.isAdmin && playerToKick) {
				//this will simulate the 'disconnect' event, and run all of the
				//	methods that were tied into that in the initPlayer function
				playerToKick.socket.disconnect();
			}
		});

		function onJoinGame(data) {
			thisGame = dp.findGame(data.code);
			const theName = stripTags(data.name);
			if (!thisGame) {
				socket.emit('joinGameRes', {
					success: false,
					error: 'Game not found'
				});
			} else if (theName.length <= 2 || theName.length > 16) {
				socket.emit('joinGameRes', {
					success: false,
					error: 'Name too short/long'
				});
			} else {
				if (!thisGame.inProgress) {
					thisUser = thisGame.addPlayer(theName, socket);
					socket.emit('joinGameRes', {
						success: true,
						game: thisGame.getJsonGame(),
						you: thisUser.getJson()
					});
				} else if (thisGame.currentRound.disconnectedPlayers.length > 0) {
					thisUser = thisGame.newPlayer(theName, socket);
					socket.emit('replacePlayer', {
						gameCode: thisGame.code,
						players: thisGame.currentRound.getPlayersThatNeedToBeReplaced()
					});
				} else {
					socket.emit('joinGameRes', {
						success: false,
						error: 'Game in progress'
					});
				}
			}
		}

	});

};
