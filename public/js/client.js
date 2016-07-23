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

//prevent page from refreshing when Join game buttons are pressed
$(function() {
    $("form").submit(function() { return false; });
});


//
//  UI Methods
//

function hideAll() {
  $('#mainmenu').addClass('hidden');
  $('#joinmenu').addClass('hidden');
  $('#newmenu').addClass('hidden');
  $('#lobby').addClass('hidden');
  $('#game').addClass('hidden');
  $('#result').addClass('hidden');
  $('#waiting').addClass('hidden');
}

function showElement(jq) {
  $(jq).removeClass('hidden');
}

function oppositeLinkType(linkType) {
  if (linkType === 'drawing') {
    return 'word';
  } else {
    return 'drawing';
  }
}


//
//  Objects
//

function Drawphone() {
  this.screens = [];

  var self = this;
  this.mainMenu = new MainMenu(function() {
    //ran when Join Game button is pressed
    self.joinMenu.show();
  }, function() {
    //ran when New Game button is pressed
    self.newMenu.show();
  });

  this.joinMenu = new JoinMenu(function() {
    //ran when Back button is pressed
    self.mainMenu.show();
  });

  this.newMenu = new NewMenu(function() {
    //ran when Back button is pressed
    self.mainMenu.show();
  });

  this.lobby = new Lobby();

  this.game = new Game(function() {
    //ran when the round ends
    self.lobby.show();
  }, function() {
    //ran when the player sends
    self.waiting.show();
  });

  this.results = new Results();

  this.waiting = new Waiting();

  this.screens.push(this.mainMenu);
  this.screens.push(this.joinMenu);
  this.screens.push(this.newMenu);
  this.screens.push(this.lobby);
  this.screens.push(this.game);
  this.screens.push(this.results);
  this.screens.push(this.waiting);
}

Drawphone.prototype.initializeAll = function() {
  this.screens.forEach(function(screen) {
    screen.initialize();
  });

  this.attachSocketListeners();
}

Drawphone.prototype.attachSocketListeners = function() {
  socket.on('disconnect', function() {
    alert('Connection lost!');
    //refresh the page
    location.reload();
  });

  socket.on('joinGameRes', this.lobby.show.bind(this.lobby));

  socket.on('updatePlayerList', this.lobby.updatePlayerList.bind(this.lobby));

  socket.on('gameStart', this.game.show.bind(this.game));

  socket.on('nextLink', this.game.newLink.bind(this.game));

  socket.on('roundOver', this.game.roundOver.bind(this.game));

  socket.on('someoneLeft', this.game.someoneLeft.bind(this.game));

  socket.on('viewResults', this.results.show.bind(this.results));

  socket.on('updateWaitingList', this.waiting.updateWaitingList.bind(this.waiting));
}

Drawphone.prototype.begin = function() {
  this.mainMenu.show();
}


function Screen() {
  this.id = '';
  this.title = 'Error: Title not set';
  this.subtitle = 'Error: Subtitle not set';

  this.defaultTitle = 'Drawphone';
  this.defaultSubtitle = 'Telephone with pictures';
}

Screen.prototype.initialize = function() {}

Screen.prototype.show = function() {
  hideAll();
  showElement(this.id);

  $('#title').html(this.title);
  $('#subtitle').text(this.subtitle);
}

Screen.prototype.setTitle = function(title) {
  this.title = title;
  $('#title').html(this.title);
}

Screen.prototype.setSubtitle = function(subtitle) {
  this.subtitle = subtitle;
  $('#subtitle').html(this.subtitle);
}

Screen.prototype.setDefaultTitles = function() {
  this.setTitle(this.defaultTitle);
  this.setSubtitle(this.defaultSubtitle);
}


MainMenu.prototype = Object.create(Screen.prototype);

function MainMenu(onJoin, onNew) {
  Screen.call(this);

  this.id = '#mainmenu';
  this.joinButton = $('#joinbtn');
  this.newButton = $('#newbtn');
  this.onJoin = onJoin;
  this.onNew = onNew;

  Screen.prototype.setDefaultTitles.call(this);
}

MainMenu.prototype.initialize = function() {
  Screen.prototype.initialize.call(this);

  this.joinButton.click(this.onJoin);
  this.newButton.click(this.onNew);
}


JoinMenu.prototype = Object.create(Screen.prototype);

function JoinMenu(onBack) {
  Screen.call(this);

  this.id = '#joinmenu';
  this.backButton = $('#joinmenu-back');
  this.goButton = $('#joinmenu-go');
  this.onBack = onBack;

  Screen.prototype.setDefaultTitles.call(this);
}

JoinMenu.prototype.initialize = function() {
  Screen.prototype.initialize.call(this);

  this.backButton.click(this.onBack);
  this.goButton.click(function() {
    var code = $('#joinincode').val();
    var name = $('#joininname').val();

    if (name.length > 1 && code.length === 4) {
      socket.emit('joinGame', {
        code,
        name
      });
    }
  });

  Screen.prototype.setDefaultTitles.call(this);
}


