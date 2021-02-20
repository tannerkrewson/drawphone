import { jest } from "@jest/globals";

import Drawphone from "./drawphone.js";

const generateMockSocket = () => ({
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
});

const getCall = (mock, event) =>
    mock.mock.calls.reverse().find(([e]) => e === event)[1];

const clearAllMocks = (players) =>
    players.forEach(({ socket }) =>
        Object.values(socket).forEach((mock) => mock.mockClear())
    );

const testEmit = ({ socket }, expectedEvents) => {
    const actualEvents = socket.emit.mock.calls.map(([event]) => event);
    expect(actualEvents).toEqual(expectedEvents);
};

const sendLinks = (players) => {
    players.forEach(({ socket }) => {
        const { type } = getCall(socket.emit, "nextLink").data.link;
        const nextType =
            type === "drawing" || type === "first-word" ? "word" : "drawing";
        getCall(socket.once, "finishedLink")({ link: { type: nextType } });
    });
};

const advance = (game) => {
    let iterations = 0;
    while (game.inProgress) {
        sendLinks(game.players);

        iterations++;
        if (iterations > game.players.length * 2) {
            throw "This game is never going to end, huh?";
        }
    }
};

const noDuplicates = (arr, offset = 0) =>
    new Set(arr).size + offset === arr.length;

const allChainsValid = (chains, typeOrder) =>
    chains.forEach(({ links }) => {
        expect(links.length).toEqual(typeOrder.length);
        links.forEach(({ type }, i) => expect(type).toEqual(typeOrder[i]));
    });

const wereLinksSentToUniquePlayers = (links) => {
    const w = links.map(({ player }) => player.id);

    // the +1 accounts for the fact that first two things in every chain,
    // a word & drawing, or first-word & drawing, are marked as being from
    // the same player
    return noDuplicates(w, 1);
};

const allChainsUnique = (chains) =>
    chains.forEach(({ links }) =>
        expect(wereLinksSentToUniquePlayers(links)).toBeTruthy()
    );

let sumOfDuplicatePasses = 0;
const allPassesFromUniquePlayers = (chains) => {
    const playerIdList = chains.map(({ links }) => links[0].player.id);

    expect(noDuplicates(playerIdList)).toBeTruthy();

    playerIdList.forEach((thisPlayerId) => {
        const idsOfPlayersChainWasReceivedFrom = chains.map(({ links }) => {
            const thisPlayersLinkIndex = links.findIndex(
                ({ player }) => player.id === thisPlayerId
            );
            const indexOfPlayerChainWasLastWith = Math.max(
                0,
                thisPlayersLinkIndex - 1
            );
            return links[indexOfPlayerChainWasLastWith].player.id;
        });

        const [a, b] = [
            new Set(idsOfPlayersChainWasReceivedFrom).size,
            idsOfPlayersChainWasReceivedFrom.length,
        ];

        sumOfDuplicatePasses += b - a;

        // TODO: add test for odd and first word cases
        if (
            chains[0].links[0].type !== "first-word" &&
            chains[0].links.length % 2 === 0
        ) {
            expect(noDuplicates(idsOfPlayersChainWasReceivedFrom)).toBeTruthy();
        }
    });
};

const testGame = ({
    numPlayers,
    typeOrder,
    wordFirst,
    turnLimit = numPlayers,
}) => {
    const dp = new Drawphone();
    const game = dp.newGame();

    for (let i = 0; i < numPlayers; i++) {
        game.addPlayer(`player${i}`, generateMockSocket());
    }

    expect(game.inProgress).toBeFalsy();
    clearAllMocks(game.players);

    game.startNewRound(
        0,
        wordFirst ? false : "Simple words (recommended)",
        false,
        turnLimit
    );

    expect(game.currentRound.getListOfNotFinishedPlayers().length).toBe(
        numPlayers
    );
    expect(game.inProgress).toBeTruthy();

    advance(game);

    allChainsValid(game.currentRound.chains, typeOrder, turnLimit);

    allChainsUnique(game.currentRound.chains);

    allPassesFromUniquePlayers(game.currentRound.chains);
};

const typeOrderGenerator = (numPlayers, wordFirst) => {
    /*
	Regular:
	4 -> 2
	5 -> 2
	6 -> 3
	7 -> 3
	8 -> 4

	Word First:
	4 -> 1
	5 -> 2
	6 -> 2
	7 -> 3
	8 -> 3
	*/
    const offset = wordFirst ? -1 : 0;
    const pairs = Math.floor((numPlayers + offset) / 2);

    let res = [];

    if (wordFirst) {
        res.push("first-word");
    }

    res.push("word");

    for (let i = 0; i < pairs; i++) {
        res.push("drawing");
        res.push("word");
    }

    return res;
};

