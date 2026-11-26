import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pug from "pug";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { viteSingleFile } from "vite-plugin-singlefile";

const pages = new Map(
    Object.entries({
        "index.html": "landing",
        "how-to-play.html": "howtoplay",
        "archive.html": "archive",
        "drawphone.html": "index",
    }),
);

function renderPage(view: string) {
    const icon = (name: string) =>
        "data:image/svg+xml;base64," +
        readFileSync(
            resolve("node_modules/@fortawesome/fontawesome-free/svgs/solid", name + ".svg"),
        ).toString("base64");
    return pug.renderFile(resolve("server/views", view + ".pug"), { icon });
}

const entries = new Map([...pages].map(([file, view]) => [resolve(file), view]));

export default defineConfig(({ mode }) => ({
    base: "./",
    plugins: [
        {
            name: "drawphone-pug",
            resolveId(id) {
                const file = resolve(id);
                if (entries.has(file)) return file;
            },
            load(id) {
                const view = entries.get(id);
                if (view) return renderPage(view);
            },
            configureServer(server) {
                server.middlewares.use(async (req, res, next) => {
                    if (req.method !== "GET" && req.method !== "HEAD") return next();
                    const path = req.url?.split("?")[0];
                    const file = path === "/" ? "index.html" : path?.slice(1);
                    const entry = file && (file.endsWith(".html") ? file : file + ".html");
                    const view = entry && pages.get(entry);
                    if (!view) return next();
                    try {
                        const html = await server.transformIndexHtml("/" + entry, renderPage(view));
                        res.setHeader("Content-Type", "text/html; charset=utf-8");
                        res.end(req.method === "HEAD" ? undefined : html);
                    } catch (error) {
                        next(error);
                    }
                });
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
