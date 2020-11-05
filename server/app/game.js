//
// Drawphone Game
//

var Round = require("./round");
var Player = require("./player");
var PlayerAI = require("./player-ai");

const BOT_NAMES = [
	"🤖 Garry-bot",
	"🤖 Jerry-bot",
	"🤖 Larry-bot",
	"🤖 Terry-bot",
	"🤖 Barry-bot",
	"🤖 Mary-bot",
	"🤖 Fairy-bot",
	"🤖 Sperry-bot",
	"🤖 Carrie-bot",
	"🤖 Dairy-bot",
	"🤖 Hairy-bot",
	"🤖 Airy-bot",
	"🤖 Perry-bot",
	"🤖 Query-bot",
	"🤖 Very-bot",
	"🤖 Cherry-bot",
	"🤖 Prairie-bot",
	"🤖 Scary-bot"
];

function Game(code, onEmpty) {
	this.code = code;
	this.onEmpty = onEmpty;
	this.players = [];
	this.host;
	this.inProgress = false;
	this.currentRound;

	this.currentId = 1;
	this.botCount = 0;
	this.currentRoundNum = 1;
	this.timeOfLastAction = new Date();

	setTimeout(() => this.deleteGameIfEmpty(), 60 * 1000);
}

Game.prototype.newPlayer = function(name, socket) {
	return new Player(name, socket, this.getNextId());
};

Game.prototype.newBotPlayer = function(customName) {
	if (this.botCount >= BOT_NAMES.length && !customName) return;

	this.botCount++;

	return new PlayerAI(
		customName || BOT_NAMES[this.botCount],
		undefined,
		this.getNextId()
	);
};

Game.prototype.addPlayer = function(name, socket) {
	var newPlayer = this.newPlayer(name, socket);
	this.initPlayer(newPlayer);

	this.players.push(newPlayer);
	this.sendUpdatedPlayersList();
	return newPlayer;
};

Game.prototype.addBotPlayer = function() {
	const newPlayer = this.newBotPlayer();

	if (!newPlayer) return false;

	this.players.push(newPlayer);
	this.sendUpdatedPlayersList();
	return newPlayer;
};

Game.prototype.removeBotPlayer = function() {
	for (let i = this.players.length - 1; i >= 0; i--) {
		const { id, isAi } = this.players[i];
		if (isAi) {
			this.removePlayer(id);
			this.botCount--;
			this.sendUpdatedPlayersList();
			break;
		}
	}
};

Game.prototype.sendUpdatedSettings = function(setting) {
	this.sendToAll("updateSettings", {
		setting,
		canViewLastRoundResults:
			this.currentRound && this.currentRound.canViewLastRoundResults
	});
};

Game.prototype.initPlayer = function(newPlayer) {
	//if this is the first user, make them host
	if (this.players.length === 0) {
		this.host = newPlayer;
		newPlayer.makeHost();
	}

	//when this player disconnects, remove them from this game
	var self = this;
	newPlayer.socket.on("disconnect", function() {
		newPlayer.isConnected = false;
		if (self.inProgress) {
			self.currentRound.findReplacementFor(newPlayer);
		} else {
			self.removePlayer(newPlayer.id);
		}
		self.onPlayerDisconnect(newPlayer);
		self.sendUpdatedPlayersList();
	});

	newPlayer.socket.on("viewPreviousResults", function() {
		if (self.currentRound && self.currentRound.canViewLastRoundResults) {
			newPlayer.send("viewResults", {
				chains: self.currentRound.getAllChains(),
				isViewPreviousResults: true
			});
		}
	});
};

Game.prototype.onPlayerDisconnect = function(oldPlayer) {
	const noHost = !this.host;
	const playerWasHost = this.host && oldPlayer.id === this.host.id;

	if (playerWasHost || noHost) {
		this.host = undefined;
		//find the first connected player to be host
		for (var i = 0; i < this.players.length; i++) {
			var thisPlayer = this.players[i];
			if (thisPlayer.isConnected && !thisPlayer.isAi) {
				this.host = thisPlayer;
				thisPlayer.makeHost();
				break;
			}
		}
	}

	this.deleteGameIfEmpty();
};

Game.prototype.deleteGameIfEmpty = function() {
	if (this.code === "ffff") return;

	var allPlayersDisconnected = true;
	for (var j = 0; j < this.players.length; j++) {
		if (this.players[j].isConnected && !this.players[j].isAi) {
			allPlayersDisconnected = false;
			break;
		}
	}
	if (allPlayersDisconnected) {
		this.onEmpty();
	}
};

Game.prototype.removePlayer = function(id) {
	var player = this.getPlayer(id);

	var index = this.players.indexOf(player);
	if (index > -1) {
		this.players.splice(index, 1);
	}

	//if there are no players left
	if (this.players.length === 0) {
		this.onEmpty();
	}
};

Game.prototype.getPlayer = function(id) {
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i].id === id) {
			return this.players[i];
		}
	}
	return false;
};

Game.prototype.getNextId = function() {
	return this.currentId++;
};

Game.prototype.getNextRoundNum = function() {
	return this.currentRoundNum++;
};

Game.prototype.getJsonGame = function() {
	var players = [];
	this.players.forEach(function(player) {
		players.push(player.getJson());
	});

	var jsonGame = {
		code: this.code,
		players,
		inProgress: this.inProgress,
		canViewLastRoundResults:
			this.currentRound !== undefined &&
			this.currentRound.canViewLastRoundResults
	};
	return jsonGame;
};

Game.prototype.sendUpdatedPlayersList = function() {
	this.sendToAll("updatePlayerList", {
		players: this.getJsonGame().players,
		canViewLastRoundResults:
			this.currentRound !== undefined &&
			this.currentRound.canViewLastRoundResults
	});
};

Game.prototype.sendToAll = function(event, data) {
	var self = this;
	this.players.forEach(function(player) {
		player.socket.emit(event, {
			success: true,
			event: event,
			gameCode: self.code,
			player: player.getJson(),
			data
		});
	});
};

Game.prototype.startNewRound = function(
	timeLimit,
	wordPackName,
	showNeighbors
) {
	this.inProgress = true;

	var self = this;
	this.currentRound = new Round(
		this.getNextRoundNum(),
		this.players,
		timeLimit,
		wordPackName,
		showNeighbors,
		function() {
			//ran when results are sent
			self.inProgress = false;
			self.sendUpdatedPlayersList(); //this makes sure the View Last Round Results button shows up
			self.timeOfLastAction = new Date();
		}
	);

	this.currentRound.start();
};

module.exports = Game;
