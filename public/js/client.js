/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

//make the url look nice
$( document ).ready(function() {
  window.history.pushState("Drawphone", "Drawphone", "/");
});


//
//  UI
//

setTitle('Drawphone');
setSubtitle('Telephone with pictures');


//  Main Menu

$('#joinbtn').click(function() {
  hideAll();
  showElement('#joinmenu');
});

$('#newbtn').click(function() {
  hideAll();
  showElement('#newmenu');
});


//  Join Game Menu

$('#joinmenu-back').click(function() {
  hideAll();
  showElement('#mainmenu');
});

$('#joinmenu-go').click(function() {
  var code = $('#joinincode').val();
  var name = $('#joininname').val();

  if (name.length > 1 && code.length === 4) {
    socket.emit('joinGame', {
      code,
      name
    });
  }
});


//  New Game Menu

$('#newmenu-back').click(function() {
  hideAll();
  showElement('#mainmenu');
});

$('#newmenu-go').click(function() {
  var name = $('#newinname').val();

  if (name.length > 1) {
    socket.emit('newGame', {
      name
    });
  }
});


//  Lobby

$('#lobby-leave').click(function() {
  //refresh the page
  location.reload();
});

$('#lobby-start').click(function() {
  socket.emit('tryStartGame', {});
});

function showLobby(data) {
  if (data.success) {
    hideAll();
    showElement('#lobby');
    setTitle('Game Code: ' + data.game.code);
    setSubtitle('Waiting for players...');
    updatePlayerList(data.game.players);
  } else {
    alert(data.error);
  }
}

function updatePlayerList(list) {
  var playerList = $('#lobby-players');

  playerList.empty();

  for (var i = 0; i < list.length; i++) {
    var listItem = $('<li>' + list[i].name + '</li>').appendTo(playerList);
    listItem.addClass('list-group-item');
  }
}


//  Game

function showGame(data) {
  hideAll();
  showElement('#game');

  setSubtitle('Game in progress');
}


//  UI Methods

function hideAll() {
  $('#mainmenu').addClass('hidden');
  $('#joinmenu').addClass('hidden');
  $('#newmenu').addClass('hidden');
  $('#lobby').addClass('hidden');
}

function showElement(jq) {
  $(jq).removeClass('hidden');
}

function setTitle(newTitle) {
  $('#title').text(newTitle);
}

function setSubtitle(newSubtitle) {
  $('#subtitle').text(newSubtitle);
}


//
//  Real-time Communication via Socket.IO
//

var socket = io();

socket.on('joinGameRes', showLobby);

socket.on('updatePlayerList', updatePlayerList);

socket.on('gameStart', showGame);
