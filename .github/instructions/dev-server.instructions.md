---
description: "Use when starting a dev server, running locally, testing before deploying, or pushing to GitHub. Enforces that the dev server always runs on localhost:3000, all other instances are stopped first, and a running server is confirmed before any git push."
---

# Dev Server Rules

## Port & URL
- The dev server **always** runs on `localhost:3000` — never any other port (no `--port=3001`, no `--port=3000` override needed since 3000 is the default)
- Use `npm run dev` with no port flag

## Before Starting the Dev Server
- Kill **all running dev server processes** first — check for any `node` processes listening on ports 3000–3009 and stop them
- On Windows (PowerShell):
  ```powershell
  Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'next' } | Stop-Process -Force
  ```
- Wait for the port to be free before starting

## Starting the Server
- Always start the dev server **as a background process** with `isBackground: true` so the terminal stays responsive
- After starting, wait ~8 seconds then confirm it is up by calling `http://localhost:3000/api/health` or loading the home page
- Only proceed once the server confirms healthy

## Before Pushing to GitHub
1. Ensure the dev server is **running and healthy** at `localhost:3000`
2. Do a quick smoke-test of the feature being pushed (request the relevant route in the browser or via curl)
3. Only then run `git push`
- **Never push to GitHub if the dev server fails to start or returns errors**
