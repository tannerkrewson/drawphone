module.exports = function(app) {
	var dp = app.drawphone;
	var packNames = require("../app/words").getAllPackNames();

	app.get("/", function(req, res) {
		res.render("index", {
			wordpacks: packNames
		});
	});

	app.get("/how-to-play", function(req, res) {
		res.render("howtoplay");
	});

	app.get("/screenshots", function(req, res) {
		res.render("screenshots");
	});

	app.get("/more-games", function(req, res) {
		res.render("moregames");
	});

	app.get("/stats", function(req, res) {
		var games = [];
		for (var game of dp.games) {
			var strippedGame = {
				numberOfPlayers: game.players.length,
				inProgress: game.inProgress,
				roundsPlayed: game.currentRoundNum - 1
			};
			games.push(strippedGame);
		}
		res.json({
			numberOfConnectedUsers: app.io.engine.clientsCount,
			games: games
		});
	});

	app.get("/admin", function(req, res) {
		res.render("admin");
	});

	app.post("/lock", function(req, res) {
		if (!process.env.ADMIN_PASSWORD) {
			res.status(501).end();
		}

		if (req.body.password === process.env.ADMIN_PASSWORD) {
			dp.lock();
			res.status(200).end();
		} else {
			res.status(401).end();
		}
	});

	if (app.get("env") === "development") {
		app.get("/dev", function(req, res) {
			res.render("index", {
				wordpacks: packNames
			});
		});
	}
};
