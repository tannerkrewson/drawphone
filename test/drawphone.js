var test = require('tape');

var Drawphone = require('../app/drawphone.js');

var dp = new Drawphone(false);

var testGame;

test('new game', function (t) {
	testGame = dp.newGame();
	t.equal(dp.games[0], testGame);
	t.end();
});

test('find game', function(t) {
	var foundGame = dp.findGame(testGame.code);
	t.equal(foundGame, testGame);
	t.end();
});

test('generate code', function(t) {
	t.ok(dp.generateCode());
	t.end();
});

test('remove game', function(t) {
	dp.removeGame(testGame.code);
	t.notOk(dp.findGame(testGame.code));
	t.end();
});
