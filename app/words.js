//
// Drawphone Words
//

var fs = require("fs");
var path = require("path");
var shuffle = require("knuth-shuffle").knuthShuffle;

function WordPacks() {
	this.wordPacks = [];
}

WordPacks.prototype.loadAll = function() {
	var self = this;
	//reads each txt file in the words folder
	//the name of the file will be the name of the pack
	fs.readdirSync(path.join(__dirname, "../words")).forEach(function(file) {
		//removes the .txt from the end of the filename
		var packName = file.substring(0, file.length - 4);

		var pathToTxt = __dirname + "/../words/" + file;
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

WordPacks.getAllPackNames = function() {
	var names = [];
	fs.readdirSync(path.join(__dirname, "../words")).forEach(function(file) {
		//removes the .txt from the end of the filename
		var packName = file.substring(0, file.length - 4);
		names.push(packName);
	});
	return names;
};

function WordPack(name, words) {
	this.name = name;
	this.words = words;
	this.i = this.words.length;
}

WordPack.prototype.getRandomWord = function() {
	if (this.i === this.words.length) {
		shuffle(this.words);
		this.i = 0;
	}
	return this.words[this.i++];
};

module.exports = WordPacks;
