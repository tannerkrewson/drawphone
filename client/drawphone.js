import Game from "./screen/game.js";
import JoinMenu from "./screen/joinmenu.js";
import Lobby from "./screen/lobby.js";
import MainMenu from "./screen/mainmenu.js";
import NewMenu from "./screen/newmenu.js";
import Replace from "./screen/replace.js";
import Results from "./screen/results.js";
import Waiting from "./screen/waiting.js";

class Drawphone {
    constructor({ socket, rocketcrabMode }) {
        this.screens = [];
        this.socket = socket;
        this.rocketcrabMode = rocketcrabMode;

        this.mainMenu = new MainMenu(
            () => {
                //ran when Join Game button is pressed
                this.joinMenu.show();
            },
            () => {
                //ran when New Game button is pressed
                this.newMenu.show();
            }
        );

        this.joinMenu = new JoinMenu(() => {
            //ran when Back button is pressed
            this.mainMenu.show();
        });

        this.newMenu = new NewMenu(() => {
            //ran when Back button is pressed
            this.mainMenu.show();
        });

        this.lobby = new Lobby();

        this.game = new Game(() => {
            //ran when the player sends
            this.waiting.show();
        });

        this.results = new Results(() => {
            //ran when done button on results page is tapped
            this.lobby.show();
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

    initializeAll() {
        this.screens.forEach((screen) => {
            screen.initialize({
                socket: this.socket,
                rocketcrabMode: this.rocketcrabMode,
            });
        });

        this.attachSocketListeners();
    }

    attachSocketListeners() {
        this.socket.on("joinGameRes", this.lobby.show.bind(this.lobby));

        this.socket.on("updatePlayerList", this.lobby.update.bind(this.lobby));

        this.socket.on("updateSettings", this.lobby.update.bind(this.lobby));

        this.socket.on("nextLink", this.game.newLink.bind(this.game));

        this.socket.on("viewResults", this.results.show.bind(this.results));

        this.socket.on("showWaitingList", this.waiting.show.bind(this.waiting));

        this.socket.on(
            "updateWaitingList",
            this.waiting.updateWaitingList.bind(this.waiting)
        );

        this.socket.on("replacePlayer", this.replace.show.bind(this.replace));
    }

    begin() {
        this.mainMenu.show();
    }
}

export default Drawphone;
