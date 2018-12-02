//
// Drawphone Player
//

class Player {
	constructor(name, socket, id) {
		this.name = name;
		this.socket = socket;
		this.id = id;
		this.isAdmin = false;
		this.isConnected = true;
	}

	getJson() {
		return {
			name: this.name,
			id: this.id,
			isAdmin: this.isAdmin,
			isConnected: this.isConnected
		};
	}

	send(event, data) {
		this.socket.emit(event, {
			you: this.getJson(),
			data
		});
	}

	sendThen(event, data, onEvent, next) {
		this.send(event, data);
		this.socket.once(onEvent, next);
	}

	makeAdmin() {
		this.isAdmin = true;
	}
}

module.exports = Player;
