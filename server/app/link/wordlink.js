//
// Drawphone WordLink
//

var Link = require("./link");

function WordLink(player, word) {
	Link.call(this, player, word);
	this.type = "word";
}
WordLink.prototype = Object.create(Link.prototype);

module.exports = WordLink;
