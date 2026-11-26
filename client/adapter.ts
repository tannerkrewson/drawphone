import {
    chainFor,
    isDrawingTurn,
    playersInGame,
    waitingFor,
    type Round,
    type State,
} from "../shared/game";
import type { Nova } from "../shared/nova";
import { addResultsToStorage, renderArchive } from "./archive.js";
import { decodeDrawing, drawingSvg } from "./drawing";
import Game from "./screen/game.js";
import Lobby from "./screen/lobby.js";
import Results from "./screen/results.js";
import Screen from "./screen/screen.js";
import Waiting from "./screen/waiting.js";

type DrawingLink = { type: string; data?: string; ref?: string; skipped?: boolean };

function chainsFor(round: Round) {
    return round.chains.map((links, id) => {
        const entries = links.map(([seat, data, extra], index) => ({
            player: { name: round.seats[seat].name },
            type: index % 2 ? "drawing" : "word",
            data: index % 2 ? undefined : (data ?? undefined),
            ref: typeof extra === "number" ? (data ?? undefined) : undefined,
            skipped: data === null || extra === true,
        }));
        const owner = { name: round.owners[id] };
        if (!round.offset) {
            entries.unshift({
                player: owner,
                type: "first-word",
                data: undefined,
                ref: undefined,
                skipped: false,
            });
        }
        return { id, owner, links: entries };
    });
}

