import { knuthShuffle as shuffle } from "knuth-shuffle";
import stripTags from "striptags";
import { getRoundLength, rowCompleteLatinSquare } from "../server/app/round.js";
import WordPacks from "../server/app/words.js";
import { drawingLimit, FILE_OVERHEAD } from "./ink";
import type { ActionContext, GameDefinition, Player } from "./nova";
import { getNewTurnLimit } from "./util.js";

const words = new WordPacks();
words.loadAll();
export const DEFAULT_PACK = WordPacks.getAllPackNames(true)[0];

export type Settings = {
    pack: string | null;
    wordFirst: boolean;
    mature: boolean;
    time: number;
    turns: number;
};
// A word or a skipped drawing needs two fields; a drawing carries its ref and byte size.
export type Link =
    | [seat: number, word: string, skipped?: true]
    | [seat: number, ref: string, bytes: number]
    | [seat: number, skippedDrawing: null];
type Seat = { id: string | null; name: string; formerId?: string; skip?: true };
export type Round = {
    id: string;
    seats: Seat[];
    owners: string[];
    chains: Link[][];
    order: number[];
    turn: number;
    offset: number;
    ink: number;
    startedAt: number;
};
export type State = {
    phase: "lobby" | "round" | "results";
    unseated: Player[];
    settings: Settings;
    round: Round | null;
};

export function isDrawingTurn({ turn, offset }: Round) {
    return (turn + offset) % 2 === 1;
}

export function chainFor(round: Round, seat: number) {
    // Every row of the Latin square is a rotation of the first row.
    return round.chains[(round.order[round.turn] + seat) % round.seats.length];
}

export function waitingFor(round: Round, seat: number) {
    return chainFor(round, seat).length === round.turn + round.offset;
}

export function playersInGame(state: State): Player[] {
    const seats = state.round?.seats ?? [];
    return [
        ...seats.flatMap(({ id, name }) => (id === null ? [] : [{ id, name }])),
        ...state.unseated,
    ];
}

function seatablePlayer({ id, name }: Player): Player {
    return { id, name: name.replaceAll(/\p{Cc}/gu, " ") };
}

function playerCount(state: State) {
    return state.unseated.length + (state.round?.seats.filter(({ id }) => id !== null).length ?? 0);
}

function setInk(round: Round) {
    const refs = new Map<string, number>();
    for (const chain of round.chains) {
        for (const [, ref, bytes] of chain) {
            if (typeof bytes === "number") refs.set(ref!, bytes + FILE_OVERHEAD);
        }
    }
    const used = [...refs.values()].reduce((sum, bytes) => sum + bytes, 0);
    const remaining =
        round.order.slice(round.turn).filter((_, i) => (round.turn + i + round.offset) % 2 === 1)
            .length * round.seats.length;
    round.ink = remaining ? drawingLimit(used, remaining) : 0;
}

function advance(state: State, round: Round, previousTurn: number) {
    while (round.turn < round.order.length) {
        const position = round.turn + round.offset;
        for (const [seat, player] of round.seats.entries()) {
            if (player.skip && waitingFor(round, seat)) {
                const chain = chainFor(round, seat);
                chain.push(
                    position % 2 === 1
                        ? [seat, null]
                        : [seat, words.getRandomWord(state.settings.pack ?? DEFAULT_PACK), true],
                );
            }
        }
        if (round.chains.some((chain) => chain.length === position)) {
            if (round.turn !== previousTurn) setInk(round);
            return;
        }
        round.turn++;
    }
    state.phase = "results";
}

function leader(context: ActionContext) {
    if (context.actor.id !== context.leaderId)
        throw new Error("Only the party leader can do that.");
}

function turnSetting(state: State, modifier = 0, prevNumPlayers = playerCount(state)) {
    state.settings.turns = getNewTurnLimit({
        modifier,
        prevTurnLimit: state.settings.turns,
        numPlayers: playerCount(state),
        prevNumPlayers,
        isWordFirst: state.settings.wordFirst,
    }).newTurnLimit;
}

function vacantRound(state: State, id: string, seat: number) {
    const round = state.round;
    if (state.phase !== "round" || !round || round.id !== id || round.seats[seat]?.id !== null) {
        throw new Error("This seat is no longer vacant.");
    }
    return round;
}

