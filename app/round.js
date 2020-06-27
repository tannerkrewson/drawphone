//
// Drawphone Round
//

var shuffle = require("knuth-shuffle").knuthShuffle;
var stripTags = require("striptags");

var Chain = require("./chain");
var DrawingLink = require("./link/drawinglink");
var WordLink = require("./link/wordlink");

var WordPacks = require("./words");
var words = new WordPacks();
words.loadAll();

function Round(
	number,
	players,
	timeLimit,
	wordPackName,
	showNeighbors,
	onResults
) {
	this.number = number;
	this.players = players;
	this.timeLimit = timeLimit;
	this.wordPackName = wordPackName;
	this.showNeighbors = showNeighbors;
	this.onResults = onResults;
	this.chains = [];
	this.disconnectedPlayers = [];
	this.canViewLastRoundResults = false;
	this.isWordFirstGame = !this.wordPackName;

	if (this.isWordFirstGame) {
		this.shouldHaveThisManyLinks = 1;
	} else {
		//chains will already have one link
		this.shouldHaveThisManyLinks = 2;
	}

	this.finalNumOfLinks;
}

Round.prototype.start = function() {
	this.finalNumOfLinks = this.players.length;

	// demo mode
	if (this.players.length === 1) {
		this.finalNumOfLinks = 6;
	}

	//each player will have to complete one link for how many players there are
	//  the final number of links each chain should have at the end of this
	//  round is number of players + 1, because each chain has an extra link
	//  for the original word
	if (!this.isWordFirstGame) {
		this.finalNumOfLinks++;
	}

	//contrary to the above comment, i now want every chain to end in a word
	// so that the Start to End results box always starts and ends works correctly.
	//to do this, i take away on link if there is an even number of final links
	if (this.finalNumOfLinks % 2 === 0) {
		this.finalNumOfLinks--;
	}

	//shuffle the player list in place
	shuffle(this.players);

	if (!this.isWordFirstGame) {
		this.sendNewChains();
	} else {
		this.sendWordFirstChains();
	}
};

Round.prototype.sendNewChains = function() {
	var currentChainId = 0;
	var self = this;

	var jsonPlayers = this.showNeighbors
		? this.players.map(player => player.getJson())
		: null;

	this.players.forEach(function(player) {
		//give each player a chain of their own
		var wordToDraw = words.getRandomWord(self.wordPackName);
		var thisChain = new Chain(
			wordToDraw,
			player,
			currentChainId++,
			self.timeLimit,
			self.showNeighbors,
			jsonPlayers
		);
		self.chains.push(thisChain);

		//sends the link, then runs the function when the player sends it back
		//  when the 'finishedLink' event is received
		thisChain.sendLastLinkToThen(player, self.finalNumOfLinks, function(
			data
		) {
			self.receiveLink(player, data.link, thisChain.id);
		});
	});
};

Round.prototype.sendWordFirstChains = function() {
	var currentChainId = 0;
	var self = this;
	this.players.forEach(function(player) {
		//give each player a chain of their own
		var thisChain = new Chain(
			false,
			player,
			currentChainId++,
			self.timeLimit
		);
		self.chains.push(thisChain);

		//sends the link, then runs the function when the player sends it back
		//  when the 'finishedLink' event is received
		thisChain.sendLastLinkToThen(player, self.finalNumOfLinks, function(
			data
		) {
			self.receiveLink(player, data.link, thisChain.id);
		});
	});
};

Round.prototype.receiveLink = function(player, receivedLink, chainId) {
	var chain = this.getChain(chainId);

	if (receivedLink.type === "drawing") {
		chain.addLink(new DrawingLink(player, receivedLink.data));
	} else if (receivedLink.type === "word") {
		chain.addLink(new WordLink(player, stripTags(receivedLink.data)));
	} else {
		console.log("receivedLink.type is " + receivedLink.type);
	}

	this.updateWaitingList();
	this.nextLinkIfEveryoneIsDone();
};

Round.prototype.nextLinkIfEveryoneIsDone = function() {
	var listNotFinished = this.getListOfNotFinishedPlayers();
	var allFinished = listNotFinished.length === 0;
	var noneDisconnected = this.disconnectedPlayers.length === 0;

	if (allFinished && noneDisconnected) {
		//check if that was the last link
		if (this.shouldHaveThisManyLinks === this.finalNumOfLinks) {
			this.viewResults();
		} else {
			this.startNextLink();
		}
	}
};

