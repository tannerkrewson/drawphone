//
// Drawphone Player
//

function Player(name, socket, id) {
	this.name = name;
	this.socket = socket;
	this.id = id;
	this.isHost = false;
	this.isConnected = true;
}

Player.prototype.getJson = function() {
	return {
		name: this.name,
		id: this.id,
		isHost: this.isHost,
		isConnected: this.isConnected,
		isAi: !!this.isAi
	};
};

Player.prototype.send = function(event, data) {
	this.socket.emit(event, {
		you: this.getJson(),
		data
	});
};

Player.prototype.sendThen = function(event, data, onEvent, next) {
	this.socket.once(onEvent, next);
	this.send(event, data);
};

Player.prototype.makeHost = function() {
	this.isHost = true;
	// update lobby (enable settings for new host)
	this.socket.emit("hostUpdatedSettings");
};

module.exports = Player;
