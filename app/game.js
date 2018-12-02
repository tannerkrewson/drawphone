//
// Drawphone Game
//

const Round = require('./round');
const Player = require('./player');

class Game {
	constructor(code, onEmpty) {
		this.code = code;
		this.onEmpty = onEmpty;
		this.players = [];
		this.admin;
		this.inProgress = false;
		this.currentRound;

		this.currentId = 1;
		this.currentRoundNum = 1;
	}

	newPlayer(name, socket) {
		return new Player(name, socket, this.getNextId());
	}

	addPlayer(name, socket) {
		const newPlayer = this.newPlayer(name, socket);
		this.initPlayer(newPlayer);
		this.players.push(newPlayer);
		this.sendUpdatedPlayersList();
		return newPlayer;
	}

	initPlayer(newPlayer) {
		//if this is the first user, make them admin
		if (this.players.length === 0) {
			this.admin = newPlayer;
			newPlayer.makeAdmin();
		}

		//when this player disconnects, remove them from this game
		newPlayer.socket.on('disconnect', () => {
			newPlayer.isConnected = false;
			if (this.inProgress) {
				this.currentRound.findReplacementFor(newPlayer);
			} else {
				this.removePlayer(newPlayer.id);
			}
			this.onPlayerDisconnect(newPlayer);
			this.sendUpdatedPlayersList();
		});

		newPlayer.socket.on('viewPreviousResults', () => {
			if (this.currentRound && this.currentRound.canViewLastRoundResults) {
				newPlayer.send('viewResults', {
					chains: this.currentRound.getAllChains()
				});
			}
		});
	}

	onPlayerDisconnect(oldPlayer) {
		//if the player was admin
		if (oldPlayer.id === this.admin.id) {
			//find the first connected player to be admin
			for (let thisPlayer of this.players) {
				if (thisPlayer.isConnected) {
					this.admin = thisPlayer;
					thisPlayer.makeAdmin();
					break;
				}
			}
		}

		const allPlayersDisconnected = !this.players.some(player => player.isConnected);

		if (allPlayersDisconnected) {
			this.onEmpty();
		}
	}

	removePlayer(id) {
		const player = this.getPlayer(id);

		const index = this.players.indexOf(player);
		if (index > -1) {
			this.players.splice(index, 1);
		}

		//if there are no players left
		if (this.players.length === 0) {
			this.onEmpty();
		}
	}

	getPlayer(id) {
		this.players.find(player => player.id === id) || false;
	}

	getNextId() {
		return this.currentId++;
	}

	getNextRoundNum() {
		return this.currentRoundNum++;
	}

	getJsonGame() {
		const players = this.players.map(player => player.getJson());

		const jsonGame = {
			code: this.code,
			players,
			inProgress: this.inProgress,
			canViewLastRoundResults: (typeof this.currentRound !== 'undefined') && this.currentRound.canViewLastRoundResults
		};
		return jsonGame;
	}

	sendUpdatedPlayersList() {
		this.sendToAll('updatePlayerList', {
			players: this.getJsonGame().players,
			canViewLastRoundResults: (typeof this.currentRound !== 'undefined') && this.currentRound.canViewLastRoundResults
		});
	}

	sendToAll(event, data) {
		this.players.forEach(player => {
			player.socket.emit(event, {
				success: true,
				gameCode: this.code,
				player: player.getJson(),
				data
			});
		});
	}

	startNewRound(timeLimit, wordPackName) {
		this.inProgress = true;

		this.currentRound = new Round(this.getNextRoundNum(), this.players, timeLimit, wordPackName, () => {
			//ran when results are sent
			this.inProgress = false;
			this.sendUpdatedPlayersList(); //this makes sure the View Last Round Results button shows up
		});

		this.currentRound.start();
	}
}

module.exports = Game;
