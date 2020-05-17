module.exports = function(app) {
	var dp = app.drawphone;
	var allPackNames = require("../app/words").getAllPackNames();
	var safePackNames = require("../app/words").getAllPackNames(true);

	app.get("/", function(req, res) {
		console.log(req.headers.host);

		const isSafeForWorkURL = req.headers.host.startsWith("dpk");
		const wordpacks = isSafeForWorkURL ? safePackNames : allPackNames;

		res.render("index", {
			wordpacks
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
				wordpacks: allPackNames
			});
		});
	}
};
