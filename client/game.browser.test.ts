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

async function party(playerCount = players.length) {
    const members = players.slice(0, playerCount);
    let definition: GameDefinition<State>;
    let state: State;
    const leaderId = players[0].id;
    const context = { players: members, leaderId };
    const clients = new Map<number, Client>();
    const files = new Map<string, Blob>();
    let failNextUpload = false;
    const ready: Array<() => void> = [];

    Object.assign(window, {
        drawphoneTestNova(index: number): Nova<State> {
            const actor = members[index];
            const client = { started: () => {}, render: (_state: State) => {} };
            clients.set(index, client);
            const noop = () => () => {};
            return {
                defineGame(game) {
                    definition ??= game;
                },
                ready() {
                    ready[index]();
                },
                player: actor,
                players: [actor, ...members.filter((player) => player !== actor)],
                leaderId,
                connectionStatus: "connected",
                onConnectionChange: noop,
                onEnd: noop,
                onPlayerJoin: noop,
                onPlayerLeave: noop,
                onStart(callback) {
                    client.started = callback;
                    return () => {};
                },
                state: {
                    get: () => (state ? structuredClone(state) : null),
                    onChange(callback) {
                        client.render = callback;
                        return () => {};
                    },
                },
                async dispatch({ type, payload }) {
                    const next = structuredClone(state);
                    definition.actions[type](next, { ...context, actor }, payload);
                    state = next;
                    for (const view of clients.values()) view.render(structuredClone(state));
                },
                files: {
                    async put(blob) {
                        if (failNextUpload) {
                            failNextUpload = false;
                            throw new Error("Drawing upload failed.");
                        }
                        const hash = new Uint8Array(
                            await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
                        );
                        const ref =
                            "nova-file:" +
                            Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
        frame.srcdoc = source.replace(
            "<head>",
            `<head><script>window.nova = parent.drawphoneTestNova(${index})</script>`,
        );
        frames.push(frame);
        const loaded = new Promise<Document>((resolve) => {
            ready[index] = () => resolve(frame.contentDocument!);
        });
        document.body.append(frame);
        return loaded;
    }

    const documents = await Promise.all(members.map((_, index) => open(index)));
    return {
        documents,
        failUpload() {
            failNextUpload = true;
        },
        start() {
            state = definition.createInitialState(context);
            for (const client of clients.values()) client.started();
        },
        leave(index: number) {
            clients.delete(index);
            definition.playerLeft(state, context, members[index]);
            for (const view of clients.values()) view.render(structuredClone(state));
        },
        async join(name: string) {
            const index = members.length;
            const player = { id: "replacement", name };
            members.push(player);
            const doc = await open(index);
            definition.playerJoined(state, context, player);
            clients.get(index)!.started();
            for (const view of clients.values()) view.render(structuredClone(state));
            return doc;
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
        canvas.dispatchEvent(
            new PointerEvent(type, {
                bubbles: true,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
                clientX: x + dx,
                clientY: y + dy + offset,
                buttons: type === "pointerup" ? 0 : 1,
            }),
        );
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
    expect(element(leader, "lobby-players").querySelector("img:not(.host-icon)")).toBeNull();
    session.start();
    const guest = documents[1];
    for (const doc of documents) {
        const crowns = element(doc, "lobby-players").querySelectorAll("img[alt='Host']");
        expect(crowns).toHaveLength(1);
        expect(crowns[0].parentElement?.textContent).toBe(players[0].name);
    }
    const leaderPack = element<HTMLSelectElement>(leader, "lobby-settings-wordpack");
    const guestPack = element<HTMLSelectElement>(guest, "lobby-settings-wordpack");
    expect(element(guest, "lobby-settings").getClientRects().length).toBeGreaterThan(0);
    expect(leaderPack.value).toBe("");
    expect(element<HTMLButtonElement>(leader, "lobby-start").disabled).toBe(true);
    expect(guestPack.disabled).toBe(true);
    expect(element(guest, "lobby-settings-turnlimit").textContent).toBe("2 turns (max)");
    expect(element(guest, "lobby-settings-gametime").textContent).toBe(
        "(round will take about 2 minutes)",
    );
    if (wordFirst) {
        element(leader, "lobby-settings-wordfirst").click();
        expect(element<HTMLInputElement>(guest, "lobby-settings-wordfirst").checked).toBe(true);
    } else {
        leaderPack.value = "Animals";
        leaderPack.dispatchEvent(new Event("change"));
        expect(guestPack.value).toBe("Animals");
    }
    element(leader, "lobby-start").click();

    if (wordFirst) {
        documents.forEach((doc, index) => {
            expect(element(doc, "title").textContent).toBe("What should be drawn?");
            answer(doc, `First word ${index}`);
        });
    }

    documents.forEach((doc, index) => {
        expect(element(doc, "title").textContent).toMatch(/^Please draw: /);
        for (const id of ["game-send", "game-drawing-undo", "game-drawing-redo"]) {
            expect(element(doc, id).getClientRects().length).toBeGreaterThan(0);
        }
        pointStroke(doc, 20 * index);
    });
    if (reloadDrawing) {
        await session.reload(1);
        expect(element<HTMLButtonElement>(documents[1], "game-drawing-undo").disabled).toBe(false);
        session.failUpload();
        element(documents[1], "game-send").click();
        await expect
            .poll(() => element(documents[1], "game-error").textContent)
            .toBe("Drawing upload failed.");
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
            guesses.push(
                element(doc, "result-content").querySelector(".well h1:last-child")?.textContent,
            );
        }
        expect(guesses.sort()).toEqual(["Guess 0", "Guess 1", "Guess 2"]);
    }
    return { leader: documents[0], state };
}

async function checkExport(doc: Document) {
    const button = element<HTMLButtonElement>(doc, "result-export");
    await expect.poll(() => button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe("Save these results!");
    expect(button.querySelector("img")).not.toBeNull();
    expect(
        button.compareDocumentPosition(element(doc, "result-others")) &
            Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    button.click();
    const image = element<HTMLImageElement>(doc, "result-export-image");
    await expect.poll(() => image.naturalWidth, { timeout: 10000 }).toBe(600);
    expect(image.naturalHeight).toBeGreaterThan(600);
    const blob = await (await fetch(image.src)).blob();
    expect(blob.type).toBe("image/png");
    const download = element<HTMLAnchorElement>(doc, "result-export-download");
    expect(download.getClientRects().length).toBeGreaterThan(0);
    expect(download.href).toBe(image.src);
    expect(download.download).toMatch(/^drawphone-chain-\d+\.png$/);
    const canvas = doc.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const dark = doc.documentElement.dataset.theme === "dark";
    expect([...context.getImageData(0, 0, 1, 1).data]).toEqual(
        dark ? [23, 25, 29, 255] : [255, 255, 255, 255],
    );
    for (const x of [272, 300]) {
        const { data } = context.getImageData(x, 48, 26, 30);
        expect(data.some((red, i) => i % 4 === 0 && (dark ? red > 200 : red < 60))).toBe(true);
    }

    const { data } = context.getImageData(160, 220, 280, 500);
    expect(
        data.some((red, i) => i % 4 === 0 && red < 20 && data[i + 1] < 20 && data[i + 2] < 20),
    ).toBe(true);
    expect(element<HTMLDialogElement>(doc, "result-export-preview").open).toBe(true);
    element(doc, "result-export-close").click();
}

test("three players finish a word-pack game, reload a draft and reopen new and old results", async () => {
    const { leader, state } = await play(false, true);
    await checkExport(leader);
    const oldDrawing =
        "data:image/svg+xml;base64," +
        btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8"/></svg>',
        );
    const player = { name: "Old player" };
    const Dexie = (await import("dexie")).default;
    const db = new Dexie("DrawphoneDatabase");
    db.version(1).stores({ archive: "++id,date,chains" });
    await db.table("archive").add({
        date: new Date(2000, 0, 1),
        chains: [
            {
                id: 0,
                owner: player,
                links: [
                    { player, type: "word", data: "Old word" },
                    { player, type: "drawing", data: oldDrawing },
                    { player, type: "word", data: "Old guess" },
                ],
            },
        ],
    });
    db.close();

    element(leader, "result-done").click();
    await expect.poll(() => element<HTMLButtonElement>(leader, "lobby-start").disabled).toBe(false);
    element(leader, "archivebtn").click();
    const archive = element(leader, "archive-content");
    await expect.poll(() => archive.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
    for (const label of ["Guess", "Old word"]) {
        [...archive.querySelectorAll("button")]
            .find((entry) => entry.textContent.includes(label))!
            .click();
        const image = element(leader, "result-content").querySelector("img")!;
        expect(image.src).toMatch(/^data:image\/svg\+xml;base64,/);
        await expect.poll(() => image.naturalWidth).toBeGreaterThan(0);
        element(leader, "result-done").click();
        await expect
            .poll(() => archive.querySelectorAll("button").length)
            .toBeGreaterThanOrEqual(2);
    }
    element(leader, "archive-back").click();
    element(leader, "lobby-prevres").click();
    expect(element(leader, "title").textContent).toBe("Results #1");
    element(leader, "result-done").click();
    expect(element(leader, "lobby-start").textContent).toBe("Start Game");
    const previousRound = state().round?.id;
    element(leader, "lobby-start").click();
    await expect.poll(() => state().phase).toBe("round");
    expect(state().round?.id).not.toBe(previousRound);
    expect(state().round?.chains.every((chain) => chain.length === 1)).toBe(true);
}, 20000);

test("three players finish a players-write-first game", async () => {
    await play(true, false);
}, 20000);

test("solo demo only starts after confirmation", async () => {
    const session = await party(1);
    const [leader] = session.documents;
    session.start();
    element(leader, "lobby-settings-wordfirst").click();
    const start = element(leader, "lobby-start");
    const demo = element<HTMLDialogElement>(leader, "demo-confirm");
    start.click();
    expect(demo.open).toBe(true);
    demo.querySelector<HTMLButtonElement>('[value="cancel"]')!.click();
    expect(session.state().phase).toBe("lobby");
    start.click();
    demo.querySelector<HTMLButtonElement>('[value="start"]')!.click();
    await expect.poll(() => session.state().phase).toBe("round");
});

test("footer theme persists and keeps the drawing canvas white", async () => {
    const session = await party(1);
    const [leader] = session.documents;
    const picker = element<HTMLSelectElement>(leader, "drawphone-theme");
    const storage = window.localStorage;
    const previous = storage.getItem("drawphone:theme");
    const select = (value: string) => {
        picker.value = value;
        picker.dispatchEvent(new Event("change"));
    };

    try {
        select("auto");
        const systemDark = leader.defaultView!.matchMedia("(prefers-color-scheme: dark)").matches;
        expect(leader.documentElement.dataset.theme).toBe(systemDark ? "dark" : "light");
        select("light");
        expect(leader.documentElement.dataset.theme).toBe("light");
        select("dark");
        session.start();
        await session.reload(0);
        const reloaded = session.documents[0];
        expect(reloaded.documentElement.dataset.theme).toBe("dark");
        expect(element<HTMLSelectElement>(reloaded, "drawphone-theme").value).toBe("dark");
        element(reloaded, "lobby-settings-wordfirst").click();
        element(reloaded, "lobby-start").click();
        element(reloaded, "demo-confirm")
            .querySelector<HTMLButtonElement>('[value="start"]')!
            .click();
        answer(reloaded, "A phone");
        pointStroke(reloaded, 0);
        const lower = reloaded.querySelector<HTMLCanvasElement>(".lower-canvas")!;
        const upper = reloaded.querySelector<HTMLCanvasElement>(".upper-canvas")!;
        const colors = (canvas: HTMLCanvasElement) =>
            reloaded.defaultView!.getComputedStyle(canvas).backgroundColor;
        expect(colors(lower)).toBe("rgb(255, 255, 255)");
        expect(colors(upper)).toBe("rgba(0, 0, 0, 0)");
        await expect
            .poll(() => {
                const { data } = lower
                    .getContext("2d")!
                    .getImageData(0, 0, lower.width, lower.height);
                return data.some((value, index) => index % 4 === 3 && value > 0);
            })
            .toBe(true);
    } finally {
        if (previous === null) storage.removeItem("drawphone:theme");
        else storage.setItem("drawphone:theme", previous);
    }
});

test("the host can choose a late joiner to fill a vacant seat", async () => {
    const session = await party();
    const [leader] = session.documents;
    session.start();
    element(leader, "lobby-settings-wordfirst").click();
    element(leader, "lobby-start").click();
    answer(leader, "A cat");
    session.leave(1);

    const replacement = await session.join("Replacement");
    expect(element(replacement, "waiting-next-round").textContent).toContain(
        "Waiting for an open seat",
    );
    const openSeats = element(leader, "waiting-vacant-players");
    const replace = [...openSeats.querySelectorAll("button")].find(
        (button) => button.textContent === "Tap to replace",
    )!;
    expect(replacement.querySelector("#waiting-vacant-players button")).toBeNull();
    replace.click();
    const picker = element<HTMLSelectElement>(leader, "replace-seat-player");
    picker.value = "replacement";
    picker.dispatchEvent(new Event("change"));
    element(leader, "replace-seat").querySelector<HTMLButtonElement>('[value="replace"]')!.click();
    await expect
        .poll(() => element(replacement, "title").textContent)
        .toBe("What should be drawn?");
    expect(session.state().round?.seats.some(({ id }) => id === "replacement")).toBe(true);
});
