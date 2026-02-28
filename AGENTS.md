# LiftLog

A personal gym training log PWA built with SvelteKit + Convex + Tailwind CSS.

## Cursor Cloud specific instructions

### Architecture

- **Frontend**: SvelteKit (Svelte 5) with Vite dev server on port 5173
- **Backend**: Convex (cloud-hosted real-time database + serverless functions in `convex/`)
- **Styling**: Tailwind CSS 4
- **Auth**: Password-based + Google OAuth via Convex Auth
- **Package manager**: npm (uses `package-lock.json`)

### Common commands

See `package.json` scripts:

- `npm run dev` — Start Vite dev server (port 5173)
- `npm run check` — Run `svelte-kit sync` + `svelte-check` (TypeScript/Svelte linting)
- `npm run build` — Production build
- No ESLint or Prettier configured in this project; `svelte-check` is the primary lint tool.

### Environment variables

Copy `.env.example` to `.env.local`. Required:

- `PUBLIC_CONVEX_URL` — Convex deployment URL (required for backend connectivity)

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth login
- `OPENAI_API_KEY` — For AI workout modifications (stored client-side in browser localStorage)

### Gotchas

- The Convex backend is a cloud service — there is no local database to run. Without a valid `PUBLIC_CONVEX_URL`, the frontend renders but all backend operations (auth, data) will fail at runtime. The placeholder URL from `.env.example` allows the dev server to start.
- `npx convex dev` syncs Convex functions to a cloud deployment and is interactive (requires a Convex account). It is NOT needed just to run the frontend.
- The `convex/_generated/` directory contains auto-generated types. Do not edit these files manually.
- There are no automated test suites (no test runner configured). Validation is done via `npm run check` (svelte-check).