export const game: GameDefinition<State> = {
    title: "Drawphone",
    apiVersion: 1,
    maxPlayers: 64,
    createInitialState({ players }) {
        const state: State = {
            phase: "lobby",
            unseated: players.map(seatablePlayer),
            settings: { pack: null, wordFirst: false, mature: false, time: 0, turns: 4 },
            round: null,
        };
        turnSetting(state);
        return state;
    },
    actions: {
        settings(state, context, payload) {
            leader(context);
            if (state.phase === "round") throw new Error("The round has already started.");
            const { key, value } = payload as { key: keyof Settings; value: unknown };
            const settings = state.settings;
            switch (key) {
                case "pack":
                    if (
                        typeof value !== "string" ||
                        !WordPacks.getAllPackNames(!settings.mature).includes(value)
                    )
                        break;
                    settings.pack = value;
                    return;
                case "mature":
                    if (typeof value !== "boolean") break;
                    settings.mature = value;
                    if (settings.pack && !WordPacks.getAllPackNames(!value).includes(settings.pack))
                        settings.pack = null;
                    return;
                case "wordFirst":
                    if (typeof value !== "boolean") break;
                    settings.wordFirst = value;
                    if (value) settings.pack = null;
                    turnSetting(state);
                    return;
                case "time":
                    if (value !== -1 && value !== 1) break;
                    settings.time = Math.min(
                        2147480,
                        Math.max(0, settings.time + value * (settings.time >= 30 ? 15 : 5)),
                    );
                    return;
                case "turns":
                    if (value !== -1 && value !== 1) break;
                    turnSetting(state, value);
                    return;
            }
            throw new Error("Invalid setting.");
        },
        start(state, context) {
            leader(context);
            if (state.phase === "round") throw new Error("The round has already started.");
            const players = playersInGame(state);
            const count = players.length;
            if (!count || (count === 2 && state.settings.wordFirst)) {
                throw new Error("Players write first word needs three players or solo demo mode.");
            }
            const { wordFirst, turns, pack } = state.settings;
            if (!wordFirst && !pack) throw new Error("Select a word pack first.");
            const offset = wordFirst ? 0 : 1;
            const turnCount = getRoundLength(count, turns, wordFirst) - offset;
            const seats = shuffle(players.map((player) => ({ ...player })));
            state.unseated = [];
            const startedAt = Date.now();
            state.round = {
                id: startedAt.toString(36) + Math.random().toString(36).slice(2),
                seats,
                owners: seats.map(({ name }) => name),
                chains: seats.map((_, seat) =>
                    wordFirst ? [] : [[seat, words.getRandomWord(pack)]],
                ),
                order:
                    count === 1
                        ? Array.from({ length: turnCount }, () => 0)
                        : rowCompleteLatinSquare(count, turnCount)
                              .slice(0, turnCount)
                              .map((row) => row[0]),
                turn: 0,
                offset,
                ink: 0,
                startedAt,
            };
            state.phase = "round";
            setInk(state.round);
        },
        finishedLink(state, context, payload) {
            const round = state.round;
            const { id, turn, word, ref, bytes } = payload as {
                id: string;
                turn: number;
                word?: string;
                ref?: string;
                bytes?: number;
            };
            if (state.phase !== "round" || !round || id !== round.id || turn !== round.turn) {
                throw new Error("This turn has already ended.");
            }
            const seat = round.seats.findIndex(({ id }) => id === context.actor.id);
            if (seat < 0 || !waitingFor(round, seat))
                throw new Error("You have no link to submit.");
            const chain = chainFor(round, seat);
            if (isDrawingTurn(round)) {
                if (
                    typeof ref !== "string" ||
                    !/^nova-file:[a-f0-9]{64}$/.test(ref) ||
                    typeof bytes !== "number" ||
                    !Number.isInteger(bytes) ||
                    bytes < 1 ||
                    bytes > round.ink
                ) {
                    throw new Error("This drawing exceeds the ink limit or is missing.");
                }
                chain.push([seat, ref, bytes]);
            } else {
                const clean =
                    typeof word === "string"
                        ? stripTags(word)
                              .replaceAll(/\p{Cc}/gu, " ")
                              .trim()
                              .slice(0, 50)
                              .toWellFormed()
                        : "";
                if (!clean) throw new Error("Enter a word first.");
                chain.push([seat, clean]);
            }
            if (round.chains.every((entry) => entry.length > turn + round.offset)) {
                round.turn++;
                advance(state, round, turn);
            }
        },
        replace(state, context, payload) {
            leader(context);
            const { id, seat, playerId } = payload as {
                id: string;
                seat: number;
                playerId: string;
            };
            const round = vacantRound(state, id, seat);
            const replacement = state.unseated.findIndex((player) => player.id === playerId);
            if (replacement < 0) throw new Error("That player is no longer waiting for a seat.");
            round.seats[seat] = state.unseated.splice(replacement, 1)[0];
        },
        skip(state, context, payload) {
            leader(context);
            const { id, seat } = payload as { id: string; seat: number };
            const round = vacantRound(state, id, seat);
            round.seats[seat].skip = true;
            advance(state, round, round.turn);
        },
    },
    playerJoined(state, _context, player) {
        const previous = playerCount(state);
        if (!playersInGame(state).some(({ id }) => id === player.id)) {
            const seats = state.phase === "round" ? state.round?.seats : undefined;
            const original = seats?.findIndex(
                ({ id, formerId }) => id === null && formerId === player.id,
            );
            if (seats && original !== undefined && original >= 0)
                seats[original] = seatablePlayer(player);
            else state.unseated.push(seatablePlayer(player));
            turnSetting(state, 0, previous);
        }
    },
    playerLeft(state, _context, player) {
        const previous = playerCount(state);
        state.unseated = state.unseated.filter(({ id }) => id !== player.id);
        const seat = state.round?.seats.find(({ id }) => id === player.id);
        if (seat) {
            seat.formerId = player.id;
            seat.id = null;
        }
        turnSetting(state, 0, previous);
    },
};
