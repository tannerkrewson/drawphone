//
// Drawphone Player
//

function Player(name, socket, id) {
	this.name = name;
	this.socket = socket;
	this.id = id;
	this.isAdmin = false;
	this.isConnected = true;
}

Player.prototype.getJson = function() {
	return {
		name: this.name,
		id: this.id,
		isAdmin: this.isAdmin,
		isConnected: this.isConnected
	};
};

Player.prototype.send = function(event, data) {
	this.socket.emit(event, {
		you: this.getJson(),
		data
	});
};

Player.prototype.sendThen = function(event, data, onEvent, next) {
	this.send(event, data);
	this.socket.once(onEvent, next);
};

Player.prototype.makeAdmin = function() {
	this.isAdmin = true;
};

module.exports = Player;
