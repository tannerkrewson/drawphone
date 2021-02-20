//
// Drawphone Round
//

import { knuthShuffle as shuffle } from "knuth-shuffle";
import stripTags from "striptags";

import Chain from "./chain.js";
import AIGuessQueue from "./ai-guess-queue.js";
import DrawingLink from "./link/drawinglink.js";
import WordLink from "./link/wordlink.js";
import { sendResultsToAwsArchive } from "./aws-archive.js";
import WordPacks from "./words.js";
import { getNewTurnLimit } from "../../shared/util.js";

const words = new WordPacks();
words.loadAll();

// https://stackoverflow.com/a/33352604
const arrayFromOneToN = (length, offset = 0) =>
    Array.from({ length }, (_, i) => i + offset);

// https://stackoverflow.com/a/58326608
const rotateArray = (arr, count = 1) => [
    ...arr.slice(count, arr.length),
    ...arr.slice(0, count),
];

// https://math.stackexchange.com/a/4000891
// "In the odd prime case..."
const oddApproxRCLS = (numPlayers, numTurns) => {
    const m = (numPlayers - 1) / 2;

    let result = [arrayFromOneToN(numPlayers)];
    const last = () => result[result.length - 1];

    for (let i = 1; i <= m; i++) {
        const direction = i % 2 === 0 ? -1 : 1;
        result.push(rotateArray(last(), i * direction));
    }

    const mDirection = m % 2 === 0 ? -1 : 1;
    result.push(rotateArray(last(), mDirection));

    for (let i = m - 1; i >= Math.max(1, m - numTurns); i--) {
        const direction = i % 2 === 0 ? 1 : -1;
        result.push(rotateArray(last(), i * direction));
    }

    return result;
};

// https://math.stackexchange.com/a/4000891
// "It is easy to solve the problem when n is even. First..."d
function evenExactRCLS(numPlayers, numTurns) {
    let result = [arrayFromOneToN(numPlayers)];
    const last = () => result[result.length - 1];

    for (let i = 1; i < numTurns; i++) {
        const direction = i % 2 === 0 ? -1 : 1;
        result.push(rotateArray(last(), i * direction));
    }

    return result;
}

const rowCompleteLatinSquare = (numPlayers, numTurns) =>
    numPlayers % 2 === 0
        ? evenExactRCLS(numPlayers, numTurns)
        : oddApproxRCLS(numPlayers, numTurns);

class Round {
    constructor(
        number,
        players,
        timeLimit,
        wordPackName,
        showNeighbors,
        turnLimit,
        onResults
    ) {
        this.number = number;
        this.players = players;
        this.timeLimit = timeLimit;
        this.wordPackName = wordPackName;
        this.showNeighbors = showNeighbors;
        this.onResults = onResults;
        this.chains = [];
        this.linkOrder;
        this.roundNumber = 0;
        this.disconnectedPlayers = [];
        this.potentialPlayers = [];
        this.canViewLastRoundResults = false;
        this.isWordFirstGame = !this.wordPackName;
        this.turnLimit = this.validTurnLimit(turnLimit);

        this.startTime;

        if (this.isWordFirstGame) {
            this.shouldHaveThisManyLinks = 1;
        } else {
            //chains will already have one link
            this.shouldHaveThisManyLinks = 2;
        }

        this.finalNumOfLinks;
        this.aiGuessQueue = new AIGuessQueue(() =>
            words.getRandomWord(
                this.wordPackName || "Simple words (recommended)"
            )
        );
    }

    start() {
        this.aiGuessQueue.reset();

        // demo mode
        if (this.players.length === 1) {
            this.finalNumOfLinks = 6;
        } else {
            this.finalNumOfLinks = this.turnLimit;
        }

        //each player will have to complete one link for how many players there are
        //  the final number of links each chain should have at the end of this
        //  round is number of players + 1, because each chain has an extra link
        //  for the original word
        if (!this.isWordFirstGame) {
            this.finalNumOfLinks++;
        }

        //contrary to the above comment, i now want every chain to end in a word
        // so that the Start to End results box always starts and ends works correctly.
        //to do this, i take away on link if there is an even number of final links
        if (this.finalNumOfLinks % 2 === 0) {
            this.finalNumOfLinks--;
        }

        //shuffle the player list in place
        shuffle(this.players);

        if (!this.isWordFirstGame) {
            this.sendNewChains();
        } else {
            this.sendWordFirstChains();
        }

        // demo mode
        if (this.players.length === 1) {
            this.linkOrder = [[0], [0], [0], [0], [0]];
        } else {
            this.linkOrder = rowCompleteLatinSquare(
                this.players.length,
                this.finalNumOfLinks
            );
        }

        this.startTime = Date.now();
    }

