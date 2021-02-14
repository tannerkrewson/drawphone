import got from "got";
import crypto from "crypto";

import Player from "./player.js";

// for shutterstock
const [username, password] = (process.env.SHUTTERSTOCK_API_TOKEN || "").split(
    ":"
);
class PlayerAI extends Player {
    constructor(name, socket, id) {
        super(name, {}, id);

        this.isAi = true;

        this.socket = {
            once: this.once.bind(this),
            emit: this.emit.bind(this),
            disconnect: () => {},
        };
    }

    once(event, callback) {
        if (event === "finishedLink") {
            this.lastCallback = callback;
        }
    }

    async emit(event, data) {
        if (event !== "nextLink") return;

        const {
            data: {
                link: { data: linkContent, type: linkType },
            },
        } = data;

        let link = { player: this.getJson() };

        if (linkType === "word") {
            const image =
                (await PlayerAI.findImageOnShutterstock(linkContent)) ||
                (await PlayerAI.findImageOn123RF(linkContent)) ||
                (await PlayerAI.getRandomImage()) ||
                "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Error.svg/497px-Error.svg.png";

            this.lastCallback({ link: { data: image, type: "drawing" } });
        } else if (linkType === "drawing") {
            link.type = "word";
            this.aiGuessQueue.addWork({
                drawingToGuess: linkContent,
                next: this.lastCallback,
            });
        } else if (linkType === "first-word") {
            this.lastCallback({
                link: { data: this.aiGuessQueue.getRandomWord(), type: "word" },
            });
        }
    }

    setAIGuessQueue(aiGuessQueue) {
        this.aiGuessQueue = aiGuessQueue;
    }

    static async findImageOnShutterstock(word) {
        return got("https://api.shutterstock.com/v2/images/search", {
            username,
            password,
            searchParams: {
                query: word,
                view: "minimal",
                page: 1,
                per_page: 1,
                safe: false,
            },
        })
            .json()
            .then((res) => res.data[0].assets.preview.url)
            .catch(() => false);
    }

    static async findImageOn123RF(word) {
        return got("https://www.123rfapis.com/", {
            searchParams: {
                method: "search",
                keyword: word,
                itemsperpage: 1,
                page: 1,
                source: "123rf",
            },
        })
            .json()
            .then((res) => res[0].images["123RF"].image[0].link_image)
            .catch(() => false);
    }

    static async getRandomImage() {
        return (
            "https://picsum.photos/seed/" +
            crypto.randomBytes(20).toString("hex") +
            "/500/500"
        );
    }
}

export default PlayerAI;
