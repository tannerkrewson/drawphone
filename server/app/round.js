//
// Drawphone Round
//

var shuffle = require("knuth-shuffle").knuthShuffle;
var stripTags = require("striptags");

var Chain = require("./chain");
var AIGuessQueue = require("./ai-guess-queue");
var DrawingLink = require("./link/drawinglink");
var WordLink = require("./link/wordlink");
var { sendResultsToAwsArchive } = require("./aws-archive");

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
	this.chainShuffle = [];
	this.disconnectedPlayers = [];
	this.potentialPlayers = [];
	this.canViewLastRoundResults = false;
	this.isWordFirstGame = !this.wordPackName;

	this.startTime;

	if (this.isWordFirstGame) {
		this.shouldHaveThisManyLinks = 1;
	} else {
		//chains will already have one link
		this.shouldHaveThisManyLinks = 2;
	}

	this.finalNumOfLinks;
	this.aiGuessQueue = new AIGuessQueue(() =>
		words.getRandomWord(this.wordPackName || "Simple words (recommended)")
	);
}

Round.prototype.computeChainShuffle = function() {
	//compute how much to rotate by each round so that each player gets a
	//   random player every round
	var totalRotateAmount = [];
	for (var i = 0; i < this.chains.length; i++) {
		totalRotateAmount.push(i);
	}
	shuffle(totalRotateAmount);
	for (var i = 0; i < totalRotateAmount.length - 1; i++) {
		var rotateAmount = totalRotateAmount[i+1] - totalRotateAmount[i];
		if (rotateAmount < 0) {
			rotateAmount += totalRotateAmount.length;
		}
		this.chainShuffle.push(rotateAmount);
	}
}

Round.prototype.start = function() {
	this.finalNumOfLinks = this.players.length;
	this.aiGuessQueue.reset();

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
	this.computeChainShuffle();

	this.startTime = Date.now();
};

Round.prototype.sendNewChains = function() {
	var currentChainId = 0;
	var self = this;

	var jsonPlayers = this.showNeighbors
		? this.players.map(player => player.getJson())
		: null;

	this.players.forEach(function(player) {
		if (player.isAi) player.setAIGuessQueue(self.aiGuessQueue);

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

	var jsonPlayers = this.showNeighbors
		? this.players.map(player => player.getJson())
		: null;

	this.players.forEach(function(player) {
		if (player.isAi) player.setAIGuessQueue(self.aiGuessQueue);

		//give each player a chain of their own
		var thisChain = new Chain(
			false,
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

Round.prototype.receiveLink = function(player, receivedLink, chainId) {
	var chain = this.getChain(chainId);

	this.aiGuessQueue.playerAvailableForWork(player);

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
	var areChainsInitialized = this.players.length === this.chains.length;
	var allFinished = areChainsInitialized && listNotFinished.length === 0;
	var noneDisconnected = this.disconnectedPlayers.length === 0;

	if (allFinished && noneDisconnected) {
		this.aiGuessQueue.reset();

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
	var rotateAmount = this.chainShuffle.shift();
	for (var i = 0; i < rotateAmount; i++) {
		this.chains.push(this.chains.shift());
	}

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
	const chains = this.getAllChains();

	//starts as false, and will be true every round after first round
	this.canViewLastRoundResults = true;

	this.onResults();

	const roundTime = (Date.now() - this.startTime) / this.players.length;

	this.players.forEach(player =>
		player.send("viewResults", {
			chains,
			...(player.isHost ? { roundTime } : {})
		})
	);

	try {
		if (this.shouldArchiveResultsToAws()) {
			sendResultsToAwsArchive(chains, this.wordPackName);
		}
	} catch (error) {
		console.log("aws upload failed");
	}
};

Round.prototype.findReplacementFor = function(player, gameCode) {
	this.disconnectedPlayers.push(player.getJson());
	this.updateWaitingList();
	this.sendUpdateToPotentialPlayers(gameCode);
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

Round.prototype.replacePlayer = function(
	playerToReplaceId,
	newPlayer,
	gameCode
) {
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

			this.potentialPlayers = this.potentialPlayers.filter(
				p => p !== newPlayer
			);

			this.sendUpdateToPotentialPlayers(gameCode);

			if (newPlayer.isAi) newPlayer.setAIGuessQueue(this.aiGuessQueue);

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

Round.prototype.sendUpdateToPotentialPlayers = function(gameCode) {
	const payload = {
		gameCode,
		players: this.getPlayersThatNeedToBeReplaced()
	};
	this.potentialPlayers.forEach(player =>
		player.send("replacePlayer", payload)
	);
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

Round.prototype.shouldArchiveResultsToAws = function() {
	const isEnabled =
		process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY;
	const isNoBots = this.players.reduce((acc, cur) => acc && !cur.isAi);
	const isAllowedWordPack =
		this.wordPackName &&
		(this.wordPackName.includes("Simple") ||
			this.wordPackName.includes("Advanced"));
	return isEnabled && isNoBots && isAllowedWordPack;
};

module.exports = Round;