NewMenu.prototype = Object.create(Screen.prototype);

function NewMenu(onBack) {
  Screen.call(this);

  this.id = '#newmenu';
  this.backButton = $('#newmenu-back');
  this.goButton = $('#newmenu-go');
  this.onBack = onBack;

  Screen.prototype.setDefaultTitles.call(this);
}

NewMenu.prototype.initialize = function() {
  Screen.prototype.initialize.call(this);

  this.backButton.click(this.onBack);
  this.goButton.click(function() {
    var name = $('#newinname').val();

    if (name.length > 1) {
      socket.emit('newGame', {
        name
      });
    }
  });
}


Lobby.prototype = Object.create(Screen.prototype);

function Lobby() {
  Screen.call(this);

  this.id = '#lobby';
  this.leaveButton = $('#lobby-leave');
  this.startButton = $('#lobby-start');
  this.gameCode = '';

  this.userList = new UserList($('#lobby-players'));
}

Lobby.prototype.initialize = function() {
  Screen.prototype.initialize.call(this);

  this.leaveButton.click(function() {
    //refresh the page
    location.reload();
  });
  this.startButton.click(function() {
    socket.emit('tryStartGame', {});
  });
}

Lobby.prototype.show = function(data) {
  if (data) {
    this.update(data);
  }
  Screen.prototype.setTitle.call(this, 'Game Code: <span class="gamecode">' + this.gameCode + '</span>');
  Screen.prototype.setSubtitle.call(this, 'Waiting for players...');

  Screen.prototype.show.call(this);
}

Lobby.prototype.update = function(data) {
  if (data.success) {
    this.gameCode = data.game.code;
    this.userList.update(data.game.players);
    this.show();
  } else {
    alert(data.error);
  }
}

Lobby.prototype.updatePlayerList = function(data) {
  this.userList.update(data);
}


Game.prototype = Object.create(Screen.prototype);

function Game(onRoundEnd, onWait) {
  Screen.call(this);

  this.id = '#game';
  Screen.prototype.setSubtitle.call(this, 'Game in progress');
  this.blankCanvas = document.createElement('canvas');
  this.onRoundEnd = onRoundEnd;
  this.onWait = onWait;

  //initialize fabric.js
  this.canvas = new fabric.Canvas('game-drawing-canvas');
  this.canvas.isDrawingMode = true;

  window.addEventListener('resize', this.resizeCanvas.bind(this), false);
}

Game.prototype.initialize = function() {
  Screen.prototype.initialize.call(this);
  var doneButton = $("#game-send");

  //bind clear canvas to clear drawing button
  var self = this;
  $('#game-cleardrawing').click(function() {
    self.canvas.clear();
  });

  doneButton.click(function() {
    self.onDone();
  });

  //run done when enter key is pressed in word input
  $('#game-word-in').keypress(function(e) {
    var key = e.which;
    if (key === 13) {
       self.onDone();
    }
  });
}

Game.prototype.showDrawing = function() {
  showElement('#game-drawing');
  this.showButtons(true);
  this.show();
}

Game.prototype.showWord = function() {
  showElement('#game-word');
  this.showButtons(false);
  this.show();
}

Game.prototype.showButtons = function(showClearButton) {
  if (showClearButton) {
    showElement('#game-cleardrawing');
  }
  else {
    $('#game-cleardrawing').addClass('hidden');
  }
  showElement('#game-buttons');
}

Game.prototype.hideBoth = function() {
  $('#game-drawing').addClass('hidden');
  $('#game-word').addClass('hidden');
  $('#game-buttons').addClass('hidden');
}

Game.prototype.newLink = function(data) {
  var lastLink = data.link
  var lastLinkType = lastLink.type;
  var newLinkType = oppositeLinkType(lastLinkType);

  if (lastLinkType === 'drawing') {
    //show the previous drawing
    $('#game-word-drawingtoname').attr("src", lastLink.data);

    Screen.prototype.setTitle.call(this, 'What is this a drawing of?');

    //show the word creator
    this.showWord();
  }
  else if (lastLinkType === 'word'){
    //clear the previous drawing
    this.canvas.clear();

    Screen.prototype.setTitle.call(this, 'Please draw: ' + lastLink.data);

    //show drawing creator
    this.showDrawing();

    //calculate size of canvas dynamically
    this.resizeCanvas();
  }

  //this will be ran when the done button is clicked, or
  //  the enter key is pressed in the word input
  this.onDone = function() {
    this.checkIfDone(newLinkType);
  }
}

