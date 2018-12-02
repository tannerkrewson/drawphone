//
// Drawphone Chain
//

const WordLink = require('./link/wordlink');
const FirstWordLink = require('./link/firstwordlink');

// A chain is the 'chain' of drawings and words.
// A link is the individual drawing or word in the chain.
class Chain {
	constructor(firstWord, owner, id, timeLimit) {
		this.owner = owner;
		this.links = [];
		this.id = id;
		this.timeLimit = timeLimit;

		this.lastPlayerSentTo = owner.getJson();

		if (!firstWord) {
			this.addLink(new FirstWordLink(this.owner));
		} else {
			this.addLink(new WordLink(this.owner, firstWord));
		}
	}

	addLink(link) {
		this.links.push(link);
	}

	getLastLink() {
		return this.links[this.links.length - 1];
	}

	getLength() {
		if (this.links[0] && this.links[0].type === 'first-word') {
			return this.links.length - 1;
		}
		return this.links.length;
	}

	//returns true if the player has a link in this chain already
	playerHasLink(player) {
		return this.links.some(link => link.player.id === player.id);
	}

	sendLastLinkToThen(player, finalCount, next) {
		let count = this.getLength();
		if (this.links[0] && this.links[0].type === 'first-word') {
			count++;
		} else {
			finalCount--;
		}
		//sends the link, then runs the second function
		//  when the 'finishedLink' event is received
		player.sendThen('nextLink', {
			link: this.getLastLink(),
			chainId: this.id,
			count: count,
			finalCount: finalCount,
			timeLimit: this.timeLimit
		}, 'finishedLink', next);
	}

	getJson() {
		return {
			owner: this.owner.getJson(),
			links: this.links,
			id: this.id
		};
	}
}

module.exports = Chain;