test("pre-game", () => {
    const dp = new Drawphone();
    const game = dp.newGame();

    const p1 = game.addPlayer("Bill", generateMockSocket());
    const p2 = game.addPlayer("Elon", generateMockSocket());
    const p3 = game.addPlayer("Tim", generateMockSocket());
    const p4 = game.addPlayer("Mark", generateMockSocket());

    expect(game.inProgress).toBeFalsy();
    testEmit(p1, [
        "hostUpdatedSettings",
        "updatePlayerList",
        "updatePlayerList",
        "updatePlayerList",
        "updatePlayerList",
    ]);
    testEmit(p2, ["updatePlayerList", "updatePlayerList", "updatePlayerList"]);
    testEmit(p3, ["updatePlayerList", "updatePlayerList"]);
    testEmit(p4, ["updatePlayerList"]);
    clearAllMocks(game.players);
    game.startNewRound(0, "Simple words (recommended)", false);

    expect(game.currentRound.getListOfNotFinishedPlayers().length).toBe(4);
    expect(game.inProgress).toBeTruthy();
});

describe("type order generator", () => {
    describe("random word", () => {
        const fourFive = ["word", "drawing", "word", "drawing", "word"];
        const sixSeven = [...fourFive, "drawing", "word"];

        test("4 players", () => {
            expect(typeOrderGenerator(4, false)).toEqual(fourFive);
        });
        test("5 players", () => {
            expect(typeOrderGenerator(5, false)).toEqual(fourFive);
        });
        test("6 players", () => {
            expect(typeOrderGenerator(6, false)).toEqual(sixSeven);
        });
        test("7 players", () => {
            expect(typeOrderGenerator(7, false)).toEqual(sixSeven);
        });
    });

    describe("word first", () => {
        const fwFour = ["first-word", "word", "drawing", "word"];
        const fwFiveSix = [...fwFour, "drawing", "word"];
        const fwSeven = [...fwFiveSix, "drawing", "word"];

        test("4 players", () => {
            expect(typeOrderGenerator(4, true)).toEqual(fwFour);
        });
        test("5 players", () => {
            expect(typeOrderGenerator(5, true)).toEqual(fwFiveSix);
        });
        test("6 players", () => {
            expect(typeOrderGenerator(6, true)).toEqual(fwFiveSix);
        });
        test("7 players", () => {
            expect(typeOrderGenerator(7, true)).toEqual(fwSeven);
        });
    });
});

const [MIN_PLAYERS, MAX_PLAYERS] = [4, 16];

const testMultipleGames = ({ turnLimit, wordFirst }) => {
    for (let i = MIN_PLAYERS; i <= MAX_PLAYERS; i++) {
        test(`${i} players`, () => {
            const thisTurnLimit = turnLimit || i;
            testGame({
                numPlayers: i,
                typeOrder: typeOrderGenerator(
                    Math.min(i, thisTurnLimit),
                    wordFirst
                ),
                wordFirst,
                turnLimit: thisTurnLimit,
            });
        });
    }
};

describe("random word game", () => {
    describe("max turns", () => {
        testMultipleGames({ wordFirst: false });
    });

    describe("turn limited to 4", () => {
        testMultipleGames({
            wordFirst: false,
            turnLimit: 4,
        });
    });

    describe("turn limited to 6", () => {
        testMultipleGames({
            wordFirst: false,
            turnLimit: 6,
        });
    });

    describe.skip("demo", () => {
        test(`1 player`, () => {
            testGame({
                numPlayers: 1,
                typeOrder: typeOrderGenerator(6, false),
                wordFirst: true,
            });
        });
    });
});

describe("word first game", () => {
    describe("max turns", () => {
        testMultipleGames({ wordFirst: true });
    });

    describe("turn limited to 3", () => {
        testMultipleGames({
            wordFirst: true,
            turnLimit: 3,
        });
    });

    describe("turn limited to 5", () => {
        testMultipleGames({
            wordFirst: true,
            turnLimit: 5,
        });
    });

    describe.skip("demo", () => {
        test(`1 player`, () => {
            testGame({
                numPlayers: 1,
                typeOrder: typeOrderGenerator(6, true),
                wordFirst: true,
            });
        });
    });
});

test.skip("debug test", () => {
    testGame({
        numPlayers: 6,
        typeOrder: typeOrderGenerator(6, false),
        wordFirst: false,
        turnLimit: 5,
    });
});

afterAll(() => {
    console.log(
        "sum of passes from same player (lower is better):",
        sumOfDuplicatePasses
    );
});

/*
sumOfDuplicatePasses history

original: 20242
nlewycky: 5331
evenExact + oddApprox: 655
*/
