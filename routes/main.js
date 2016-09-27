module.exports = function (app) {

	var dp = app.drawphone;
	var packNames = require('../app/words').getAllPackNames();

	app.get('/', function (req, res) {
		res.render('index', {
			wordpacks: packNames
		});
	});

	app.get('/how-to-play', function (req, res) {
		res.render('howtoplay');
	});

	app.get('/screenshots', function (req, res) {
		res.render('screenshots');
	});

	app.get('/more-games', function (req, res) {
		res.render('moregames');
	});

	app.get('/stats', function (req, res) {
		res.json({
			gamesInProgress: dp.games.length,
			numberOfConnectedUsers: app.io.engine.clientsCount
		});
	});

	if (app.get('env') === 'development') {
		app.get('/dev', function (req, res) {
			res.render('index', {
				wordpacks: packNames
			});
		});
	}
};
