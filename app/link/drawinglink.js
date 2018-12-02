//
// Drawphone DrawingLink
//

const Link = require('./link');

class DrawingLink extends Link {
	constructor(player, drawing) {
		super(player, drawing);
		this.type = 'drawing';
	}
}

module.exports = DrawingLink;