Game.prototype.checkIfDone = function(newLinkType) {
  //hide the drawing
  this.hideBoth();

  var newLink;
  var self = this;
  if (newLinkType === 'drawing') {
    if (this.isDrawingBlank()) {
      alert('Please draw something!');
    }
    else {
      this.uploadCanvas(function(url) {
        //ran if upload was successful
        newLink = url;
        self.sendLink(newLinkType, newLink);
      }, function() {
        //ran if upload was unsuccessful
        //reshow the canvas and allow the user to try again
        self.showDrawing();
        Screen.prototype.setTitle.call(this, 'Upload failed, try again.');
      });
    }
  }
  else if (newLinkType === 'word') {
    newLink = $('#game-word-in').val().trim();
    //check if it is blank
    if (newLink === '') {
      alert('Please enter a guess!');
    }
    else {
      //clear the input
      $('#game-word-in').val('')
      this.sendLink(newLinkType, newLink);
    }
  }
}

Game.prototype.uploadCanvas = function(next, err) {
  Screen.prototype.setTitle.call(this, 'Uploading...');

  // this code was copied from:
  // http://community.mybb.com/thread-150592.html
  // https://github.com/blueimp/JavaScript-Canvas-to-Blob#usage
  var file = this.canvas.toDataURL('image/png');
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

Game.prototype.sendLink = function(type, data) {
  Screen.prototype.setTitle.call(this, 'Sending...');

  socket.emit('finishedLink', {
    link: {
      type,
      data
    }
  });
  this.onWait();
}

Game.prototype.isDrawingBlank = function() {
  this.blankCanvas.width = this.canvas.width;
  this.blankCanvas.height = this.canvas.height;

  return this.canvas.toDataURL() == this.blankCanvas.toDataURL();
}

Game.prototype.roundOver = function() {
  this.returnToLobby('The round is over!');
}

Game.prototype.someoneLeft = function(data) {
  this.returnToLobby(data.name + ' disconnected.');
}

Game.prototype.returnToLobby = function(message) {
  alert(message);
  this.onRoundEnd();
}

Game.prototype.onDone = function() {

}

Game.prototype.resizeCanvas = function() {
  var container = $('#game-drawing');
  this.canvas.setHeight(container.width());
  this.canvas.setWidth(container.width());
  this.canvas.renderAll();
}


Results.prototype = Object.create(Screen.prototype);

function Results() {
  Screen.call(this);

  this.id = '#result';
}

Results.prototype.initialize = function() {
  $('#result-done').on('click', function() {
    hideAll();
    Screen.prototype.setTitle.call(this, 'Thanks for playing Drawphone!');
    Screen.prototype.setSubtitle.call(this, 'Waiting for other players...');
    socket.emit('doneViewingResults', {});
  });
}

Results.prototype.show = function(data) {
  var ourChain = data.links;
  var ourName = ourChain[0].player.name;

  Screen.prototype.setTitle.call(this, ourName + "'s Drawphone results");
  Screen.prototype.setSubtitle.call(this, 'Show everyone how it turned out!');

  var results = $('#result-content');
  results.empty();

  for (var i = 0; i < data.links.length; i++) {
    var link = data.links[i];
    if (i === 0) {
      results.append('<h3>The first word:</h3><h1>' + link.data + '</h1>');
    } else if (link.type === 'drawing') {
      results.append('<h3>' + link.player.name + ' drew:</h3><img class="drawing" src="' + link.data + '"></img>');
    } else if (link.type === 'word') {
      results.append('<h3>' + link.player.name + ' thought that was:</h3><h1>' + link.data + '</h1>');
    } else {
      console.log('Results: We should never get here');
    }
  }

  Screen.prototype.show.call(this);
}


Waiting.prototype = Object.create(Screen.prototype);

function Waiting() {
  Screen.call(this);

  this.id = '#waiting';
  Screen.prototype.setTitle.call(this, 'Waiting for other players...');
  Screen.prototype.setSubtitle.call(this, 'Game in progress');
  this.userList = new UserList($('#waiting-players'));
}

Waiting.prototype.updateWaitingList = function(data) {
  this.userList.update(data.players);
}


function UserList(ul) {
  this.ul = ul;
}

UserList.prototype.update = function(newList) {
  //clear all of the user boxes using jquery
  this.ul.empty();

  for (var i = 0; i < newList.length; i++) {
    var listBox = $('<span></span>')
    var listItem = $('<li>' + newList[i].name + '</li>').appendTo(listBox);
    listItem.addClass('user');
    listBox.addClass('col-xs-6');
    listBox.addClass('user-container');
    listBox.appendTo(this.ul);
  }
}


//
//  Main
//

var socket = io();

//try to join the dev game
var relativeUrl = window.location.pathname + window.location.search;
if (relativeUrl === "/dev") {
  socket.emit('joinGame', {
    code: 'ffff',
    name: Math.random().toString()
  });
}

var drawphone = new Drawphone();
drawphone.initializeAll();
drawphone.begin();
