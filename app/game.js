//
// Drawphone Game
//

var Round = require('./round');
var Player = require('./player');

function Game(code, onEmpty) {
	this.code = code;
	this.onEmpty = onEmpty;
	this.players = [];
	this.admin;
	this.inProgress = false;
	this.viewingResults = false;
	this.currentRound;

	this.currentId = 1;
	this.currentRoundNum = 1;
}

Game.prototype.newPlayer = function (name, socket) {
	return new Player(name, socket, this.getNextId());
};

Game.prototype.addPlayer = function (name, socket) {
	var newPlayer = this.newPlayer(name, socket);
	this.initPlayer(newPlayer);
	this.players.push(newPlayer);
	this.sendUpdatedPlayersList();
	return newPlayer;
};

Game.prototype.initPlayer = function (newPlayer) {
	//if this is the first user, make them admin
	if (this.players.length === 0) {
		this.admin = newPlayer;
		newPlayer.makeAdmin();
	}

	//when this player disconnects, remove them from this game
	var self = this;
	newPlayer.socket.on('disconnect', function () {
		newPlayer.isConnected = false;
		if (self.inProgress) {
			self.currentRound.findReplacementFor(newPlayer);
		} else {
			self.removePlayer(newPlayer.id);
		}
		self.onPlayerDisconnect(newPlayer);
		self.sendUpdatedPlayersList();
	});
};

Game.prototype.onPlayerDisconnect = function (oldPlayer) {
	//if the player was admin
	if (oldPlayer.id === this.admin.id) {
		//find the first connected player to be admin
		for (var i = 0; i < this.players.length; i++) {
			var thisPlayer = this.players[i];
			if (thisPlayer.isConnected) {
				this.admin = thisPlayer;
				thisPlayer.makeAdmin();
				break;
			}
		}
	}

	//if someone leaves while viewing results, we need to check again
	//  or everyone will get stuck on the Thanks for playing screen
	if (this.viewingResults) {
		this.currentRound.end();
	}

	var allPlayersDisconnected = true;
	for (var j = 0; j < this.players.length; j++) {
		if (this.players[j].isConnected) {
			allPlayersDisconnected = false;
			break;
		}
	}
	if (allPlayersDisconnected) {
		this.onEmpty();
	}
};

Game.prototype.removePlayer = function (id) {
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

Game.prototype.getPlayer = function (id) {
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i].id === id) {
			return this.players[i];
		}
	}
	return false;
};

Game.prototype.getNextId = function () {
	return this.currentId++;
};

Game.prototype.getNextRoundNum = function () {
	return this.currentRoundNum++;
};

Game.prototype.getJsonGame = function () {
	var players = [];
	this.players.forEach(function (player) {
		players.push(player.getJson());
	});

	var jsonGame = {
		code: this.code,
		players,
		inProgress: this.inProgress
	};
	return jsonGame;
};

Game.prototype.sendUpdatedPlayersList = function () {
	this.sendToAll('updatePlayerList', this.getJsonGame().players);
};

Game.prototype.sendToAll = function (event, data) {
	var self = this;
	this.players.forEach(function (player) {
		player.socket.emit(event, {
			success: true,
			gameCode: self.code,
			player: player.getJson(),
			data
		});
	});
};

Game.prototype.startNewRound = function (timeLimit) {
	this.inProgress = true;

	var self = this;
	this.currentRound = new Round(this.getNextRoundNum(), this.players, timeLimit, function () {
		//ran when results are sent
		self.inProgress = false;
		self.viewingResults = true;
	}, function () {
		//ran when everyone is done viewing results
		self.sendUpdatedPlayersList();
		self.viewingResults = false;
	});

	this.currentRound.start();
};

module.exports = Game;
