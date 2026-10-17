# Agent instructions

- This is a dependency-free HTML5 Canvas game; `index.html` is the entrypoint and `game.js` contains the complete game loop and state.
- There is no build, test, lint, or typecheck configuration. Validate changes manually in a browser.
- Run locally with `npx serve .` and open `http://localhost:3000`; opening `index.html` directly also works.
- Keep the canvas contract intact: `index.html` uses an `800x600` canvas with the classic script `game.js`.
- When changing gameplay, verify keyboard controls (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`), wrapping at all edges, shooting/collisions, level progression, lives, and game-over restart.
