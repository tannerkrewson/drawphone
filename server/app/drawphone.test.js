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

const advance = ({ inProgress, players }) => {
    let iterations = 0;
    while (inProgress) {
        sendLinks(players);

        iterations++;
        if (iterations > players.length * 2) {
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
            chains.length % 2 === 0
        ) {
            expect(noDuplicates(idsOfPlayersChainWasReceivedFrom)).toBeTruthy();
        }
    });
};

const testGame = (numPlayers, typeOrder, wordFirst) => {
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
        false
    );

    expect(game.currentRound.getListOfNotFinishedPlayers().length).toBe(
        numPlayers
    );
    expect(game.inProgress).toBeTruthy();

    advance(game);

    allChainsValid(game.currentRound.chains, typeOrder);

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

const fourFive = ["word", "drawing", "word", "drawing", "word"];
const sixSeven = [
    "word",
    "drawing",
    "word",
    "drawing",
    "word",
    "drawing",
    "word",
];
const fwFour = ["first-word", "word", "drawing", "word"];
const fwFiveSix = ["first-word", "word", "drawing", "word", "drawing", "word"];
const fwSeven = [
    "first-word",
    "word",
    "drawing",
    "word",
    "drawing",
    "word",
    "drawing",
    "word",
];

test("game with 4 players", () => {
    testGame(4, fourFive);
});

test("game with 5 players", () => {
    testGame(5, fourFive);
});

test("game with 6 players", () => {
    testGame(6, sixSeven);
});

test("game with 7 players", () => {
    testGame(7, sixSeven);
});

for (let i = 8; i <= 32; i++) {
    test(`game with ${i} players`, () => {
        testGame(i, typeOrderGenerator(i, false));
    });
}

test("word first game with 4 players", () => {
    testGame(4, fwFour, true);
});

test("word first game with 5 players", () => {
    testGame(5, fwFiveSix, true);
});

test("word first game with 6 players", () => {
    testGame(6, fwFiveSix, true);
});

test("word first game with 7 players", () => {
    testGame(7, fwSeven, true);
});

for (let i = 8; i <= 32; i++) {
    test(`word first game with ${i} players`, () => {
        testGame(i, typeOrderGenerator(i, true), true);
    });
}

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
