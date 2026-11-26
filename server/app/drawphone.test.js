import { expect, test } from "vitest";
import { DEFAULT_PACK, game, isDrawingTurn } from "../../shared/game";
import { rowCompleteLatinSquare } from "./round.js";

function roundGame(count, wordFirst, max = true) {
    const players = Array.from({ length: count }, (_, i) => ({
        id: String(i).padStart(64, "0"),
        name: "龍".repeat(32),
    }));
    const context = { players, actor: players[0], leaderId: players[0].id };
    const state = game.createInitialState(context);
    game.actions.settings(state, context, { key: "wordFirst", value: wordFirst });
    if (!wordFirst) game.actions.settings(state, context, { key: "pack", value: DEFAULT_PACK });
    if (max) {
        for (let i = 0; i < count / 2; i++)
            game.actions.settings(state, context, { key: "turns", value: 1 });
    }
    game.actions.start(state, context);
    return { state, context, round: state.round };
}

test.each([false, true])(
    "chains alternate and visit each seat once (word first: %s)",
    (wordFirst) => {
        for (const count of [3, 4, 5, 6, 7, 8, 15, 16, 63, 64]) {
            const { state, context, round } = roundGame(count, wordFirst);
            while (state.phase === "round") {
                const { id, turn, seats } = round;
                for (const [seat, actor] of seats.entries()) {
                    const ref = "nova-file:" + (count * turn + seat).toString(16).padStart(64, "0");
                    game.actions.finishedLink(
                        state,
                        { ...context, actor },
                        {
                            id,
                            turn,
                            ref,
                            bytes: round.ink || 1,
                            word: "龍".repeat(50),
                        },
                    );
                }
            }
            const turns = Math.floor((count + Number(wordFirst)) / 2) * 2 - Number(wordFirst);
            for (const chain of round.chains) {
                expect(chain).toHaveLength(turns + round.offset);
                expect(new Set(chain.slice(round.offset).map(([seat]) => seat)).size).toBe(turns);
                expect(chain.map((link) => typeof link[2] === "number")).toEqual(
                    chain.map((_, i) => i % 2 === 1),
                );
            }
            expect(Buffer.byteLength(JSON.stringify(state))).toBeLessThan(512 * 1024);
        }
    },
);

test("even Latin squares pass between each pair of seats once", () => {
    const order = rowCompleteLatinSquare(16, 16);
    const from = order.map((row) => row.map((_, chain) => row.indexOf(chain)));
    const passes = from
        .slice(1)
        .flatMap((row, turn) => row.map((seat, chain) => `${from[turn][chain]}>${seat}`));
    expect(new Set(passes).size).toBe(16 * 15);
});

test("ink never shrinks when every drawing uses its full limit", () => {
    const { state, context, round } = roundGame(64, false);
    let previousInk = round.ink;
    while (state.phase === "round") {
        const { id, turn, seats, ink } = round;
        if (isDrawingTurn(round)) {
            expect(ink).toBeGreaterThanOrEqual(previousInk);
            previousInk = ink;
        }
        for (const [seat, actor] of seats.entries()) {
            game.actions.finishedLink(
                state,
                { ...context, actor },
                {
                    id,
                    turn,
                    bytes: ink,
                    word: "Guess",
                    ref: "nova-file:" + (64 * turn + seat).toString(16).padStart(64, "0"),
                },
            );
        }
    }
});

test("only the leader can skip a vacant seat and a new player takes that seat", () => {
    const { state, context, round } = roundGame(3, true);
    const departed = round.seats[1];
    game.playerLeft(state, context, departed);
    expect(() =>
        game.actions.skip(
            state,
            { ...context, actor: context.players[2] },
            { id: round.id, seat: 1 },
        ),
    ).toThrow("leader");
    game.actions.skip(state, context, { id: round.id, seat: 1 });
    expect(round.chains[1][0][2]).toBe(true);
    const replacement = { id: "new", name: "New player" };
    game.playerJoined(state, context, replacement);
    expect(round.seats[1]).toEqual(replacement);
});
