import webpackAssets from "../../webpack-assets.json";
import WordPacks from "../app/words.js";

const { getAllPackNames } = WordPacks;

export default (app) => {
    const dp = app.drawphone;
    const allPackNames = getAllPackNames();
    const safePackNames = getAllPackNames(true);

    app.get("/", ({ headers }, res) => {
        const isSafeForWorkURL = headers.host.startsWith("dpk");
        const wordpacks = isSafeForWorkURL ? safePackNames : allPackNames;

        res.render("index", {
            wordpacks,
            js: webpackAssets.main.js,
            css: webpackAssets.main.css,
        });
    });

    app.get("/how-to-play", (req, res) => {
        res.render("howtoplay", {
            js: webpackAssets.main.js,
            css: webpackAssets.main.css,
        });
    });

    app.get("/screenshots", (req, res) => {
        res.render("screenshots", {
            js: webpackAssets.main.js,
            css: webpackAssets.main.css,
        });
    });

    app.get("/more-games", (req, res) => {
        res.render("moregames", {
            js: webpackAssets.main.js,
            css: webpackAssets.main.css,
        });
    });

    app.get("/archive", (req, res) => {
        res.render("archive", {
            js: webpackAssets.main.js,
            css: webpackAssets.main.css,
        });
    });

    app.get("/stats", (req, res) => {
        const games = [];
        let realPlayerCount = 0;
        for (const game of dp.games) {
            const players = game.players.length - game.botCount;
            realPlayerCount += players;

            const strippedGame = {
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
            games,
        });
    });

    app.get("/admin", (req, res) => {
        res.render("admin");
    });

    app.post("/lock", ({ body }, res) => {
        if (!process.env.ADMIN_PASSWORD) {
            res.status(501).end();
        }

        if (body.password === process.env.ADMIN_PASSWORD) {
            dp.lock();
            res.status(200).end();
        } else {
            res.status(401).end();
        }
    });

    app.post("/new", (req, res) => {
        if (dp.locked) {
            // 423 Locked
            return res.status(423).send({ minutes: dp.minutesUntilRestart });
        }

        const theGame = dp.newGame();
        res.json({ gameCode: theGame.code });
    });

    if (app.get("env") === "development") {
        app.get("/dev", (req, res) => {
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
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return `${interval} years`;
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return `${interval} months`;
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return `${interval} days`;
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return `${interval} hours`;
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return `${interval} minutes`;
    }
    return `${Math.floor(seconds)} seconds`;
}
