# Packet Prep

A client-side networking final exam reviewer built with Next.js. The question bank is based on the provided COSC 85 Finals Reviewer and covers protocols, Packet Tracer, router modes, configurations, password security, and troubleshooting.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run lint
npm test
npm run build
```

## Deploy to Vercel

From this folder, run `npx vercel` to deploy with the Vercel CLI, or push the project to a Git provider and import that repository in Vercel. The default Next.js framework settings and `npm run build` are ready to use; no environment variables or backend services are required.

Background music and answer sounds are synthesized in the browser with the Web Audio API. Audio starts only after the user enables it.
