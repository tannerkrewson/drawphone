module.exports = function (app) {

	//var dp = app.drawphone;

	app.get('/', function (req, res) {
		res.render('index');
	});

	app.get('/howtoplay', function (req, res) {
		res.render('howtoplay');
	});

	if (app.get('env') === 'development') {
		app.get('/dev', function (req, res) {
			res.render('index');
		});
	}
};
