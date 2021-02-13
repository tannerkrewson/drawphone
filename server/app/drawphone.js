//
// Drawphone
//

import Game from "./game.js";

class Drawphone {
    constructor(devModeEnabled) {
        this.games = [];
        this.locked = false;
        this.minutesUntilRestart;

        //add the dev game
        if (devModeEnabled) {
            this.newGame("ffff");
        }
    }

    newGame(forceCode) {
        if (this.locked) return false;

        let newCode;
        if (forceCode) {
            newCode = forceCode;
        } else {
            newCode = this.generateCode();
        }

        const newGame = new Game(newCode, () => {
            //will be ran when this game has 0 players left
            this.removeGame(newCode);
        });
        this.games.push(newGame);
        return newGame;
    }

    findGame(code) {
        if (!code || code.length !== 4) return false;

        for (let i = 0; i < this.games.length; i++) {
            if (this.games[i].code === code.toLowerCase()) {
                return this.games[i];
            }
        }
        return false;
    }

    generateCode() {
        let code;
        do {
            //generate 4 letter code
            code = "";
            const possible = "abcdefghijklmnopqrstuvwxyz";
            for (let i = 0; i < 4; i++) {
                code += possible.charAt(
                    Math.floor(Math.random() * possible.length)
                );
            }
            //make sure the code is not already in use
        } while (this.findGame(code));
        return code;
    }

    removeGame(code) {
        const game = this.findGame(code);

        const index = this.games.indexOf(game);
        if (index > -1) {
            this.games.splice(index, 1);
        }
    }

    lock() {
        this.locked = true;

        this.minutesUntilRestart = 16;

        const interval = setInterval(() => {
            this.minutesUntilRestart--;
            if (this.minutesUntilRestart <= 0) {
                clearInterval(interval);
            }
        }, 1000 * 60); // every minute
    }
}

export default Drawphone;
