/*
 *  Drawphone Server
 *  By Tanner Krewson
 */

function Drawphone() {
  this.games = [];
}

Drawphone.prototype.newGame = function() {
  var newCode = this.generateCode();
  var newGame = new Game(newCode);
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


function Game(code) {
  this.code = code;
  this.players = [];
}

Game.prototype.addPlayer = function(name) {
  this.players.push(new Player(name));
}


function Player(name) {
  this.name = name;
}


module.exports = Drawphone;
