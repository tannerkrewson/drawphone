const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const minify = require('express-minify');

const app = express();
const io = socketio();
app.io = io;

const devModeEnabled = (app.get('env') === 'development');

const Drawphone = require('./app/drawphone');
app.drawphone = new Drawphone(devModeEnabled);

require('./routes')(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

if (devModeEnabled) {
	app.use(logger('dev'));
} else {
	app.use(minify());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (devModeEnabled) {
	app.use((err, req, res, next) => {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err,
			stack: err.stack
		});
		next();
	});
}

// production error handler
// error handler
app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: err
	});
	next();
});

module.exports = app;
