# Agent instructions

## Philosophy

- Drawphone was hand-written by Tanner in high school and college and is
  sentimental. Change code and structure only when a task needs it.
- Preserve `git blame`. Edit lines in place rather than rewriting files.
  Moving files with `git mv` is fine. Never reformat code you aren't changing.
  If a mass reformat is unavoidable, put it in its own commit and list that
  commit in `.git-blame-ignore-revs`.
- Existing files stay `.js`. New files are `.ts`. Don't add `// @ts-check` or
  JSDoc type comments to old files.
- Keep the codebase clean: remove dead code, unused dependencies and clutter
  instead of working around them.
- Prefer simple yet robust designs with the fewest moving parts. Prefer
  built-in browser or library features, or small, mature libraries, over
  custom logic. Avoid heavy dependencies: the Nova build is one HTML file of
  at most 2 MiB.
- Design from first principles so every scenario works within reason,
  including rare ones like very large parties. Don't rely on measuring real
  usage, and don't restrict game features to fit a limit. Fix the design, or
  raise the limit in Nova, which Tanner also maintains.
- Keep and upgrade the libraries the files are built around, such as jQuery,
  Pug and Fabric, rather than replacing them.
- Tests cover only the valuable flows and stay simple.

## Nova

Drawphone runs as a hosted Nova game. Follow the API reference and porting
guide in the rocketcrab repo:

- `~/code/rocketcrab/apps/nova/src/lib/prompt/nova-api-reference.md`
- `~/code/rocketcrab/apps/nova/src/lib/catalog/hosted-nova-games.md`

Nova's limits live in `~/code/rocketcrab/packages/protocol/src/limits.ts`.

## Planning

- Large work is tracked in `PLAN.md`. Commit plan updates as you go, and
  remove items once they're done.
- If part of the plan is outdated, conflicts with this file, or you have a
  better idea, change the plan, as long as it still fits this philosophy.
- Record issues you notice along the way in `PLAN.md`, and mention them to
  Tanner at the end.
- Don't create a `CLAUDE.md` or design docs. Explain non-obvious code with
  short inline comments.
