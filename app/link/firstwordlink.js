//
// Drawphone FirstWordLink
//

const Link = require('./link');

class FirstWordLink extends Link {
	constructor(player) {
		super(player, false);
		this.type = 'first-word';
	}
}

module.exports = FirstWordLink;
