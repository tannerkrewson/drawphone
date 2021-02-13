//
// Drawphone Chain
//

import WordLink from "./link/wordlink.js";

import FirstWordLink from "./link/firstwordlink.js";

// A chain is the 'chain' of drawings and words.
// A link is the individual drawing or word in the chain.
class Chain {
    constructor(firstWord, owner, id, timeLimit, showNeighbors, playerList) {
        this.owner = owner;
        this.links = [];
        this.id = id;
        this.timeLimit = timeLimit;
        this.showNeighbors = showNeighbors;
        this.playerList = playerList;

        this.lastPlayerSentTo = owner.getJson();

        if (!firstWord) {
            this.addLink(new FirstWordLink(this.owner));
        } else {
            this.addLink(new WordLink(this.owner, firstWord));
        }
    }

    addLink(link) {
        this.links.push(link);
    }

    getLastLink() {
        return this.links[this.links.length - 1];
    }

    getLength() {
        if (this.links[0] && this.links[0].type === "first-word") {
            return this.links.length - 1;
        }
        return this.links.length;
    }

    //returns true if the player has a link in this chain already
    playerHasLink({ id }) {
        for (let i = 0; i < this.links.length; i++) {
            if (this.links[i].player.id === id) {
                return true;
            }
        }
        return false;
    }

    sendLastLinkToThen(player, finalCount, next) {
        let count = this.getLength();
        if (this.links[0] && this.links[0].type === "first-word") {
            count++;
        } else {
            finalCount--;
        }
        //sends the link, then runs the second function
        //  when the 'finishedLink' event is received
        player.sendThen(
            "nextLink",
            {
                link: this.getLastLink(),
                chainId: this.id,
                count,
                finalCount,
                timeLimit: this.timeLimit,
                showNeighbors: this.showNeighbors,
                players: this.showNeighbors ? this.playerList : null,
                thisPlayer: player.getJson(),
            },
            "finishedLink",
            next
        );
    }

    getJson() {
        return {
            owner: this.owner.getJson(),
            links: this.links,
            id: this.id,
        };
    }
}

export default Chain;
