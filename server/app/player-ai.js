const got = require("got");

var Player = require("./player");

class PlayerAI extends Player {
	#lastCallback;

	constructor(name, socket, id) {
		super(name, {}, id);

		this.socket = {
			once: this.once.bind(this),
			emit: this.emit.bind(this)
		};
	}

	once(event, callback) {
		if (event === "finishedLink") {
			this.#lastCallback = callback;
		}
	}

	emit(event, data) {
		if (event !== "nextLink") return;

		const {
			data: {
				link: { data: linkContent, type: linkType }
			}
		} = data;

		let link = { player: this.getJson() };

		if (linkType === "word") {
			link.type = "drawing";
			got("https://pixabay.com/api/", {
				searchParams: {
					key: "XXX",
					q: linkContent
				}
			})
				.json()
				.then(({ hits }) => {
					if (hits.length === 0) {
						link.data = "https://picsum.photos/500";
					} else {
						link.data = hits[0].webformatURL;
					}
					this.#lastCallback({ link });
				});
		} else if (linkType === "drawing") {
			link.type = "word";
			link.data = "randomword";
		}
	}

	static wordToDrawing() {}
}

module.exports = PlayerAI;
