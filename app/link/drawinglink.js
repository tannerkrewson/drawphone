//
// Drawphone DrawingLink
//

var Link = require("./link");

function DrawingLink(player, drawing) {
	Link.call(this, player, drawing);
	this.type = "drawing";
}
DrawingLink.prototype = Object.create(Link.prototype);

module.exports = DrawingLink;
