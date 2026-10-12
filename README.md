# Paperplane

A browser-only, local-first whiteboard powered by the actual MIT-licensed Excalidraw editor. No Docker, server database, account, or API key.

Paperplane's application source is released under the MIT license. See `LICENSE` and `THIRD_PARTY_NOTICES.md` for licensing and dependency attribution.

## Run

Node.js 20.19+ or 22.12+ is required for the development tools.

```
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:3001).

## Deploy

```
npm run build
```

Publish `dist/` on any static web host. Excalidraw fonts are bundled locally. The development server is only a build tool, not a production backend. This project can use npm/Vite in a compatible WebContainer environment; compatibility with Solvante's compiler still needs testing there.

## Features

Full Excalidraw drawing tools, text, shapes, images, arrows, undo/redo, zoom, dark canvas, local board library, templates, favorites, search, rename, duplicate, PNG/SVG/editable exports, and editable imports.

Boards and embedded images live in IndexedDB, separately for each browser profile and website origin. Closing and reopening the browser preserves saved data. Clearing site data, private browsing, browser storage eviction, or changing the deployment origin can remove or isolate it. Export `.excalidraw` backups for important work. Nothing syncs between devices. Multiplayer, cloud links, and AI features are intentionally excluded.

Autosave errors are displayed rather than reported as successful saves. The app warns when leaving with a pending save. PNG/SVG exports need at least one visible canvas element.

## Attribution

Editor: https://github.com/excalidraw/excalidraw (MIT). Paperplane is an independent app, not an official Excalidraw product. Excalidraw's license is in THIRD_PARTY_NOTICES.md. Other dependency notices remain in their distributed packages.

## Verification

`scripts/verify.cjs` runs a browser test covering drawing, reload and browser-restart persistence, PNG/SVG/editable exports, import, favorites, duplication, search and mobile layout. It uses Playwright installed separately as a test tool. Set `PAPERPLANE_PLAYWRIGHT_PATH` to a Playwright package directory and optionally `PAPERPLANE_BROWSER_EXECUTABLE` to your Chrome executable, then run `node scripts/verify.cjs` while the preview serves port 3001.
