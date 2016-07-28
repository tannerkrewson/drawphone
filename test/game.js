var test = require('tape');

var Game = require('../app/game.js');

var Player = require('../app/player.js');

var testCode = 'abcd';
var testName = 'Bob';
var testSocket = {
	on: function() {},
	emit: function() {}
};

var onEmpty = function() {
	return 'test';
};

var mockPlayer;

var testGame;

test('game', function (t) {
	t.plan(3);
	testGame = new Game(testCode, onEmpty);

	t.equal(testGame.code, testCode);
	t.equal(testGame.onEmpty(), onEmpty());
	t.equal(testGame.inProgress, false);
});

test('new player', function(t) {
	mockPlayer = new Player(testName, testSocket, testGame.currentId);
	var gamePlayer = testGame.newPlayer(testName, testSocket);
	t.deepEqual(gamePlayer, mockPlayer);

	//newPlayer function should not add the player to the array
	t.equal(testGame.players.length, 0);

	//game's currentId should have advanced by one
	t.equal(testGame.currentId, 2);
	t.end();
});

var player1;
var player2;

test('add player', function(t) {
	player1 = testGame.addPlayer(testName, testSocket);
	t.equal(testGame.players.length, 1);

	player2 = testGame.addPlayer('John', testSocket);
	t.equal(testGame.players.length, 2);

	t.equal(testGame.players[0], player1);
	t.end();
});

test('init player', function(t) {
	//initPlayer should have been ran when we added the players
	t.equal(player1.isAdmin, true);
	t.equal(player2.isAdmin, false);
	t.end();
});

test('onPlayerDisconnect: admin', function(t) {
	//if the admin disconnects, it should make someone else admin
	player1.isConnected = false;
	testGame.onPlayerDisconnect(player1);
	t.equal(player2.isAdmin, true);
	t.end();

	//reset
	player1.isConnected = true;
});

test('onPlayerDisconnect: onEmpty', function(t) {
	//if there are no players left when this function runs,
	//	it should call onEmpty
	var onEmptyCallCount = 0;
	var testOnEmpty = function() {
		onEmptyCallCount++;
	};
	var emptyTestGame = new Game(testCode, testOnEmpty);
	var testPlayer = emptyTestGame.addPlayer(testName, testSocket);
	emptyTestGame.removePlayer(testPlayer.id);
	emptyTestGame.onPlayerDisconnect(testPlayer);

	t.equal(onEmptyCallCount, 2);
	t.end();
});
