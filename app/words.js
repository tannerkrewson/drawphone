//
// Drawphone Words
//

const fs = require('fs');
const path = require('path');

class WordPacks {
	constructor() {
		this.wordPacks = [];
	}

	loadAll() {
		//reads each txt file in the words folder
		//the name of the file will be the name of the pack
		const files = fs.readdirSync(path.join(__dirname, '../words'));
		for(let file of files) {
			//removes the .txt from the end of the filename
			const packName = path.parse(file).name;

			const pathToTxt = __dirname + '/../words/' + file;
			const arrayOfWords = fs.readFileSync(pathToTxt)
				.toString()
				.split(/\r?\n/)
				.map(word => word.trim()) //trim all the words
				.filter(word => word !== ''); //remove all blank lines

			//can't have an empty list!
			if (arrayOfWords.length === 0) {
				console.log(packName + '.txt is empty. Please add some words, or delete it.');
				process.exit(1);
			}

			this.wordPacks.push(new WordPack(packName, arrayOfWords));
		}
	}

	get(packName) {
		return this.wordPacks.find(pack => pack.name === packName) || false;
	}

	getRandomWord(packName) {
		const thisPack = this.get(packName);
		if (thisPack) {
			return thisPack.getRandomWord();
		} else {
			console.error(`Wordpack ${packName} does not exist.`);
			return this.wordPacks[0].getRandomWord();
		}
	}
}

WordPacks.getAllPackNames = () => {
	return fs.readdirSync(path.join(__dirname, '../words'))
		.map(file => path.parse(file).name);
};

class WordPack {
	constructor(name, words) {
		this.name = name;
		this.words = words;
	}

	getRandomWord() {
		return this.words[Math.floor(Math.random() * this.words.length)];
	}
}

module.exports = WordPacks;
