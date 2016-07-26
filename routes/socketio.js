module.exports = function(app){

  var dp = app.drawphone;

  app.io.on('connection', function(socket) {

    var thisGame;
    var thisUser;

    socket.on('joinGame', onJoinGame);

    socket.on('newGame', function(data) {
      if (data.name.length > 2 && data.name.length <= 16) {
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
          error: 'Name too short/long'
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
      var thisRound = thisGame.currentRound;
      var toReplaceId = data.playerToReplace.id;
      if (thisUser && thisRound.canBeReplaced(toReplaceId)) {
        thisUser = thisRound.replacePlayer(toReplaceId, thisUser);
        thisGame.initPlayer(thisUser);
        thisRound.updateWaitingList();
        thisRound.nextLinkIfEveryoneIsDone();
      }
      else {
        //give the user semi-useful error message,
        //  instead of literally nothing happening
        onJoinGame({
          code: thisGame.code,
          name: thisUser.name
        });
      }
    });

    function onJoinGame(data) {
      thisGame = dp.findGame(data.code);
      if (!thisGame) {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Game not found'
        });
      } else if (data.name.length <= 2 || data.name.length > 16) {
        socket.emit('joinGameRes', {
          success: false,
          error: 'Name too short/long'
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
    }

  });

}
