![Drawphone](https://i.imgur.com/UDwA90p.png)

### Play now at: [drawphone.tannerkrewson.com](https://drawphone.tannerkrewson.com/)

Drawphone was built with Node.js, jQuery and [Pug](https://github.com/pugjs/pug). It was one of my first coding projects, so the code is a bit of a mess... 😂

Issues, feature requests, and pull requests welcome!

## Development

1. Install Node.js 26.13.1 from `.nvmrc`, then run `npm ci`.
2. Run `npx playwright install chromium` for the browser tests.
3. Run `npm run dev` to serve the static pages with Vite.
4. Run `npm run build` and load `dist/drawphone.html` into the [Nova editor](https://rocketcrab.com/editor) to play it in a party.

Run `npm run format`, `npm run lint`, `npm run typecheck`, and `npm test` to check changes. The browser tests run the built game in one iframe per player with a fake Nova party.

## Hosting

GitHub Pages publishes `dist/` from `main`. The four pages are the landing page, how to play, the results archive, and `drawphone.html`. Nova loads that last page as one self-contained HTML file. Nova handles players, shared state, and drawing files during a round. The results archive uses IndexedDB on the device where you played.
