import { afterEach, expect, test } from "vitest";
import source from "../dist/drawphone.html?raw";
import type { State } from "../shared/game";
import type { GameDefinition, Nova } from "../shared/nova";

const players = [
    { id: "one", name: "<img src=x onerror=alert(1)>" },
    { id: "two", name: "Two" },
    { id: "three", name: "Three" },
];

const frames: HTMLIFrameElement[] = [];
afterEach(() => {
    for (const frame of frames.splice(0)) frame.remove();
    Reflect.deleteProperty(window, "drawphoneTestNova");
});

type Client = {
    started: () => void;
    render: (state: State) => void;
};

async function party() {
    let definition: GameDefinition<State>;
    let state: State;
    const leaderId = players[0].id;
    const context = { players, leaderId };
    const clients = new Map<number, Client>();
    const files = new Map<string, Blob>();
    const ready: Array<() => void> = [];

    Object.assign(window, {
        drawphoneTestNova(index: number): Nova<State> {
            const actor = players[index];
            const client = { started: () => {}, render: (_state: State) => {} };
            clients.set(index, client);
            const noop = () => () => {};
            return {
                defineGame(game) { definition ??= game; },
                ready() { ready[index](); },
                player: actor,
                players: [actor, ...players.filter((player) => player !== actor)],
                leaderId,
                connectionStatus: "connected",
                onConnectionChange: noop,
                onEnd: noop,
                onPlayerJoin: noop,
                onPlayerLeave: noop,
                onStart(callback) { client.started = callback; return () => {}; },
                state: {
                    get: () => state ? structuredClone(state) : null,
                    onChange(callback) { client.render = callback; return () => {}; },
                },
                async dispatch({ type, payload }) {
                    const next = structuredClone(state);
                    definition.actions[type](next, { ...context, actor }, payload);
                    state = next;
                    for (const view of clients.values()) view.render(structuredClone(state));
                },
                files: {
                    async put(blob) {
                        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
                        const ref = "nova-file:" + Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
                        files.set(ref, blob);
                        return ref;
                    },
                    async get(ref) {
                        const blob = files.get(ref);
                        if (!blob) throw new Error("Drawing missing.");
                        return blob;
                    },
                },
            };
        },
    });

    function open(index: number) {
        const frame = document.createElement("iframe");
        frame.width = "390";
        frame.height = "900";
        frame.srcdoc = source.replace("<head>", `<head><script>window.nova = parent.drawphoneTestNova(${index})</script>`);
        frames.push(frame);
        const loaded = new Promise<Document>((resolve) => {
            ready[index] = () => resolve(frame.contentDocument!);
        });
        document.body.append(frame);
        return loaded;
    }

    const documents = await Promise.all(players.map((_, index) => open(index)));
    return {
        documents,
        start() {
            state = definition.createInitialState(context);
            for (const client of clients.values()) client.started();
        },
        async reload(index: number) {
            frames.find((frame) => frame.contentDocument === documents[index])?.remove();
            documents[index] = await open(index);
            clients.get(index)!.started();
        },
        state: () => state,
    };
}

function element<T extends HTMLElement = HTMLElement>(doc: Document, id: string) {
    return doc.getElementById(id) as T;
}

function pointStroke(doc: Document, offset: number) {
    const canvas = doc.querySelector<HTMLCanvasElement>(".upper-canvas")!;
    const { x, y } = canvas.getBoundingClientRect();
    for (const [type, dx, dy] of [
        ["pointerdown", 30, 45],
        ["pointermove", 75, 75],
        ["pointermove", 110, 50],
        ["pointerup", 110, 50],
    ] as const) {
        canvas.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            clientX: x + dx,
            clientY: y + dy + offset,
            buttons: type === "pointerup" ? 0 : 1,
        }));
    }
}

function answer(doc: Document, word: string) {
    element<HTMLInputElement>(doc, "game-word-in").value = word;
    element(doc, "game-send").click();
}

async function play(wordFirst: boolean, reloadDrawing: boolean) {
    const session = await party();
    const { documents, state } = session;
    const leader = documents[0];
    expect(element(leader, "subtitle").textContent).toMatch(/waiting for the party/i);
    expect(element(leader, "lobby-players").textContent).toContain(players[0].name);
    expect(element(leader, "lobby-players").querySelector("img")).toBeNull();
    session.start();
    expect(element(documents[1], "lobby-settings").classList.contains("d-none")).toBe(true);
    if (wordFirst) element(leader, "lobby-settings-wordfirst").click();
    element(leader, "lobby-start").click();

    if (wordFirst) {
        documents.forEach((doc, index) => {
            expect(element(doc, "title").textContent).toBe("What should be drawn?");
            answer(doc, `First word ${index}`);
        });
    }

    documents.forEach((doc, index) => {
        expect(element(doc, "title").textContent).toMatch(/^Please draw: /);
        pointStroke(doc, 20 * index);
    });
    if (reloadDrawing) {
        await session.reload(1);
        expect(element<HTMLButtonElement>(documents[1], "game-drawing-undo").disabled).toBe(false);
    }
    documents.forEach((doc) => element(doc, "game-send").click());
    await expect.poll(() => state().round?.turn).toBe(wordFirst ? 2 : 1);

    for (const doc of documents) {
        expect(element(doc, "title").textContent).toBe("What is this a drawing of?");
        const image = element<HTMLImageElement>(doc, "game-word-drawingtoname");
        await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
    }
    documents.forEach((doc, index) => answer(doc, `Guess ${index}`));

    await expect.poll(() => state().phase).toBe("results");
    for (const doc of documents) {
        expect(element(doc, "title").textContent).toBe("Results #1");
        expect(element(doc, "result-content").textContent).toContain("You started with:");
        const guesses = [];
        for (let index = 0; index < players.length; index++) {
            element(doc, "result-others").querySelectorAll("button")[index].click();
            const image = element(doc, "result-content").querySelector("img")!;
            await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
            guesses.push(element(doc, "result-content").querySelector(".well h1:last-child")?.textContent);
        }
        expect(guesses.sort()).toEqual(["Guess 0", "Guess 1", "Guess 2"]);
    }
    return documents[0];
}

test("three players finish a word-pack game, reload a draft and reopen new and old results", async () => {
    const leader = await play(false, true);
    const oldDrawing = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8"/></svg>');
    const player = { name: "Old player" };
    const Dexie = (await import("dexie")).default;
    const db = new Dexie("DrawphoneDatabase");
    db.version(1).stores({ archive: "++id,date,chains" });
    await db.table("archive").add({
        date: new Date(2000, 0, 1),
        chains: [{ id: 0, owner: player, links: [
            { player, type: "word", data: "Old word" },
            { player, type: "drawing", data: oldDrawing },
            { player, type: "word", data: "Old guess" },
        ] }],
    });
    db.close();

    element(leader, "result-done").click();
    await expect.poll(() => element<HTMLButtonElement>(leader, "lobby-start").disabled).toBe(false);
    element(leader, "archivebtn").click();
    const archive = element(leader, "archive-content");
    await expect.poll(() => archive.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
    for (const label of ["Guess", "Old word"]) {
        [...archive.querySelectorAll("button")].find((entry) => entry.textContent.includes(label))!.click();
        const image = element(leader, "result-content").querySelector("img")!;
        expect(image.src).toMatch(/^data:image\/svg\+xml;base64,/);
        await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
        element(leader, "result-done").click();
        await expect.poll(() => archive.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
    }
}, 20000);

test("three players finish a players-write-first game", async () => {
    await play(true, false);
}, 20000);
