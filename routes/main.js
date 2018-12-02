module.exports = app => {

	const dp = app.drawphone;
	const packNames = require('../app/words').getAllPackNames();

	app.get('/', (req, res) => {
		res.render('index', {
			wordpacks: packNames
		});
	});

	app.get('/how-to-play', (req, res) => {
		res.render('howtoplay');
	});

	app.get('/screenshots', (req, res) => {
		res.render('screenshots');
	});

	app.get('/more-games', (req, res) => {
		res.render('moregames');
	});

	app.get('/stats', (req, res) => {
		const games = dp.games.map(game => ({
			numberOfPlayers: game.players.length,
			inProgress: game.inProgress,
			roundsPlayed: game.currentRoundNum - 1
		}));
		
		res.json({
			numberOfConnectedUsers: app.io.engine.clientsCount,
			games
		});
	});

	if (app.get('env') === 'development') {
		app.get('/dev', (req, res) => {
			res.render('index', {
				wordpacks: packNames
			});
		});
	}
};
