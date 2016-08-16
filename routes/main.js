module.exports = function (app) {

	//var dp = app.drawphone;
	var packNames = require('../app/words').getAllPackNames();

	app.get('/', function (req, res) {
		res.render('index', {
			wordpacks: packNames
		});
	});

	app.get('/howtoplay', function (req, res) {
		res.render('howtoplay');
	});

	if (app.get('env') === 'development') {
		app.get('/dev', function (req, res) {
			res.render('index', {
				wordpacks: packNames
			});
		});
	}
};
