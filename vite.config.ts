import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pug from "pug";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { viteSingleFile } from "vite-plugin-singlefile";

const pages = {
    "index.html": "landing",
    "how-to-play.html": "howtoplay",
    "archive.html": "archive",
    "drawphone.html": "index",
};

export default defineConfig(({ mode }) => ({
    base: "./",
    plugins: [
        {
            name: "drawphone-pug",
            transformIndexHtml: {
                order: "pre",
                handler(html, { filename }) {
                    const view = pages[filename.split("/").at(-1) as keyof typeof pages];
                    if (!view) return html;
                    const icon = (name: string) =>
                        "data:image/svg+xml;base64," +
                        readFileSync(
                            resolve(
                                "node_modules/@fortawesome/fontawesome-free/svgs/solid",
                                name + ".svg",
                            ),
                        ).toString("base64");
                    return pug.renderFile(resolve("server/views", view + ".pug"), { icon });
                },
            },
        },
        ...(mode === "nova" ? [viteSingleFile()] : []),
    ],
    build: {
        emptyOutDir: mode !== "nova",
        copyPublicDir: mode !== "nova",
        rolldownOptions: {
            input:
                mode === "nova"
                    ? "drawphone.html"
                    : ["index.html", "how-to-play.html", "archive.html"],
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    exclude: [
                        "**/*.browser.test.ts",
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/.git/**",
                        "**/server/public/**",
                        "**/.vitest/**",
                    ],
                },
            },
            {
                extends: true,
                test: {
                    name: "browser",
                    include: ["**/*.browser.test.ts"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
    },
}));