Round.prototype.startNextLink = function() {
	this.shouldHaveThisManyLinks++;

	//rotate the chains in place
	//  this is so that players get a chain they have not already had
	this.chains.push(this.chains.shift());

	//distribute the chains to each player
	//  players and chains will have the same length
	var self = this;
	for (var i = 0; i < this.players.length; i++) {
		var thisChain = this.chains[i];
		var thisPlayer = this.players[i];

		thisChain.lastPlayerSentTo = thisPlayer.getJson();

		//sends the link, then runs the function when the player sends it back
		//  when the 'finishedLink' event is received
		(function(chain, player) {
			chain.sendLastLinkToThen(player, self.finalNumOfLinks, function(
				data
			) {
				self.receiveLink(player, data.link, chain.id);
			});
		})(thisChain, thisPlayer);
	}
};

Round.prototype.getChain = function(id) {
	for (var i = 0; i < this.chains.length; i++) {
		if (this.chains[i].id === id) {
			return this.chains[i];
		}
	}
	return false;
};

Round.prototype.getChainByOwnerId = function(ownerId) {
	for (var i = 0; i < this.chains.length; i++) {
		if (this.chains[i].owner.id === ownerId) {
			return this.chains[i];
		}
	}
	return false;
};

Round.prototype.viewResults = function() {
	var chains = this.getAllChains();

	//starts as false, and will be true every round after first round
	this.canViewLastRoundResults = true;

	this.onResults();

	this.players.forEach(function(player) {
		player.send("viewResults", {
			chains
		});
	});
};

Round.prototype.findReplacementFor = function(player) {
	this.disconnectedPlayers.push(player.getJson());
	this.updateWaitingList();
};

Round.prototype.getPlayersThatNeedToBeReplaced = function() {
	return this.disconnectedPlayers;
};

Round.prototype.canBeReplaced = function(playerToReplaceId) {
	for (var i = 0; i < this.disconnectedPlayers.length; i++) {
		if (this.disconnectedPlayers[i].id === playerToReplaceId) {
			return true;
		}
	}
	return false;
};

Round.prototype.replacePlayer = function(playerToReplaceId, newPlayer) {
	for (var i = 0; i < this.disconnectedPlayers.length; i++) {
		if (this.disconnectedPlayers[i].id === playerToReplaceId) {
			//give 'em the id of the old player
			newPlayer.id = this.disconnectedPlayers[i].id;

			//replace 'em
			var playerToReplaceIndex = this.getPlayerIndexById(
				playerToReplaceId
			);
			this.players[playerToReplaceIndex] = newPlayer;

			//delete 'em from disconnectedPlayers
			this.disconnectedPlayers.splice(i, 1);

			//check if the disconnectedPlayer (dp) had submitted their link
			var dpChain = this.getChainByLastSentPlayerId(newPlayer.id);
			var dpDidFinishTheirLink =
				dpChain.getLength() === this.shouldHaveThisManyLinks;
			if (dpDidFinishTheirLink) {
				//send this player to the waiting for players page
				newPlayer.socket.emit("showWaitingList", {});
			} else {
				//send them the link they need to finish
				var self = this;
				dpChain.sendLastLinkToThen(
					newPlayer,
					this.finalNumOfLinks,
					function(data) {
						self.receiveLink(newPlayer, data.link, dpChain.id);
					}
				);
			}
			return this.players[playerToReplaceIndex];
		}
	}
};

Round.prototype.updateWaitingList = function() {
	this.sendToAll("updateWaitingList", {
		notFinished: this.getListOfNotFinishedPlayers(),
		disconnected: this.disconnectedPlayers
	});
};

Round.prototype.getListOfNotFinishedPlayers = function() {
	var playerList = [];

	//check to make sure every chain is the same length
	for (var i = 0; i < this.chains.length; i++) {
		var thisChain = this.chains[i];
		var isLastPlayerSentToConnected = this.getPlayer(
			thisChain.lastPlayerSentTo.id
		).isConnected;
		if (
			thisChain.getLength() !== this.shouldHaveThisManyLinks &&
			isLastPlayerSentToConnected
		) {
			playerList.push(thisChain.lastPlayerSentTo);
		}
	}

	return playerList;
};

Round.prototype.getPlayer = function(id) {
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i].id === id) {
			return this.players[i];
		}
	}
	return false;
};

Round.prototype.getPlayerIndexById = function(id) {
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i].id === id) {
			return i;
		}
	}
	return false;
};

Round.prototype.getChainByLastSentPlayerId = function(id) {
	for (var i = 0; i < this.chains.length; i++) {
		if (this.chains[i].lastPlayerSentTo.id === id) {
			return this.chains[i];
		}
	}
	return false;
};

Round.prototype.sendToAll = function(event, data) {
	this.players.forEach(function(player) {
		player.send(event, data);
	});
};

Round.prototype.getAllChains = function() {
	var newChains = [];
	this.chains.forEach(function(chain) {
		newChains.push(chain.getJson());
	});
	return newChains;
};

module.exports = Round;
