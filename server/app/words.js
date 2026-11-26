//
// Drawphone Words
//

const lists = import.meta.glob("../words/*.txt", {
    eager: true,
    query: "?raw",
    import: "default",
});

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
            let arrayOfWords = lists[`../words/${packName}.txt`].split(/\r?\n/);

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
                throw new Error(`${packName}.txt is empty.`);
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
