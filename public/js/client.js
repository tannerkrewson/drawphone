//
//  Drawphone Client
//  By Tanner Krewson
//

/* global $, swal, fabric, io, ga */

//blocks use of https, required for the uploads.im api,
//  as it does not have https
//not required for imgur api

/*window.onload = function () {
	$(function () {
		if (window.location.protocol === 'https:')
			window.location.protocol = 'http';
	});
};*/


//prevent page from refreshing when Join game buttons are pressed
$(function () {
	$('form').submit(function () {
		return false;
	});
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
	$('#replace').addClass('hidden');
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

function getDataUrlAsync(canvas, next) {
	setTimeout(function () {
		var dataUrl = canvas.toDataURL();
		next(dataUrl);
	}, 10);
}

// http://stackoverflow.com/questions/20618355/the-simplest-possible-javascript-countdown-timer
function startTimer(duration, onTick) {
	var timer = duration,
		minutes, seconds;

	var tick = function () {
		minutes = parseInt(timer / 60, 10);
		seconds = parseInt(timer % 60, 10);

		minutes = minutes < 10 ? '0' + minutes : minutes;
		seconds = seconds < 10 ? '0' + seconds : seconds;

		onTick(minutes + ':' + seconds);

		if (--timer < 0) {
			timer = duration;
		}
	};

	tick();
	return setInterval(tick, 1000);
}

//sorry
var globalGameCode = '';


//
//  Objects
//

function Drawphone() {
	this.screens = [];

	var self = this;
	this.mainMenu = new MainMenu(function () {
		//ran when Join Game button is pressed
		self.joinMenu.show();
	}, function () {
		//ran when New Game button is pressed
		self.newMenu.show();
	});

	this.joinMenu = new JoinMenu(function () {
		//ran when Back button is pressed
		self.mainMenu.show();
	});

	this.newMenu = new NewMenu(function () {
		//ran when Back button is pressed
		self.mainMenu.show();
	});

	this.lobby = new Lobby();

	this.game = new Game(function () {
		//ran when the player sends
		self.waiting.show();
	});

	this.results = new Results(function () {
		//ran when done button on results page is tapped
		self.lobby.show();
	});

	this.waiting = new Waiting();

	this.replace = new Replace();

	this.screens.push(this.mainMenu);
	this.screens.push(this.joinMenu);
	this.screens.push(this.newMenu);
	this.screens.push(this.lobby);
	this.screens.push(this.game);
	this.screens.push(this.results);
	this.screens.push(this.waiting);
	this.screens.push(this.replace);
}

Drawphone.prototype.initializeAll = function () {
	this.screens.forEach(function (screen) {
		screen.initialize();
	});

	this.attachSocketListeners();
};

Drawphone.prototype.attachSocketListeners = function () {

	socket.on('joinGameRes', this.lobby.show.bind(this.lobby));

	socket.on('updatePlayerList', this.lobby.update.bind(this.lobby));

	socket.on('nextLink', this.game.newLink.bind(this.game));

	socket.on('viewResults', this.results.show.bind(this.results));

	socket.on('showWaitingList', this.waiting.show.bind(this.waiting));

	socket.on('updateWaitingList', this.waiting.updateWaitingList.bind(this.waiting));

	socket.on('replacePlayer', this.replace.show.bind(this.replace));
};

Drawphone.prototype.begin = function () {
	this.mainMenu.show();
};


function Screen() {
	this.id = '';
	this.title = 'Loading Drawphone...';
	this.subtitle = 'Just a moment!';

	this.defaultTitle = 'Drawphone';
	this.defaultSubtitle = 'Telephone with pictures';
}

Screen.prototype.initialize = function () {};

Screen.prototype.show = function () {
	hideAll();
	showElement(this.id);

	$('#title').html(this.title);
	$('#subtitle').text(this.subtitle);
};

Screen.prototype.setTitle = function (title) {
	this.title = title;
	$('#title').html(this.title);
};

Screen.prototype.setSubtitle = function (subtitle) {
	this.subtitle = subtitle;
	$('#subtitle').html(this.subtitle);
};

Screen.prototype.showTitles = function () {
	$('#title').html(this.title);
	$('#subtitle').html(this.subtitle);
};

Screen.prototype.setDefaultTitles = function () {
	this.setTitle(this.defaultTitle);
	this.setSubtitle(this.defaultSubtitle);
};


MainMenu.prototype = Object.create(Screen.prototype);

function MainMenu(onJoin, onNew) {
	Screen.call(this);

	this.id = '#mainmenu';
	this.joinButton = $('#joinbtn');
	this.newButton = $('#newbtn');
	this.howButton = $('#howbtn');
	this.ssButton = $('#ssbtn');
	this.mgButton = $('#mgbtn');
	this.onJoin = onJoin;
	this.onNew = onNew;

	Screen.prototype.setDefaultTitles.call(this);
}

MainMenu.prototype.initialize = function () {
	Screen.prototype.initialize.call(this);

	this.joinButton.click(this.onJoin);
	this.newButton.click(this.onNew);
	this.howButton.click(function () {
		window.location.href = '/how-to-play';
	});
	this.ssButton.click(function () {
		window.location.href = '/screenshots';
	});
	this.mgButton.click(function () {
		window.location.href = '/more-games';
	});
};

Lobby.prototype.show = function () {
	socket.off('disconnect');

	Lobby.prototype.show.call(this);
};


JoinMenu.prototype = Object.create(Screen.prototype);

function JoinMenu(onBack) {
	Screen.call(this);

	this.id = '#joinmenu';
	this.backButton = $('#joinmenu-back');
	this.goButton = $('#joinmenu-go');
	this.codeInput = $('#joinincode');
	this.onBack = onBack;

	Screen.prototype.setDefaultTitles.call(this);
}

JoinMenu.prototype.initialize = function () {
	Screen.prototype.initialize.call(this);

	this.backButton.click(this.onBack);
	this.goButton.click(function () {
		var code = $('#joinincode').val();
		var name = $('#joininname').val();

		socket.emit('joinGame', {
			code: code,
			name: name
		});
	});

	var self = this;
	this.codeInput.on('keyup', function () {
		self.codeInput.val(self.codeInput.val().toLowerCase());
	});

	Screen.prototype.setDefaultTitles.call(this);
};


NewMenu.prototype = Object.create(Screen.prototype);

function NewMenu(onBack) {
	Screen.call(this);

	this.id = '#newmenu';
	this.backButton = $('#newmenu-back');
	this.goButton = $('#newmenu-go');
	this.onBack = onBack;

	Screen.prototype.setDefaultTitles.call(this);
}

NewMenu.prototype.initialize = function () {
	Screen.prototype.initialize.call(this);

	this.backButton.click(this.onBack);
	this.goButton.click(function () {
		var name = $('#newinname').val();

		socket.emit('newGame', {
			name: name
		});
	});
};


Lobby.prototype = Object.create(Screen.prototype);

function Lobby() {
	Screen.call(this);

	this.id = '#lobby';
	this.leaveButton = $('#lobby-leave');
	this.startButton = $('#lobby-start');
	this.gameSettings = $('#lobby-settings');
	this.timeLimitDropdown = $('#lobby-settings-timelimit');
	this.wordPackDropdown = $('#lobby-settings-wordpack');
	this.viewPreviousResultsButton = $('#lobby-prevres');
	this.gameCode = '';
	this.completedOptions = [];

	//this is what the admin selects from the dropdowns
	this.selectedTimeLimit = false;
	this.wordPack = false;

	this.userList = new UserList($('#lobby-players'));
}

Lobby.prototype.initialize = function () {
	Screen.prototype.initialize.call(this);

	var self = this;
	this.leaveButton.click(function () {
		ga('send', 'event', 'Lobby', 'leave');
		//refresh the page
		location.reload();
	});
	this.startButton.click(function () {
		if (self.selectedTimeLimit !== false && self.wordPack !== false && self.userList.numberOfPlayers > 1) {
			socket.emit('tryStartGame', {
				timeLimit: self.selectedTimeLimit,
				wordPackName: self.wordPack
			});
			ga('send', 'event', 'Game', 'start');
			ga('send', 'event', 'Game', 'time limit', self.selectedTimeLimit);
			ga('send', 'event', 'Game', 'word pack', self.wordPack);
			ga('send', 'event', 'Game', 'number of players', self.userList.numberOfPlayers);
		} else {
			ga('send', 'event', 'Lobby', 'disallowed start attempt');
		}
	});
	this.timeLimitDropdown.on('change', function () {

		switch (self.timeLimitDropdown[0].value) {
		case 'No time limit (recommended)':
			self.selectedTimeLimit = 0;
			break;
		case '5 seconds':
			self.selectedTimeLimit = 5;
			break;
		case '10 seconds':
			self.selectedTimeLimit = 10;
			break;
		case '15 seconds':
			self.selectedTimeLimit = 15;
			break;
		case '30 seconds':
			self.selectedTimeLimit = 30;
			break;
		case '1 minute':
			self.selectedTimeLimit = 60;
			break;
		}

		self.checkIfReadyToStart('time-limit');
	});
	this.wordPackDropdown.on('change', function () {
		self.wordPack = self.wordPackDropdown[0].value;
		self.checkIfReadyToStart('word-pack');

		ga('send', 'event', 'Lobby', 'word pack change', self.wordPack);
	});
	this.viewPreviousResultsButton.click(function () {
		socket.emit('viewPreviousResults', {});

		ga('send', 'event', 'Lobby', 'view previous results');
	});
	ga('send', 'event', 'Lobby', 'created');
};

Lobby.prototype.show = function (data) {
	socket.on('disconnect', function () {
		swal('Connection lost!', 'Reloading...', 'error');
		//refresh the page
		location.reload();
	});

	//if this was called by a socket.io event
	if (data) {
		if (data.success) {
			globalGameCode = '<span class="gamecode">' + data.game.code + '</span>';
			this.selectedTimeLimit = false;
			this.update({
				success: true,
				gameCode: data.game.code,
				player: data.you,
				data: {
					players: data.game.players,
					canViewLastRoundResults: data.game.canViewLastRoundResults
				}
			});

		} else {
			swal(data.error, '', 'error');
			return;
		}
	} else {
		//reset the time limit selector
		this.selectedTimeLimit = false;
		this.timeLimitDropdown.prop('selectedIndex', 0);

		//reset the word pack selector
		this.wordPack = false;
		this.wordPackDropdown.prop('selectedIndex', 0);

		//grey-out start button
		this.startButton.addClass('disabled');
	}

	Screen.prototype.show.call(this);
};

Lobby.prototype.update = function (res) {
	if (res.success) {
		globalGameCode = '<span class="gamecode">' + res.gameCode + '</span>';
		this.title = 'Game Code: <span class="gamecode">' + res.gameCode + '</span>';
		this.subtitle = 'Waiting for players...';
		this.userList.update(res.data.players);

		if (res.player.isAdmin) {
			//show the start game button
			this.startButton.removeClass('hidden');
			//show the game Settings
			this.gameSettings.removeClass('hidden');
		} else {
			this.startButton.addClass('hidden');
			this.gameSettings.addClass('hidden');
		}

		if (res.data.canViewLastRoundResults) {
			this.viewPreviousResultsButton.removeClass('hidden');
		} else {
			this.viewPreviousResultsButton.addClass('hidden');
		}
	} else {
		swal('Error updating lobby', res.error, 'error');
	}
};

Lobby.prototype.updatePlayerList = function (list) {
	this.userList.update(list);
};

Lobby.prototype.checkIfReadyToStart = function (optionName) {
	//the completedOptions variable stores the name of all of the
	//	admin options that have been completed so far

	//if optionName is not already completed, add it.
	if (this.completedOptions.indexOf(optionName) === -1) {
		this.completedOptions.push(optionName);
	}

	//once the variable is equal to the number of options the admin must select,
	//	undisable the start button
	//right now there are two options, time limit and word pack
	if (this.completedOptions.length === 2) {
		//reset the variable for next time
		this.completedOptions = [];

		//un-grey-out start button
		this.startButton.removeClass('disabled');
	}
};


Game.prototype = Object.create(Screen.prototype);

function Game(onWait) {
	Screen.call(this);

	this.id = '#game';
	this.onWait = onWait;

	this.wordInput = $('#game-word-in');
	this.timerDisplay = $('#game-timer');

	//initialize fabric.js
	this.canvas = new fabric.Canvas('game-drawing-canvas');
	this.canvas.isDrawingMode = true;
	this.isCanvasBlank = true;

	this.submitTimer;

	window.addEventListener('resize', this.resizeCanvas.bind(this), false);
}

Game.prototype.initialize = function () {
	Screen.prototype.initialize.call(this);
	var doneButton = $('#game-send');

	//bind clear canvas to clear drawing button
	var self = this;
	$('#game-cleardrawing').click(function () {
		self.canvas.clear();
		self.isCanvasBlank = true;
	});

	//if user touches the canvas, it not blank no more
	$('#game-drawing').on('mousedown touchstart', function () {
		//if this is their first mark
		if (self.isCanvasBlank && self.timeLimit > 0 && !self.submitTimer) {
			//start the timer
			self.displayTimerInterval = startTimer(self.timeLimit, function (timeLeft) {
				self.timerDisplay.text(timeLeft + ' left to finish your drawing');
			});
			self.submitTimer = window.setTimeout(function () {
				//when the time runs out...
				//we don't care if it is blank
				self.isCanvasBlank = false;
				//submit
				self.onDone();
				ga('send', 'event', 'Drawing', 'timer forced submit', self.timeLimit);
			}, self.timeLimit * 1000);
		}
		self.isCanvasBlank = false;
	});

	doneButton.click(function () {
		self.onDone();
	});

	//run done when enter key is pressed in word input
	$('#game-word-in').keypress(function (e) {
		var key = e.which;
		if (key === 13) {
			self.onDone();
		}
	});

};

Game.prototype.show = function () {
	Screen.prototype.show.call(this);
	Screen.prototype.setSubtitle.call(this, 'Game code: ' + globalGameCode);

	//allow touch events on the canvas
	$('#game-drawing').css('pointer-events', 'auto');
	this.done = false;
};

Game.prototype.showDrawing = function (disallowChanges) {
	var shouldShowClearButton;

	showElement('#game-drawing');
	this.show();

	if (this.timeLimit > 0) {
		this.timerDisplay.text('Begin drawing to start the timer.');

		if (this.timeLimit <= 5) {
			//if the time limit is less than 5 seconds
			//	don't show the clear button
			//because players don't really have enough time to try drawing again
			//	when they only have 5 seconds
			shouldShowClearButton = false;
		} else {
			shouldShowClearButton = true;
		}
	} else {
		this.timerDisplay.text('No time limit to draw.');
		shouldShowClearButton = true;
	}

	if (disallowChanges) {
		//lock the canvas so the user can't make any changes
		$('#game-drawing').css('pointer-events', 'none');
		shouldShowClearButton = false;
	}

	this.showButtons(shouldShowClearButton);
};

Game.prototype.showWord = function () {
	showElement('#game-word');
	this.showButtons(false);
	this.show();
};

Game.prototype.showButtons = function (showClearButton) {
	if (showClearButton) {
		showElement('#game-cleardrawing');
	} else {
		$('#game-cleardrawing').addClass('hidden');
	}
	showElement('#game-buttons');
};

Game.prototype.hideBoth = function () {
	$('#game-drawing').addClass('hidden');
	$('#game-word').addClass('hidden');
	$('#game-buttons').addClass('hidden');
};

Game.prototype.newLink = function (res) {
	var lastLink = res.data.link;
	var lastLinkType = lastLink.type;
	var count = res.data.count;
	var finalCount = res.data.finalCount;
	var newLinkType = oppositeLinkType(lastLinkType);
	this.timeLimit = res.data.timeLimit;

	if (lastLinkType === 'drawing') {
		//show the previous drawing
		$('#game-word-drawingtoname').attr('src', lastLink.data);

		Screen.prototype.setTitle.call(this, 'What is this a drawing of?');

		//show the word creator
		this.showWord();
	} else if (lastLinkType === 'word') {
		//clear the previous drawing
		this.canvas.clear();
		this.isCanvasBlank = true;

		Screen.prototype.setTitle.call(this, 'Please draw: ' + lastLink.data);

		//show drawing creator
		this.showDrawing();

		//calculate size of canvas dynamically
		this.resizeCanvas();
	}

	Screen.prototype.setSubtitle.call(this, this.subtitle + ' &nbsp; - &nbsp; ' + count + '/' + finalCount);

	//this will be ran when the done button is clicked, or
	//  the enter key is pressed in the word input
	this.onDone = function () {
		this.checkIfDone(newLinkType);
	};
};

Game.prototype.checkIfDone = function (newLinkType) {
	this.done = true;

	//disable the submit timer to prevent duplicate sends
	clearTimeout(this.submitTimer);
	clearInterval(this.displayTimerInterval);
	this.submitTimer = undefined;
	this.displayTimerInterval = undefined;

	//hide the drawing
	this.hideBoth();

	var newLink;
	var self = this;
	if (newLinkType === 'drawing') {
		if (this.isCanvasBlank) {
			self.showDrawing();
			swal('Your picture is blank!', 'Please draw a picture, then try again.', 'info');
		} else {
			self.uploadCanvas(function (url) {
				//ran if upload was successful
				newLink = url;
				self.sendLink(newLinkType, newLink);
			}, function (e) {
				//ran if upload was unsuccessful
				//reshow the canvas and allow the user to try again
				self.showDrawing(true);
				swal('Upload failed, try again.', e, 'error');
				Screen.prototype.setTitle.call(self, 'Upload failed, try again.');
			});
		}
	} else if (newLinkType === 'word') {
		newLink = $('#game-word-in').val().trim();
		//check if it is blank
		if (newLink === '') {
			self.showWord();
			swal('Your guess is blank!', 'Please enter a guess, then try again.', 'info');
		} else {
			//clear the input
			$('#game-word-in').val('');
			this.sendLink(newLinkType, newLink);
		}
	}
};

Game.prototype.uploadCanvas = function (next, err) {
	// this code was sourced from:
	// http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery/8244082#8244082
	Screen.prototype.setTitle.call(this, 'Processing...');
	getDataUrlAsync(this.canvas, function (file) {
		var blob = window.dataURLtoBlob(file);
		var formData = new FormData();

		uploadToPigy(blob, formData, next, err);

		Screen.prototype.setTitle.call(this, 'Uploading...');
	});


};

function uploadToPigy(blob, formData, next, err) {
	formData.append('file', blob, 'drawing.png');
	$.ajax({
		url: 'http://pi.gy/api/image',
		data: formData,
		processData: false,
		contentType: false,
		type: 'POST',
		success: function (res) {
			if (res.success) {
				var url = res.image.url;
				next(url);
				ga('send', 'event', 'Drawing', 'upload', 'pigy');
			} else {
				Screen.prototype.setTitle.call(this, 'Upload failed, trying again.');
				uploadToSpiky(blob, formData, next, err);
			}
		},
		error: function () {
			Screen.prototype.setTitle.call(this, 'Upload failed, trying again.');
			uploadToSpiky(blob, formData, next, err);
		}
	});
}

function uploadToSpiky(blob, formData, next, err) {
	formData.append('file', blob, 'drawing.png');
	$.ajax({
		url: 'https://spiky.io/up',
		data: formData,
		processData: false,
		contentType: false,
		type: 'POST',
		success: function (res) {
			if (res.r && res.r === '1') {
				var url = 'https://spiky.io/' + res.f + '.png';
				next(url);
				ga('send', 'event', 'Drawing', 'upload', 'spiky');
			} else {
				console.log(res);
				Screen.prototype.setTitle.call(this, 'Upload failed again, one more try.');
				uploadToImgur(blob, formData, next, err);
			}
		},
		error: function () {
			Screen.prototype.setTitle.call(this, 'Upload failed again, one more try.');
			uploadToImgur(blob, formData, next, err);
		}
	});
}

function uploadToImgur(blob, formData, next, err) {
	formData.append('image', blob, 'drawing.png');
	$.ajax({
		url: 'https://api.imgur.com/3/upload',
		headers: {
			'Authorization': 'Client-ID 457a07332e1ec67'
		},
		data: formData,
		processData: false,
		contentType: false,
		type: 'POST',
		success: function (res) {
			if (res.status === 200) {
				var url = res.data.link;
				next(url);
				ga('send', 'event', 'Drawing', 'upload', 'imgur');
			} else {
				err('Error Code: A' + res.status);
			}
		},
		error: function (xmlReq) {
			if (xmlReq.status === 429) {
				err('Imgur image upload limit exceeded.');
			} else {
				err('Error Code: B' + xmlReq.status);
			}
		}
	});
}

Game.prototype.sendLink = function (type, data) {
	Screen.prototype.setTitle.call(this, 'Sending...');

	socket.emit('finishedLink', {
		link: {
			type: type,
			data: data
		}
	});
	ga('send', 'event', 'Link', 'submit', type);
	this.onWait();
};

Game.prototype.resizeCanvas = function () {
	var container = $('#game-drawing');
	this.canvas.setHeight(container.width());
	this.canvas.setWidth(container.width());
	this.canvas.renderAll();
};

Game.prototype.setTimer = function () {
	if (this.timeLimit && !this.timeLimit === 0) {
		window.setTimeout();
	}
};


Results.prototype = Object.create(Screen.prototype);

function Results(onDoneViewingResults) {
	Screen.call(this);

	this.onDoneViewingResults = onDoneViewingResults;

	this.id = '#result';
}

Results.prototype.initialize = function () {
	var self = this;
	$('#result-done').on('click', function () {
		self.onDoneViewingResults();
	});
};

Results.prototype.show = function (res) {
	var chains = res.data.chains;
	var ourChain;
	for (var i = 0; i < chains.length; i++) {
		var chain = chains[i];
		if (chain.owner.id === res.you.id) {
			ourChain = chain;
			break;
		}
	}

	//if we don't own a chain, just show the first one
	if (ourChain) {
		this.render(ourChain, chains);
	} else {
		this.render(chains[0], chains);
	}

	Screen.prototype.show.call(this);
};

Results.prototype.render = function (chainToShow, allChains) {
	Screen.prototype.setTitle.call(this, chainToShow.owner.name + '\'s Drawphone results');
	var subtitle = 'Now, take turns holding up your phones where everyone can see, and reading off your results to the group.';
	Screen.prototype.setSubtitle.call(this, subtitle);
	this.displayChain(chainToShow);
	this.displayOtherChainButtons(allChains, chainToShow);
};

Results.prototype.displayChain = function (chain) {
	var results = $('#result-content');
	results.empty();

	for (var i = 0; i < chain.links.length; i++) {
		var link = chain.links[i];
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

	var wentFromBox = '';
	wentFromBox += '<br><div class="well">';
	wentFromBox += '<h4>You started with:</h4><h2>' + chain.links[0].data + '</h2><br>';
	wentFromBox += '<h4>and ended up with:</h4><h2>' + chain.links[chain.links.length-1].data + '</h2>';
	wentFromBox += '</div>';
	results.append(wentFromBox);
};

Results.prototype.displayOtherChainButtons = function (chainsToList, chainToIgnore) {
	var others = $('#result-others');
	others.empty();

	var self = this;
	for (var i = 0; i < chainsToList.length; i++) {
		var chain = chainsToList[i];

		//only make a button for the chain if it is not the one we are now displaying
		if (chain.id !== chainToIgnore.id) {
			var button = $('<button type="button">' + chain.owner.name + '\'s results</button>');
			button.addClass('btn btn-default btn-lg');
			(function (thisChain, chainList) {
				button.click(function () {
					self.render(thisChain, chainList);

					//jump to top of the page
					window.scrollTo(0, 0);

					ga('send', 'event', 'Results', 'display another chain');
				});
			})(chain, chainsToList);
			others.append(button);
		}

	}
};


Waiting.prototype = Object.create(Screen.prototype);

function Waiting() {
	Screen.call(this);

	this.id = '#waiting';
	Screen.prototype.setTitle.call(this, 'Waiting for other players...');
	this.userList = new UserList($('#waiting-players'));
}

Waiting.prototype.show = function () {
	Screen.prototype.setSubtitle.call(this, $('subtitle').html());
	Screen.prototype.show.call(this);
};


Waiting.prototype.updateWaitingList = function (res) {
	//show/hide the admin notice
	if (res.you.isAdmin) {
		$('#waiting-adminmsg').removeClass('hidden');
	} else {
		$('#waiting-adminmsg').addClass('hidden');
	}
	var notFinished = res.data.notFinished;
	var disconnected = res.data.disconnected;
	this.userList.update(notFinished, disconnected, function (tappedPlayer) {
		//ran when the client taps one of the usernames
		if (res.you.isAdmin) {
			swal({
				title: 'Kick ' + tappedPlayer.name + '?',
				text: 'Someone will have to join this game to replace them.',
				type: 'warning',
				showCancelButton: true,
				confirmButtonClass: 'btn-danger',
				confirmButtonText: 'Kick',
				closeOnConfirm: false
			}, function () {
				socket.emit('kickPlayer', {
					playerToKick: tappedPlayer
				});
				swal('Done!', tappedPlayer.name + ' was kicked.', 'success');
				ga('send', 'event', 'User list', 'Admin kick player');
			});
			ga('send', 'event', 'User list', 'Admin tap player');
		}
	});

};


Replace.prototype = Object.create(Screen.prototype);

function Replace() {
	Screen.call(this);
	this.id = '#replace';
	Screen.prototype.setTitle.call(this, 'Choose a player to replace');
}

Replace.prototype.initialize = function () {
	$('#replace-leave').click(function () {
		//refresh the page
		location.reload();
	});
	Screen.prototype.initialize.call(this);
};

Replace.prototype.show = function (data) {
	globalGameCode = '<span class="gamecode">' + data.gameCode + '</span>';
	Screen.prototype.setSubtitle.call(this, 'Ready to join game...');

	var choices = $('#replace-choices');
	var players = data.players;

	choices.empty();

	var self = this;
	players.forEach(function (player) {
		var button = $('<button type="button">' + player.name + '</button>');
		button.addClass('btn btn-default btn-lg');
		button.click(function () {
			self.sendChoice(player);
		});
		choices.append(button);
		choices.append('<br>');
	});
	Screen.prototype.show.call(this);
};

Replace.prototype.sendChoice = function (playerToReplace) {
	socket.emit('tryReplacePlayer', {
		playerToReplace: playerToReplace
	});
	ga('send', 'event', 'Player replacement', 'replace', self.timeLimit);
};


function UserList(ul) {
	this.ul = ul;
	this.numberOfPlayers = 0;
}

UserList.prototype.update = function (newList, disconnectedList, onPress) {
	//clear all of the user boxes using jquery
	this.ul.empty();

	this.draw(newList, false, onPress);
	if (disconnectedList) {
		if (disconnectedList.length > 0) {
			$('#waiting-disconnectedmsg').removeClass('hidden');
			this.draw(disconnectedList, true);
		} else {
			$('#waiting-disconnectedmsg').addClass('hidden');
		}
	}
};

UserList.prototype.draw = function (list, makeBoxDark, onPress) {
	this.numberOfPlayers = 0;
	for (var i = 0; i < list.length; i++) {
		this.numberOfPlayers++;
		var listBox = $('<span></span>');
		var listItem = $('<li>' + list[i].name + '</li>').appendTo(listBox);
		listItem.addClass('user');
		if (makeBoxDark) {
			listItem.addClass('disconnected');
		}
		listBox.addClass('col-xs-6');
		listBox.addClass('user-container');
		if (onPress) {
			(function (player) {
				listBox.click(function () {
					onPress(player);
				});
			})(list[i]);
		}
		listBox.appendTo(this.ul);
	}
};


//
//  Main
//

var socket = io();

//try to join the dev game
var relativeUrl = window.location.pathname + window.location.search;

if (relativeUrl === '/dev') {
	socket.emit('joinGame', {
		code: 'ffff',
		name: Math.random().toString().substring(2, 6)
	});
}

var drawphone = new Drawphone();
drawphone.initializeAll();
drawphone.begin();
