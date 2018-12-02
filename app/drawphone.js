//
// Drawphone
//

const Game = require('./game');

class Drawphone {
	constructor(devModeEnabled) {
		this.games = [];

		//add the dev game
		if (devModeEnabled) {
			this.newGame('ffff');
		}
	}

	newGame(forceCode) {
		const newCode = forceCode || this.generateCode();
		const newGame = new Game(newCode, () => this.removeGame(newCode));

		console.log(newCode + ' created');
		this.games.push(newGame);

		return newGame;
	}
	
	findGame(code) {
		return this.games.find(game => game.code === code.toLowerCase()) || false;
	}

	generateCode() {
		const possible = 'abcdefghijklmnopqrstuvwxyz';
		let code;
		do {
			//generate 4 letter code
			code = '';
			for (let i = 0; i < 4; i++) {
				code += possible[Math.floor(Math.random() * possible.length)];
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
			console.log(code + ' removed');
		}
	}
}

module.exports = Drawphone;
