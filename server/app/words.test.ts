import { expect, test } from "vitest";
import WordPacks from "./words.js";

test("all packs load and the age filter excludes both mature packs", () => {
    const packs = new WordPacks();
    packs.loadAll();

    const all = WordPacks.getAllPackNames(false);
    const safe = WordPacks.getAllPackNames(true);
    expect(all.filter((pack) => !safe.includes(pack))).toEqual([
        "Immature words (13+)",
        "Naughty words (18+)",
    ]);
    for (const name of all) expect(packs.getRandomWord(name).trim()).not.toBe("");
});