    sendNewChains() {
        let currentChainId = 0;

        const jsonPlayers = this.showNeighbors
            ? this.players.map((player) => player.getJson())
            : null;

        this.players.forEach((player) => {
            if (player.isAi) player.setAIGuessQueue(this.aiGuessQueue);

            //give each player a chain of their own
            const wordToDraw = words.getRandomWord(this.wordPackName);
            const thisChain = new Chain(
                wordToDraw,
                player,
                currentChainId++,
                this.timeLimit,
                this.showNeighbors,
                jsonPlayers
            );
            this.chains.push(thisChain);

            //sends the link, then runs the function when the player sends it back
            //  when the 'finishedLink' event is received
            thisChain.sendLastLinkToThen(
                player,
                this.finalNumOfLinks,
                ({ link }) => {
                    this.receiveLink(player, link, thisChain.id);
                }
            );
        });
    }

    sendWordFirstChains() {
        let currentChainId = 0;

        const jsonPlayers = this.showNeighbors
            ? this.players.map((player) => player.getJson())
            : null;

        this.players.forEach((player) => {
            if (player.isAi) player.setAIGuessQueue(this.aiGuessQueue);

            //give each player a chain of their own
            const thisChain = new Chain(
                false,
                player,
                currentChainId++,
                this.timeLimit,
                this.showNeighbors,
                jsonPlayers
            );
            this.chains.push(thisChain);

            //sends the link, then runs the function when the player sends it back
            //  when the 'finishedLink' event is received
            thisChain.sendLastLinkToThen(
                player,
                this.finalNumOfLinks,
                ({ link }) => {
                    this.receiveLink(player, link, thisChain.id);
                }
            );
        });
    }

    receiveLink(player, { type, data }, chainId) {
        const chain = this.getChain(chainId);

        this.aiGuessQueue.playerAvailableForWork(player);

        if (type === "drawing") {
            chain.addLink(new DrawingLink(player, data));
        } else if (type === "word") {
            chain.addLink(new WordLink(player, stripTags(data)));
        } else {
            console.log(`receivedLink.type is ${type}`);
        }

        this.updateWaitingList();
        this.nextLinkIfEveryoneIsDone();
    }

    nextLinkIfEveryoneIsDone() {
        const listNotFinished = this.getListOfNotFinishedPlayers();
        const areChainsInitialized = this.players.length === this.chains.length;
        const allFinished =
            areChainsInitialized && listNotFinished.length === 0;
        const noneDisconnected = this.disconnectedPlayers.length === 0;

        if (allFinished && noneDisconnected) {
            this.aiGuessQueue.reset();

            //check if that was the last link
            if (this.shouldHaveThisManyLinks === this.finalNumOfLinks) {
                this.viewResults();
            } else {
                this.startNextLink();
            }
        }
    }

    startNextLink() {
        this.shouldHaveThisManyLinks++;

        //the first column of linkOrder has the first player in it
        //  don't send players their own drawings
        this.roundNumber++;

        //distribute the chains to each player
        //  players and chains will have the same length

        for (let i = 0; i < this.players.length; i++) {
            try {
                const thisRoundsLinkOrder = this.linkOrder[this.roundNumber];
                const thisChainIndex = thisRoundsLinkOrder[i];
                const thisChain = this.chains[thisChainIndex];
                const thisPlayer = this.players[i];

                thisChain.lastPlayerSentTo = thisPlayer.getJson();

                //sends the link, then runs the function when the player sends it back
                //  when the 'finishedLink' event is received
                ((chain, player) => {
                    chain.sendLastLinkToThen(
                        player,
                        this.finalNumOfLinks,
                        ({ link }) => {
                            this.receiveLink(player, link, chain.id);
                        }
                    );
                })(thisChain, thisPlayer);
            } catch (error) {
                console.error(error);
                const {
                    roundNumber,
                    linkOrder,
                    shouldHaveThisManyLinks,
                    turnLimit,
                    finalNumOfLinks,
                } = this;
                console.log({
                    roundNumber,
                    linkOrder,
                    shouldHaveThisManyLinks,
                    turnLimit,
                    numPlayers: this.players.length,
                    finalNumOfLinks,
                    i,
                });
                this.viewResults();
            }
        }
    }

    getChain(id) {
        for (let i = 0; i < this.chains.length; i++) {
            if (this.chains[i].id === id) {
                return this.chains[i];
            }
        }
        return false;
    }

    getChainByOwnerId(ownerId) {
        for (let i = 0; i < this.chains.length; i++) {
            if (this.chains[i].owner.id === ownerId) {
                return this.chains[i];
            }
        }
        return false;
    }

    viewResults() {
        const chains = this.getAllChains();

        //starts as false, and will be true every round after first round
        this.canViewLastRoundResults = true;

        this.onResults();

        const roundTime = (Date.now() - this.startTime) / this.players.length;

        this.players.forEach((player) =>
            player.send("viewResults", {
                chains,
                ...(player.isHost ? { roundTime } : {}),
            })
        );

        try {
            if (this.shouldArchiveResultsToAws()) {
                sendResultsToAwsArchive(chains, this.wordPackName);
            }
        } catch (error) {
            console.log("aws upload failed");
        }
    }