export function connect(nova?: Nova<State>) {
    const $ = window.$;
    const ga = window.ga;
    let started = false;
    let lastRound: string | undefined;
    let activeTurn: string | undefined;
    let showingResults: string | undefined;
    let viewedResults: string | undefined;
    let archiveMode: "list" | "record" | undefined;
    let saving: string | undefined;
    let archiveError: string | undefined;
    let latest: State | null = null;
    const files = new Map<string, Promise<{ svg: string; url?: string }>>();
    const urls = new Set<string>();
    const drawingRequests = new WeakMap<HTMLImageElement, object>();

    function showError(message: string) {
        $("#game-error").text(message);
    }

    async function emit(type: string, payload?: unknown) {
        showError("");
        try {
            if (!started || !nova) throw new Error("The Nova party has not started.");
            await nova.dispatch({ type, payload });
            return true;
        } catch (error) {
            showError(reason(error, "Could not send this action. Please retry."));
            // Restore settings from the accepted state after a rejected edit.
            if (type === "settings") render(latest);
            return false;
        }
    }

    function reason(error: unknown, fallback: string) {
        if (
            error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
        ) {
            return error.message;
        }
        return fallback;
    }

    async function submit(
        turn: { id: string; turn: number },
        bytes?: Uint8Array<ArrayBuffer>,
        word?: string,
    ) {
        showError("");
        try {
            const ref = bytes && (await nova!.files.put(new Blob([bytes])));
            return await emit(
                "finishedLink",
                bytes ? { ...turn, ref, bytes: bytes.length } : { ...turn, word },
            );
        } catch (error) {
            showError(reason(error, "Drawing upload failed. Tap Done to retry."));
            return false;
        }
    }

    function getDrawing(ref: string) {
        let drawing = files.get(ref);
        if (!drawing) {
            drawing = nova!.files.get(ref).then(async (blob) => ({
                svg: drawingSvg(decodeDrawing(new Uint8Array(await blob.arrayBuffer()))),
                url: undefined,
            }));
            files.set(ref, drawing);
            const request = drawing;
            void drawing.catch(() => {
                if (files.get(ref) === request) files.delete(ref);
            });
        }
        return drawing;
    }

    async function showDrawing(image: HTMLImageElement, status: HTMLElement, link: DrawingLink) {
        image.hidden = true;
        const round = lastRound;
        const request = {};
        drawingRequests.set(image, request);
        const stillVisible = () =>
            lastRound === round && image.isConnected && drawingRequests.get(image) === request;
        status.textContent = link.ref
            ? "Loading drawing..."
            : "Drawing skipped because the player left.";
        if (!link.ref) return;
        try {
            const drawing = await getDrawing(link.ref);
            if (!stillVisible()) return;
            if (!drawing.url) {
                drawing.url = URL.createObjectURL(
                    new Blob([drawing.svg], { type: "image/svg+xml" }),
                );
                urls.add(drawing.url);
            }
            image.src = drawing.url;
            image.hidden = false;
            status.textContent = "";
        } catch {
            if (stillVisible()) {
                status.textContent = "Could not load this drawing.";
            }
        }
    }

    function saveResults(round: Round, chains: ReturnType<typeof chainsFor>) {
        saving = round.id;
        void Promise.all(
            chains.map(async (chain) => ({
                ...chain,
                links: await Promise.all(
                    chain.links.map(async ({ ref, ...link }) => {
                        if (!ref) return link;
                        try {
                            const { svg } = await getDrawing(ref);
                            return { ...link, data: `data:image/svg+xml;base64,${btoa(svg)}` };
                        } catch {
                            // Keep the rest of the chain if the party has already dropped a file.
                            return link;
                        }
                    }),
                ),
            })),
        )
            .then((entries) => addResultsToStorage(entries, round.id, new Date(round.startedAt)))
            .catch(() => {
                if (lastRound === round.id) {
                    archiveError = "Could not save this round to the results archive.";
                    showError(archiveError);
                }
            })
            .finally(() => {
                if (saving === round.id) {
                    saving = undefined;
                    if (latest?.phase === "results" && viewedResults === round.id && !archiveMode) {
                        render(latest, false);
                    }
                }
            });
    }

    const lobby = new Lobby({ emit });
    const game = new Game({ submit, showDrawing, showError });
    const waiting = new Waiting();
    const archive = new Screen();
    archive.id = "#archive";
    archive.setTitle("Your Previous Results");
    archive.setSubtitle("View the results saved on this device");
    const results = new Results(() => {
        if (archiveMode === "record") return openArchive();
        showingResults = undefined;
        viewedResults = latest?.round?.id;
        render(latest);
    }, showDrawing);

    function openArchive() {
        archiveMode = "list";
        showError("");
        archive.show();
        void renderArchive((chains: unknown) => {
            archiveMode = "record";
            results.show({ chains });
        });
    }

    $("#archivebtn").on("click", openArchive);
    $("#archive-back").on("click", () => {
        archiveMode = undefined;
        render(latest);
    });
    $("#lobby-prevres").on("click", () => {
        if (latest?.round) {
            showingResults = latest.round.id;
            results.show({ chains: chainsFor(latest.round) });
        }
    });

    const playerId = () => nova?.player?.id;
    const isLeader = () => playerId() != null && playerId() === nova?.leaderId;

    function render(state: State | null, showLobby = true) {
        if (latest?.round?.id !== state?.round?.id) {
            for (const url of urls) URL.revokeObjectURL(url);
            urls.clear();
            files.clear();
            archiveError = undefined;
            showError("");
        }
        latest = state;
        const round = state?.round;
        lastRound = round?.id;
        if (started && state?.phase === "round" && round) {
            archiveMode = undefined;
            const seat = round.seats.findIndex(({ id }) => id === playerId());
            const key = `drawphone:${round.id}:${playerId()}:${round.turn}`;
            const count = round.turn + 1;
            const finalCount = round.order.length;
            if (seat >= 0 && waitingFor(round, seat)) {
                if (activeTurn === key) return;
                waiting.closeReplacement();
                showError("");
                activeTurn = key;
                const previous = chainFor(round, seat).at(-1);
                const link = !previous
                    ? { type: "first-word" }
                    : isDrawingTurn(round)
                      ? { type: "word", data: previous[1] }
                      : { type: "drawing", ref: previous[1] };
                game.newLink({
                    link,
                    count,
                    finalCount,
                    timeLimit: state.settings.time,
                    key,
                    ink: round.ink,
                    id: round.id,
                    turn: round.turn,
                });
                return;
            }

            activeTurn = undefined;
            game.stopTimer();
            waiting.updateWaitingList({
                players: round.seats.filter(
                    (player, index) => player.id !== null && waitingFor(round, index),
                ),
                vacant: round.seats.flatMap((player, index) =>
                    player.id === null ? [{ ...player, vacant: true, seat: index }] : [],
                ),
                unseated: state.unseated,
                leaderId: nova?.leaderId,
                onSkip: isLeader()
                    ? (index: number) => emit("skip", { id: round.id, seat: index })
                    : undefined,
                onReplace: isLeader()
                    ? (index: number, playerId: string) =>
                          emit("replace", { id: round.id, seat: index, playerId })
                    : undefined,
                nextRound: seat < 0,
                count,
                finalCount,
            });
            waiting.show();
            return;
        }

        activeTurn = undefined;
        game.stopTimer();
        waiting.closeReplacement();
        if (state?.phase === "results" && round && viewedResults !== round.id) {
            if (!archiveMode && showingResults !== round.id) {
                showingResults = round.id;
                results.show({ chains: chainsFor(round) });
            }
            return;
        }
        if (archiveMode || (round && showingResults === round.id)) return;
        lobby.updatePlayerList({
            players: state ? playersInGame(state) : (nova?.players ?? []),
            settings: state?.settings,
            leaderId: nova?.leaderId,
            leader: isLeader(),
            previous: state?.phase === "results",
            started,
            saving: saving === round?.id && Boolean(round),
        });
        if (showLobby) lobby.show();
        if (archiveError) showError(archiveError);
    }

    let archived: string | undefined;
    function onState(state: State | null) {
        const round = state?.round;
        const newResults = state?.phase === "results" && round && archived !== round.id;
        // Request the visible chain before starting the archive reads.
        render(state);
        if (newResults) {
            archived = round.id;
            if (isLeader())
                ga(
                    "send",
                    "event",
                    "Results",
                    "round time per player",
                    (Date.now() - round.startedAt) / round.seats.length,
                );
            saveResults(round, chainsFor(round));
        }
    }

    render(null);
    if (!nova) return;
    nova.onConnectionChange(() => render(latest));
    nova.onPlayerJoin(() => render(latest));
    nova.onPlayerLeave(() => render(latest));
    nova.state.onChange((state) => {
        if (started) onState(state);
    });
    nova.onStart(() => {
        started = true;
        onState(nova.state.get());
    });
    nova.onEnd(() => {
        started = false;
        render(null);
    });
    nova.ready();
}
