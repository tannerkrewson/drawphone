var express = require("express");
var socketio = require("socket.io");
var path = require("path");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

var app = express();
var io = socketio();
app.io = io;

var devModeEnabled = app.get("env") === "development";

var Drawphone = require("./app/drawphone");
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
		extended: false
	})
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

require("./routes")(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error("Not Found");
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (devModeEnabled) {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render("error", {
			message: err.message,
			error: err,
			stack: err.stack
		});
		next();
	});
}

// production error handler
// error handler
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render("error", {
		message: err.message,
		error: err
	});
	next();
});

module.exports = app;
