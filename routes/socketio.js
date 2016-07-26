module.exports = function(app){

  var dp = app.drawphone;

  app.io.on('connection', function(socket) {

    var thisGame;
    var thisUser;

    socket.on('joinGame', function (data) {
      thisGame = dp.findGame(data.code);
      if (!thisGame) {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Game not found'
        });
      } else if (data.name.length < 1) {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Name too short'
        });
      } else {
        if (!thisGame.inProgress) {
          thisUser = thisGame.addPlayer(data.name, socket);
          socket.emit('joinGameRes', {
            success: true,
            game: thisGame.getJsonGame(),
            you: thisUser.getJson()
          })
        } else if (thisGame.currentRound.disconnectedPlayers.length > 0){
          thisUser = thisGame.newPlayer(data.name, socket);
          socket.emit('replacePlayer', {
            gameCode: thisGame.code,
            players: thisGame.currentRound.getPlayersThatNeedToBeReplaced()
          });
        } else {
          socket.emit('joinGameRes', {
            success: false,
            error: 'Game in progress'
          });
        }
      }
    });

    socket.on('newGame', function(data) {
      if (data.name.length > 1) {
        thisGame = dp.newGame();
        thisUser = thisGame.addPlayer(data.name, socket);
        socket.emit('joinGameRes', {
          success: true,
          game: thisGame.getJsonGame(),
          you: thisUser.getJson()
        })
      } else {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Failed to join game'
        })
      }
    });

    socket.on('tryStartGame', function(data) {
      if (thisUser.isAdmin) {
        thisGame.sendToAll('gameStart', {});
        thisGame.startNewRound();
      }
    });

    socket.on('tryReplacePlayer', function(data) {
      if (thisUser) {
        thisUser = thisGame.currentRound.replacePlayer(data.playerToReplace.id, thisUser);
        thisGame.initPlayer(thisUser);
        thisGame.currentRound.updateWaitingList();
        thisGame.currentRound.nextLinkIfEveryoneIsDone();
      }
    });

  });

}
