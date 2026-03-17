# Agent Instructions

## Domain Dictionary

See [DICTIONARY.md](./DICTIONARY.md) for definitions of domain terms like:
- Program vs Workout vs Exercise
- Set vs Rep
- Progression, Deload, etc.

This ensures consistent terminology when discussing features and code changes.

---

## Project Overview

This is a personal gym training log app (LiftLog) built with:
- **Frontend**: SvelteKit + Tailwind CSS
- **Backend**: Convex (serverless database/functions)
- **Auth**: OAuth via Convex Auth
- **AI**: OpenAI integration for workout modifications

## Key Directories

- `src/routes/` - SvelteKit pages
- `src/lib/` - Shared utilities, types, stores, components
- `convex/` - Backend functions and schema
- `plans/` - Architecture decision records and specs

## Important Types

Core domain types are in `src/lib/types/index.ts`:
- `Exercise` - Static exercise definitions
- `TrainingProgram` / `ProgramWorkout` - Program structure
- `WorkoutSet` - Individual sets within a workout
- `UserExerciseSettings` - User's current weights/progression

## Development Commands

```bash
npm run dev        # Start dev server (Vite + Convex)
npm run build      # Build for production
npm run check      # TypeScript check
```
