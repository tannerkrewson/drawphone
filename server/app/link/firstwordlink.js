//
// Drawphone FirstWordLink
//

var Link = require("./link");

function FirstWordLink(player) {
	Link.call(this, player, false);
	this.type = "first-word";
}
FirstWordLink.prototype = Object.create(Link.prototype);

module.exports = FirstWordLink;
