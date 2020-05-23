module.exports = function(app) {
	var dp = app.drawphone;
	var allPackNames = require("../app/words").getAllPackNames();
	var safePackNames = require("../app/words").getAllPackNames(true);

	app.get("/", function(req, res) {
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

	app.get("/archive", function(req, res) {
		res.render("archive");
	});

	app.get("/stats", function(req, res) {
		var games = [];
		for (var game of dp.games) {
			var strippedGame = {
				numberOfPlayers: game.players.length,
				inProgress: game.inProgress,
				roundsPlayed: game.currentRoundNum - 1,
				lastAction: timeSince(game.timeOfLastAction)
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

// https://stackoverflow.com/a/3177838
function timeSince(date) {
	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
}
