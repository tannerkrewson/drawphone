module.exports = function(app){

  var dp = app.drawphone;

  app.io.on('connection', function(socket) {

    socket.on('joinGame', function (data) {
      var game = dp.findGame(data.code);
      if (game && data.name.length > 1) {
        game.addPlayer(data.name, socket);
        socket.emit('joinGameRes', {
          success: true,
          game: game.getJsonGame()
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
        var game = dp.newGame();
        game.addPlayer(data.name, socket);
        socket.emit('joinGameRes', {
          success: true,
          game: game.getJsonGame()
        })
      } else {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Failed to join game'
        })
      }
    });

  })

}
