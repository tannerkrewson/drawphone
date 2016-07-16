/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

//make the url look nice
$( document ).ready(function() {
  window.history.pushState("Drawphone", "Drawphone", "/");
});

//prevent form submit
$(function() {
    $("form").submit(function() { return false; });
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

function nextLink(data) {
  var lastLinkType = data.link.type;
  var doneButton = $("#game-send");

  //figure out our name
  var ourName = $('#joininname').val();
  if (ourName === '') {
    ourName = $('#newinname').val();
  }

  //temporary link maker
  var newLinkData;
  if (lastLinkType === 'drawing') {
    newLinkData = " word of "+ data.link.data;
  } else {
    newLinkData = " drawing of "+ data.link.data;
  }

  //clear on click events from the Done button
  doneButton.off("click");
  doneButton.click(function() {
    //send the server the link we have created
    socket.emit('finishedLink', {
      link: {
        type: oppositeLinkType(lastLinkType),
        data: ourName + "'s " + newLinkData
      }
    });

    $('#gametest').text('Waiting for other users to finish...');
  });

  $('#gametest').html('Last Link:' + data.link.data + '<br> Link to send: Our ' + newLinkData);
  console.log(data);
}

function roundOver(data) {
  hideAll();
  showElement('#lobby');
  alert('The round is over!');
}

function someoneLeft(data) {
  hideAll();
  showElement('#lobby');
  alert(data.name + ' disconnected.');
}


//  UI Methods

function hideAll() {
  $('#mainmenu').addClass('hidden');
  $('#joinmenu').addClass('hidden');
  $('#newmenu').addClass('hidden');
  $('#lobby').addClass('hidden');
  $('#game').addClass('hidden');
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

function oppositeLinkType(linkType) {
  if (linkType === 'drawing') {
    return 'word';
  } else {
    return 'drawing';
  }
}


//
//  Real-time Communication via Socket.IO
//

var socket = io();

socket.on('joinGameRes', showLobby);

socket.on('updatePlayerList', updatePlayerList);

socket.on('gameStart', showGame);

socket.on('nextLink', nextLink);

socket.on('roundOver', roundOver);

socket.on('someoneLeft', someoneLeft);
