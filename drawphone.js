/*
 *  Drawphone Game Logic
 *  By Tanner Krewson
 */

function Drawphone() {
  this.games = [];
}

Drawphone.prototype.newGame = function() {
  var newCode = this.generateCode();

  var self = this;
  var newGame = new Game(newCode, function() {
    //will be ran when this game has 0 players left
    self.removeGame(newCode);
  });
  this.games.push(newGame);
  return newGame;
}

Drawphone.prototype.findGame = function(code) {
  for (var i = 0; i < this.games.length; i++) {
    if (this.games[i].code === code.toLowerCase()) {
      return this.games[i];
    }
  }
  return false;
}

Drawphone.prototype.generateCode = function() {
  var code;
  do {
    //generate 6 letter code
    code = "";
    var possible = "abcdefghijklmnopqrstuvwxyz";
    for(var i=0; i < 4; i++ ) {
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    //make sure the code is not already in use
  } while (this.findGame(code));
  return code;
}

Drawphone.prototype.removeGame = function(code) {
  var game = this.findGame(code);

  var index = this.games.indexOf(game);
  if (index > -1) {
      this.games.splice(index, 1);
  }
}


function Game(code, onEmpty) {
  this.code = code;
  this.onEmpty = onEmpty;
  this.players = [];
  this.inProgress = false;

  this.currentId = 1;
}

Game.prototype.addPlayer = function(name, socket) {
  var id = this.getNextId();
  this.players.push(new Player(name, socket, id));

  this.sendUpdatedPlayersList();

  //when this player disconnects, remove them from this game
  var self = this;
  socket.on('disconnect', function() {
    self.removePlayer(id);
    self.sendUpdatedPlayersList();
  });

}

Game.prototype.removePlayer = function(id) {
  var player = this.getPlayer(id);

  var index = this.players.indexOf(player);
  if (index > -1) {
      this.players.splice(index, 1);
  }

  //if there are no players left
  if (this.players.length === 0) {
    this.onEmpty();
  }
}

Game.prototype.getPlayer = function(id) {
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i].id === id) {
      return this.players[i];
    }
  }
  return false;
}

Game.prototype.getNextId = function() {
  return this.currentId++;
}

Game.prototype.getJsonGame = function () {
  var players = [];
  this.players.forEach(function(player) {
    players.push(player.getJson());
  });

  var jsonGame = {
    code: this.code,
    players,
    inProgress: this.inProgress
  };
  return jsonGame;
};

Game.prototype.sendUpdatedPlayersList = function() {
  this.sendToAll('updatePlayerList', this.getJsonGame().players);
}

Game.prototype.sendToAll = function(event, data) {
  this.players.forEach(function(player) {
    player.socket.emit(event, data);
  });
}


function Player(name, socket, id) {
  this.name = name;
  this.socket = socket;
  this.id = id;
}

Player.prototype.getJson = function() {
  return newPlayer = {
    name: this.name,
    id: this.id
  }
}


module.exports = Drawphone;
