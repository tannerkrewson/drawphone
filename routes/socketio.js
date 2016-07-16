module.exports = function(app){

  var dp = app.drawphone;

  app.io.on('connection', function(socket) {

    var thisGame;
    var thisUser;

    socket.on('joinGame', function (data) {
      thisGame = dp.findGame(data.code);
      if (thisGame && data.name.length > 1) {
        thisUser = thisGame.addPlayer(data.name, socket);
        socket.emit('joinGameRes', {
          success: true,
          game: thisGame.getJsonGame()
        })
      } else {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Failed to join game'
        })
      }
    });

    socket.on('newGame', function(data) {
      if (data.name.length > 1) {
        thisGame = dp.newGame();
        thisUser = thisGame.addPlayer(data.name, socket);
        socket.emit('joinGameRes', {
          success: true,
          game: thisGame.getJsonGame()
        })
      } else {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Failed to join game'
        })
      }
    });

    socket.on('tryStartGame', function(data) {
      thisGame.sendToAll('gameStart', {});
      thisGame.startNewRound();
    });

    socket.on('disconnect', function(data) {
      if (thisGame && thisGame.inProgress) {
        thisGame.currentRound.someoneLeft(thisUser.name);
      }
    });

  })

}
