# LiftLog

A personal gym training log with AI-powered workout modifications. Built with SvelteKit, Convex, and Tailwind CSS.

## Features

- **5 Core Lifts**: Squat, Bench Press, Barbell Row, Overhead Press, Deadlift
- **Automatic Warmup**: Calculates warmup sets based on work weight
- **Simple Progress Tracking**: Tap to complete sets, automatic progression on success
- **Customizable Equipment**: Mark what equipment you have access to
- **AI-Powered Modifications**: (Coming soon) Ask the AI to modify workouts on the fly

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account (free tier available)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will guide you through creating a Convex project and generate the necessary configuration.

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update `PUBLIC_CONVEX_URL` with your Convex deployment URL.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**
   Navigate to `http://localhost:5173` on your phone or browser.

### Deploying

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy to Convex**
   ```bash
   npx convex deploy
   ```

3. **Deploy the frontend** (Vercel, Netlify, etc.)
   Follow your preferred platform's instructions for deploying SvelteKit apps.

## Project Structure

```
src/
  lib/
    components/     # Reusable Svelte components
    data/          # Exercise definitions and constants
    stores/        # Svelte stores for state management
    types/         # TypeScript type definitions
    utils/         # Helper functions (warmup calculations, etc.)
  routes/          # SvelteKit routes
    workout/       # Active workout screen
    history/       # Workout history
    settings/      # Exercise weights and equipment
convex/
  schema.ts        # Database schema
  userProfiles.ts  # User profile mutations/queries
  workouts.ts      # Workout mutations/queries
```

## Tech Stack

- **Frontend**: SvelteKit 2.x + Svelte 5
- **Styling**: Tailwind CSS 4
- **Backend**: Convex (real-time database + server functions)
- **State**: TanStack Query + Svelte stores
- **PWA**: vite-plugin-pwa

## License

MIT
