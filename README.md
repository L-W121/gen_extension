# gen_extension

`gen_extension` is a small automation project for `generals.io`.

It captures live game data from the browser, sends the current turn, leaderboard, and map state to a local backend, stores each turn as JSON, and returns simple AI move suggestions for expansion. A Tampermonkey userscript can also execute the returned move inside the game page.

## What It Does

- Extracts game state from the `generals.io` DOM
- Sends map and leaderboard data to a local server in real time
- Saves per-turn snapshots for later analysis
- Applies rule-based expansion logic to generate the next move
- Supports basic automatic in-browser move execution

## Tech Stack

- JavaScript (ES Modules)
- Node.js + Express
- Socket-ready backend setup with `socket.io`
- Tampermonkey userscript for browser-side automation
- Python helper script for map-related processing