    findReplacementFor(player, gameCode) {
        this.disconnectedPlayers.push(player.getJson());
        this.updateWaitingList();
        this.sendUpdateToPotentialPlayers(gameCode);
    }

    getPlayersThatNeedToBeReplaced() {
        return this.disconnectedPlayers;
    }

    canBeReplaced(playerToReplaceId) {
        for (let i = 0; i < this.disconnectedPlayers.length; i++) {
            if (this.disconnectedPlayers[i].id === playerToReplaceId) {
                return true;
            }
        }
        return false;
    }

    replacePlayer(playerToReplaceId, newPlayer, gameCode) {
        for (let i = 0; i < this.disconnectedPlayers.length; i++) {
            if (this.disconnectedPlayers[i].id === playerToReplaceId) {
                //give 'em the id of the old player
                newPlayer.id = this.disconnectedPlayers[i].id;

                //replace 'em
                const playerToReplaceIndex = this.getPlayerIndexById(
                    playerToReplaceId
                );
                this.players[playerToReplaceIndex] = newPlayer;

                //delete 'em from disconnectedPlayers
                this.disconnectedPlayers.splice(i, 1);

                this.potentialPlayers = this.potentialPlayers.filter(
                    (p) => p !== newPlayer
                );

                this.sendUpdateToPotentialPlayers(gameCode);

                if (newPlayer.isAi)
                    newPlayer.setAIGuessQueue(this.aiGuessQueue);

                //check if the disconnectedPlayer (dp) had submitted their link
                const dpChain = this.getChainByLastSentPlayerId(newPlayer.id);
                const dpDidFinishTheirLink =
                    dpChain.getLength() === this.shouldHaveThisManyLinks;
                if (dpDidFinishTheirLink) {
                    //send this player to the waiting for players page
                    newPlayer.socket.emit("showWaitingList", {});
                } else {
                    //send them the link they need to finish
                    dpChain.sendLastLinkToThen(
                        newPlayer,
                        this.finalNumOfLinks,
                        ({ link }) => {
                            this.receiveLink(newPlayer, link, dpChain.id);
                        }
                    );
                }
                return this.players[playerToReplaceIndex];
            }
        }
    }

    updateWaitingList() {
        this.sendToAll("updateWaitingList", {
            notFinished: this.getListOfNotFinishedPlayers(),
            disconnected: this.disconnectedPlayers,
        });
    }

    sendUpdateToPotentialPlayers(gameCode) {
        const payload = {
            gameCode,
            players: this.getPlayersThatNeedToBeReplaced(),
        };
        this.potentialPlayers.forEach((player) =>
            player.send("replacePlayer", payload)
        );
    }

    getListOfNotFinishedPlayers() {
        const playerList = [];

        //check to make sure every chain is the same length
        for (let i = 0; i < this.chains.length; i++) {
            const thisChain = this.chains[i];
            const isLastPlayerSentToConnected = this.getPlayer(
                thisChain.lastPlayerSentTo.id
            ).isConnected;
            if (
                thisChain.getLength() !== this.shouldHaveThisManyLinks &&
                isLastPlayerSentToConnected
            ) {
                playerList.push(thisChain.lastPlayerSentTo);
            }
        }

        return playerList;
    }

    getPlayer(id) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id === id) {
                return this.players[i];
            }
        }
        return false;
    }

    getPlayerIndexById(id) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id === id) {
                return i;
            }
        }
        return false;
    }

    getChainByLastSentPlayerId(id) {
        for (let i = 0; i < this.chains.length; i++) {
            if (this.chains[i].lastPlayerSentTo.id === id) {
                return this.chains[i];
            }
        }
        return false;
    }

    sendToAll(event, data) {
        this.players.forEach((player) => {
            player.send(event, data);
        });
    }

    getAllChains() {
        const newChains = [];
        this.chains.forEach((chain) => {
            newChains.push(chain.getJson());
        });
        return newChains;
    }

    shouldArchiveResultsToAws() {
        const isEnabled =
            process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY;
        const isNoBots = this.players.reduce((acc, { isAi }) => acc && !isAi);
        const isAllowedWordPack =
            this.wordPackName &&
            (this.wordPackName.includes("Simple") ||
                this.wordPackName.includes("Advanced"));
        return isEnabled && isNoBots && isAllowedWordPack;
    }

    validTurnLimit(enteredTurnLimit) {
        return getNewTurnLimit({
            modifier: 0,
            prevTurnLimit: enteredTurnLimit,
            numPlayers: this.players.length,
            prevNumPlayers: this.players.length,
            isWordFirst: this.isWordFirstGame,
        }).newTurnLimit;
    }
}

export default Round;
