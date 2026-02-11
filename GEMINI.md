# GEMINI.md

Project-specific guidance for Gemini CLI when working in this repository.

## Repository Overview

This repository is a monorepo with two main applications:

- `client/`: Next.js + TypeScript frontend for collaborative canvas drawing.
- `server/`: Node.js + TypeScript Socket.io backend for real-time sync.

Primary entry points:

- Frontend routes: `client/app/`
- Frontend UI: `client/components/`
- Frontend logic/hooks: `client/hooks/`
- Backend server: `server/src/index.ts`

## Development Commands

Run commands from the repository root unless noted otherwise.

- Install all dependencies: `npm run install:all`
- Start frontend dev server: `npm run dev`
- Start backend dev server: `npm run server`
- Lint frontend: `npm run lint`
- Build frontend: `npm run build`
- Build backend: `npm run server:build`
- Start backend production build: `npm run server:start`

## Coding Guidelines

- Keep changes minimal and directly scoped to the request.
- Preserve existing TypeScript patterns and component/hook structure.
- Prefer clear, incremental changes over broad refactors.
- Avoid unrelated formatting-only edits.
- Do not introduce unnecessary dependency or lockfile churn.

## Documentation and Platform Changes

- Keep root `README.md`, `client/README.md`, and `server/README.md` consistent with behavior changes.
- If new platforms are added in the future (for example, a desktop app), update setup and architecture documentation in the same change.
- Keep architecture notes accurate when changing data flow or deployment shape.

## Review and Validation Expectations

When asked to review or implement changes:

- Prioritize correctness and regression risk.
- Verify impacted behavior with the most relevant available checks (lint/build/tests if present).
- Call out assumptions, edge cases, and testing gaps explicitly.

## Safety Guardrails

- Never commit secrets or credentials.
- Never use destructive git operations unless explicitly requested.
- Respect and preserve existing uncommitted work in the tree.
- Do not modify unrelated files.
