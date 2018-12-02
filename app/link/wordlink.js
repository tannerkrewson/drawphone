//
// Drawphone WordLink
//

const Link = require('./link');

class WordLink extends Link {
	constructor(player, word) {
		super(player, word);
		this.type = 'word';
	}
}

module.exports = WordLink;
