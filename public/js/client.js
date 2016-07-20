/*
 *  Drawphone Client
 *  By Tanner Krewson
 */

//blocks use of https, required for the uploads.im api,
//  as it does not have https
window.onload = function(){
   $(function(){
       if(window.location.protocol==="https:")
           window.location.protocol="http";
   });
}

var socket = io();

var relativeUrl = window.location.pathname + window.location.search;

if (relativeUrl === "/dev") {
  socket.emit('joinGame', {
    code: 'ffff',
    name: Math.random().toString()
  });
}


//prevent form submit
$(function() {
    $("form").submit(function() { return false; });
});

//initialize sketch.js
var canvas = new fabric.Canvas('game-drawing-canvas');
canvas.isDrawingMode = true;

window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
  var container = $('#game-drawing');
  canvas.setHeight(container.width());
  canvas.setWidth(container.width());
  canvas.renderAll();
}

// resize on init
resizeCanvas();

//store game code globally
var gameCode;


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
    gameCode = data.game.code;
    setTitle('Game Code: ' + gameCode);
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
  var lastLink = data.link
  var lastLinkType = lastLink.type;
  var newLinkType = oppositeLinkType(lastLinkType);
  var doneButton = $("#game-send");

  hideLinkCreators();
  showElement('#game-buttons');

  if (lastLinkType === 'drawing') {
    //show the word creator
    showElement('#game-word');

    //show the previous drawing
    $('#game-word-drawingtoname').attr("src", lastLink.data);

    setTitle('What is this a drawing of?');

  } else if (lastLinkType === 'word'){
    //clear the previous drawing
    canvas.clear();

    //show drawing creator
    showElement('#game-drawing');

    //bind clear canvas to clear drawing button
    $('#game-cleardrawing').off('click');
    $('#game-cleardrawing').click(function() {
      canvas.clear();
    });

    //show clear button
    showElement('#game-cleardrawing');

    //calculate size of canvas dynamically
    resizeCanvas();

    setTitle('Please draw: ' + lastLink.data);
  }

  doneButton.off("click");
  doneButton.click(function() {
    setTitle('Sending...');
    //hide the drawing
    hideLinkCreators();

    //send the server the link we have created
    var newLink;
    if (newLinkType === 'drawing') {
      uploadCanvas(function(url) {
        newLink = url;
        send();
      }, function() {
        //reshow the canvas and allow the user to try again
        showElement('#game-drawing');
        showElement('#game-buttons');
        setTitle('Upload failed, try again.');
      });
    } else if (newLinkType === 'word') {
      newLink = $('#game-word-in').val();
      $('#game-word-in').val('')
      send();
    }

    function send() {
      socket.emit('finishedLink', {
        link: {
          type: newLinkType,
          data: newLink
        }
      });
      setTitle('Waiting for other players...');
    }
  });
}

function roundOver(data) {
  returnToLobby('The round is over!');
}

function someoneLeft(data) {
  returnToLobby(data.name + ' disconnected.');
}

function returnToLobby(message) {
  hideAll();
  showElement('#lobby');
  setTitle('Game Code: ' + gameCode);
  setSubtitle('Waiting for players...');
  alert(message);
}

function hideLinkCreators() {
  $('#game-drawing').addClass('hidden');
  $('#game-word').addClass('hidden');
  $('#game-buttons').addClass('hidden');
}

function uploadCanvas(next, err) {
  // this code was copied from:
  // http://community.mybb.com/thread-150592.html
  // https://github.com/blueimp/JavaScript-Canvas-to-Blob#usage

  var file = canvas.toDataURL('image/png');
  var blob = window.dataURLtoBlob(file);
  var formData = new FormData();
  formData.append('upload', blob, 'drawing.png');
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://uploads.im/api");
  xhr.onload = function() {
    var res = JSON.parse(xhr.responseText);
    if (res.status_code === 200) {
      var url = res.data.img_url;
      next(url);
    } else {
      err();
    }
  }
  xhr.onerror = err;
  try {
    xhr.send(formData);
  } catch (e) {
    err();
  }
}


//  Result

function viewResults(data) {
  var ourChain = data.links;
  var ourName = ourChain[0].player.name;

  hideAll();
  showElement('#result');

  setTitle(ourName + "'s Drawphone results");
  setSubtitle('Show everyone how they did!');

  var results = $('#result-content');

  for (var i = 0; i < data.links.length; i++) {
    var link = data.links[i];
    if (i === 0) {
      results.append('<h3>The first word:</h3><h1>' + link.data + '</h1>');
    } else if (link.type === 'drawing') {
      results.append('<h3>' + link.player.name + ' drew:</h3><img class="drawing" src="' + link.data + '"></img>');
    } else if (link.type === 'word') {
      results.append('<h3>' + link.player.name + ' thought that was:</h3><h1>' + link.data + '</h1>');
    } else {
      console.log('We should never get here');
    }
  }

  var doneButton = $('#result-done');
  doneButton.off('click');
  doneButton.on('click', function() {
    hideAll();
    setTitle('Thanks for playing Drawphone!');
    setSubtitle('Waiting for other players...');
    socket.emit('doneViewingResults', {});
  });
}


//  UI Methods

function hideAll() {
  $('#mainmenu').addClass('hidden');
  $('#joinmenu').addClass('hidden');
  $('#newmenu').addClass('hidden');
  $('#lobby').addClass('hidden');
  $('#game').addClass('hidden');
  $('#result').addClass('hidden');

  $('#game-cleardrawing').addClass('hidden');
  $('#result-content').empty();

}

//for development purposes
function showAll() {
  $('#mainmenu').removeClass('hidden');
  $('#joinmenu').removeClass('hidden');
  $('#newmenu').removeClass('hidden');
  $('#lobby').removeClass('hidden');
  $('#game').removeClass('hidden');

  $('#game-drawing').removeClass('hidden');
  $('#game-word').removeClass('hidden');

  resizeCanvas();
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

socket.on('joinGameRes', showLobby);

socket.on('updatePlayerList', updatePlayerList);

socket.on('gameStart', showGame);

socket.on('nextLink', nextLink);

socket.on('roundOver', roundOver);

socket.on('someoneLeft', someoneLeft);

socket.on('viewResults', viewResults);
