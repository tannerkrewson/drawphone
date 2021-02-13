//
// Drawphone Words
//

import fs from "fs";

// https://stackoverflow.com/a/62892482
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACK_NAMES = [
    "Simple words (recommended)",
    "Advanced words",
    "Immature words (13+)",
    "Naughty words (18+)",
    "Animals",
    "Adjectives",
    "Verbs",
];

class WordPacks {
    constructor() {
        this.wordPacks = [];
    }

    loadAll() {
        //reads each txt file in the words folder
        //the name of the file will be the name of the pack
        PACK_NAMES.forEach((packName) => {
            var pathToTxt = __dirname + "/../words/" + packName + ".txt";
            let arrayOfWords = fs
                .readFileSync(pathToTxt)
                .toString()
                .split(/\r?\n/);

            //remove all blank lines
            const newArrayOfWords = [];
            for (let i = 0; i < arrayOfWords.length; i++) {
                const thisWord = arrayOfWords[i].trim();
                if (thisWord !== "") {
                    newArrayOfWords.push(thisWord);
                }
            }
            arrayOfWords = newArrayOfWords;

            //can't have an empty list!
            if (arrayOfWords.length === 0) {
                console.log(
                    `${packName}.txt is empty. Please add some words, or delete it.`
                );
                process.exit(1);
            }

            this.wordPacks.push(new WordPack(packName, arrayOfWords));
        });
    }

    get(packName) {
        for (let i = 0; i < this.wordPacks.length; i++) {
            const thisPack = this.wordPacks[i];
            if (thisPack.name === packName) {
                return thisPack;
            }
        }
        return false;
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

WordPacks.getAllPackNames = (excludeNSFW) => {
    const names = [];
    PACK_NAMES.forEach((packName) => {
        // + for 18+ or 13+
        if (!excludeNSFW || !packName.includes("+")) {
            names.push(packName);
        }
    });
    return names;
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

export default WordPacks;
