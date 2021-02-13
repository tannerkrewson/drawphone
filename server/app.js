import express from "express";
import * as socketio from "socket.io";
import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

// https://stackoverflow.com/a/62892482
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import Drawphone from "./app/drawphone.js";
import attachMainRoutes from "./routes/main.js";
import attachSocketRoutes from "./routes/socketio.js";

const app = express();
const io = new socketio.Server();
app.io = io;

const devModeEnabled = app.get("env") === "development";

app.drawphone = new Drawphone(devModeEnabled);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

if (devModeEnabled) {
    app.use(logger("dev"));
}

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

attachMainRoutes(app);
attachSocketRoutes(app);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (devModeEnabled) {
    app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message,
            error: err,
            stack: err.stack,
        });
        next();
    });
}

// production error handler
// error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: err,
    });
    next();
});

export default app;
