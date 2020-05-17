//
// Drawphone Words
//

var fs = require("fs");

const PACK_NAMES = [
	"Pictionary (recommended)",
	"Telestrations",
	"Cards Against Humanity (18+)",
	"Animals",
	"Adjectives",
	"Verbs"
];

function WordPacks() {
	this.wordPacks = [];
}

WordPacks.prototype.loadAll = function() {
	var self = this;
	//reads each txt file in the words folder
	//the name of the file will be the name of the pack
	PACK_NAMES.forEach(function(packName) {
		var pathToTxt = __dirname + "/../words/" + packName + ".txt";
		var arrayOfWords = fs
			.readFileSync(pathToTxt)
			.toString()
			.split(/\r?\n/);

		//remove all blank lines
		var newArrayOfWords = [];
		for (var i = 0; i < arrayOfWords.length; i++) {
			var thisWord = arrayOfWords[i].trim();
			if (thisWord !== "") {
				newArrayOfWords.push(thisWord);
			}
		}
		arrayOfWords = newArrayOfWords;

		//can't have an empty list!
		if (arrayOfWords.length === 0) {
			console.log(
				packName + ".txt is empty. Please add some words, or delete it."
			);
			process.exit(1);
		}

		self.wordPacks.push(new WordPack(packName, arrayOfWords));
	});
};

WordPacks.prototype.get = function(packName) {
	for (var i = 0; i < this.wordPacks.length; i++) {
		var thisPack = this.wordPacks[i];
		if (thisPack.name === packName) {
			return thisPack;
		}
	}
	return false;
};

WordPacks.prototype.getRandomWord = function(packName) {
	var thisPack = this.get(packName);
	if (thisPack) {
		return thisPack.getRandomWord();
	} else {
		console.error("Wordpack " + packName + " does not exist.");
		return this.wordPacks[0].getRandomWord();
	}
};

WordPacks.getAllPackNames = function(excludeNSFW) {
	var names = [];
	PACK_NAMES.forEach(function(packName) {
		if (!excludeNSFW || !packName.includes("18+")) {
			names.push(packName);
		}
	});
	return names;
};

function WordPack(name, words) {
	this.name = name;
	this.words = words;
}

WordPack.prototype.getRandomWord = function() {
	return this.words[Math.floor(Math.random() * this.words.length)];
};

module.exports = WordPacks;
