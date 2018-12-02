//
// Drawphone Round
//

const shuffle = require('knuth-shuffle').knuthShuffle;
const stripTags = require('striptags');

const Chain = require('./chain');
const DrawingLink = require('./link/drawinglink');
const WordLink = require('./link/wordlink');

const WordPacks = require('./words');
const words = new WordPacks();
words.loadAll();

class Round {
	constructor(number, players, timeLimit, wordPackName, onResults) {
		this.number = number;
		this.players = players;
		this.timeLimit = timeLimit;
		this.wordPackName = wordPackName;
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

	start() {

		this.finalNumOfLinks = this.players.length;

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
	}

	sendNewChains() {
		let currentChainId = 0;
		for(let player of this.players) {
			//give each player a chain of their own
			const wordToDraw = words.getRandomWord(self.wordPackName);
			const thisChain = new Chain(wordToDraw, player, currentChainId++, self.timeLimit);
			this.chains.push(thisChain);

			//sends the link, then runs the function when the player sends it back
			//  when the 'finishedLink' event is received
			thisChain.sendLastLinkToThen(player, this.finalNumOfLinks, data => {
				this.receiveLink(player, data.link, thisChain.id);
			});

		}
	}

	sendWordFirstChains() {
		let currentChainId = 0;
		for(let player of this.players) {
			//give each player a chain of their own
			const thisChain = new Chain(false, player, currentChainId++, this.timeLimit);
			this.chains.push(thisChain);

			//sends the link, then runs the function when the player sends it back
			//  when the 'finishedLink' event is received
			thisChain.sendLastLinkToThen(player, this.finalNumOfLinks, data => {
				this.receiveLink(player, data.link, thisChain.id);
			});

		}
	}

	receiveLink(player, receivedLink, chainId) {
		const chain = this.getChain(chainId);

		switch(receivedLink.type) {
		case 'drawing':
			chain.addLink(new DrawingLink(player, receivedLink.data));
			break;

		case 'word':
			chain.addLink(new WordLink(player, stripTags(receivedLink.data)));
			break;

		default:
			console.log('receivedLink.type is ' + receivedLink.type);
		}

		this.updateWaitingList();
		this.nextLinkIfEveryoneIsDone();
	}

	nextLinkIfEveryoneIsDone() {
		const listNotFinished = this.getListOfNotFinishedPlayers();
		const allFinished = listNotFinished.length === 0;
		const noneDisconnected = this.disconnectedPlayers.length === 0;

		if (allFinished && noneDisconnected) {
			//check if that was the last link
			if (this.shouldHaveThisManyLinks === this.finalNumOfLinks) {
				this.viewResults();
			} else {
				this.startNextLink();
			}
		}
	}

	startNextLink() {
		this.shouldHaveThisManyLinks++;

		//rotate the chains in place
		//  this is so that players get a chain they have not already had
		this.chains.push(this.chains.shift());

		//distribute the chains to each player
		//  players and chains will have the same length
		for (let i = 0; i < this.players.length; i++) {
			const chain = this.chains[i];
			const player = this.players[i];

			chain.lastPlayerSentTo = player.getJson();

			//sends the link, then runs the function when the player sends it back
			//  when the 'finishedLink' event is received
			chain.sendLastLinkToThen(player, this.finalNumOfLinks, data => {
				this.receiveLink(player, data.link, chain.id);
			});

		}
	}

	getChain(id) {
		return this.chains.find(chain => chain.id === id) || false;
	}

	getChainByOwnerId(ownerId) {
		return this.chains.find(chain => chain.owner.id === ownerId) || false;
	}

	viewResults() {
		const chains = this.getAllChains();

		//starts as false, and will be true every round after first round
		this.canViewLastRoundResults = true;

		this.onResults();

		this.players.forEach(function (player) {
			player.send('viewResults', {
				chains
			});

		});
	}

	findReplacementFor(player) {
		this.disconnectedPlayers.push(player.getJson());
		this.updateWaitingList();
	}

	getPlayersThatNeedToBeReplaced() {
		return this.disconnectedPlayers;
	}

	canBeReplaced(playerToReplaceId) {
		return this.disconnectedPlayers.some(player => player.id === playerToReplaceId);
	}

	replacePlayer(playerToReplaceId, newPlayer) {
		for (let i = 0; i < this.disconnectedPlayers.length; i++) {
			if (this.disconnectedPlayers[i].id === playerToReplaceId) {
				//give 'em the id of the old player
				newPlayer.id = this.disconnectedPlayers[i].id;

				//replace 'em
				const playerToReplaceIndex = this.getPlayerIndexById(playerToReplaceId);
				this.players[playerToReplaceIndex] = newPlayer;

				//delete 'em from disconnectedPlayers
				this.disconnectedPlayers.splice(i, 1);

				//check if the disconnectedPlayer (dp) had submitted their link
				const dpChain = this.getChainByLastSentPlayerId(newPlayer.id);
				const dpDidFinishTheirLink = dpChain.getLength() === this.shouldHaveThisManyLinks;
				if (dpDidFinishTheirLink) {
					//send this player to the waiting for players page
					newPlayer.socket.emit('showWaitingList', {});
				} else {
					//send them the link they need to finish
					dpChain.sendLastLinkToThen(newPlayer, this.finalNumOfLinks, data => {
						this.receiveLink(newPlayer, data.link, dpChain.id);
					});
				}
				return this.players[playerToReplaceIndex];
			}
		}
	}

	updateWaitingList() {
		this.sendToAll('updateWaitingList', {
			notFinished: this.getListOfNotFinishedPlayers(),
			disconnected: this.disconnectedPlayers
		});
	}

	getListOfNotFinishedPlayers() {
		let playerList = [];

		//check to make sure every chain is the same length
		for (let chain of this.chains) {
			const isLastPlayerSentToConnected = this.getPlayer(chain.lastPlayerSentTo.id).isConnected;
			if (chain.getLength() !== this.shouldHaveThisManyLinks && isLastPlayerSentToConnected) {
				playerList.push(chain.lastPlayerSentTo);
			}
		}

		return playerList;
	}

	getPlayer(id) {
		return this.players.find(player => player.id === id) || false;
	}

	getPlayerIndexById(id) {
		const index = this.players.findIndex(player => player.id === id);
		return typeof index === 'undefined' ? false : index;
	}

	getChainByLastSentPlayerId(id) {
		return this.chains.find(chain => chain.lastPlayerSentTo.id === id) || false;
	}

	sendToAll(event, data) {
		for(let player of this.players) {
			player.send(event, data);
		}
	}

	getAllChains() {
		return this.chains.map(chain => chain.getJson());
	}
}

module.exports = Round;
