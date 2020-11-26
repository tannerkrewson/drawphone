const webpackAssets = require("../../webpack-assets.json");

module.exports = function (app) {
	var dp = app.drawphone;
	var allPackNames = require("../app/words").getAllPackNames();
	var safePackNames = require("../app/words").getAllPackNames(true);

	app.get("/", function (req, res) {
		const isSafeForWorkURL = req.headers.host.startsWith("dpk");
		const wordpacks = isSafeForWorkURL ? safePackNames : allPackNames;

		res.render("index", {
			wordpacks,
			js: webpackAssets.main.js,
			css: webpackAssets.main.css,
		});
	});

	app.get("/how-to-play", function (req, res) {
		res.render("howtoplay", {
			js: webpackAssets.main.js,
			css: webpackAssets.main.css,
		});
	});

	app.get("/screenshots", function (req, res) {
		res.render("screenshots", {
			js: webpackAssets.main.js,
			css: webpackAssets.main.css,
		});
	});

	app.get("/more-games", function (req, res) {
		res.render("moregames", {
			js: webpackAssets.main.js,
			css: webpackAssets.main.css,
		});
	});

	app.get("/archive", function (req, res) {
		res.render("archive", {
			js: webpackAssets.main.js,
			css: webpackAssets.main.css,
		});
	});

	app.get("/stats", function (req, res) {
		var games = [];
		let realPlayerCount = 0;
		for (var game of dp.games) {
			const players = game.players.length - game.botCount;
			realPlayerCount += players;

			var strippedGame = {
				players,
				roundsPlayed: game.currentRoundNum - 1,
				lastAction: timeSince(game.timeOfLastAction),
				inProgress: game.inProgress,
			};

			games.unshift(strippedGame);
		}

		const lastRebootDate = new Date();
		lastRebootDate.setSeconds(
			lastRebootDate.getSeconds() - process.uptime()
		);

		res.json({
			totalSocketClients: app.io.engine.clientsCount,
			totalRealPlayers: realPlayerCount,
			lastReboot: timeSince(lastRebootDate),
			games: games,
		});
	});

	app.get("/admin", function (req, res) {
		res.render("admin");
	});

	app.post("/lock", function (req, res) {
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

	app.post("/new", function (req, res) {
		if (dp.locked) {
			// 423 Locked
			return res.status(423).send({ minutes: dp.minutesUntilRestart });
		}

		const theGame = dp.newGame();
		res.json({ gameCode: theGame.code });
	});

	if (app.get("env") === "development") {
		app.get("/dev", function (req, res) {
			res.render("index", {
				wordpacks: allPackNames,
				js: webpackAssets.main.js,
				css: webpackAssets.main.css,
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
