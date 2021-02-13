//
// Drawphone Player
//

class Player {
    constructor(name, socket, id) {
        this.name = name;
        this.socket = socket;
        this.id = id;
        this.isHost = false;
        this.isConnected = true;
    }

    getJson() {
        return {
            name: this.name,
            id: this.id,
            isHost: this.isHost,
            isConnected: this.isConnected,
            isAi: !!this.isAi,
        };
    }

    send(event, data) {
        this.socket.emit(event, {
            you: this.getJson(),
            data,
        });
    }

    sendThen(event, data, onEvent, next) {
        this.socket.once(onEvent, next);
        this.send(event, data);
    }

    makeHost() {
        this.isHost = true;
        // update lobby (enable settings for new host)
        this.socket.emit("hostUpdatedSettings");
    }
}

export default Player;
