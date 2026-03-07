# Listening client

The client uses React 18, TypeScript, Vite, and Tailwind CSS 4 with the official Vite plugin. Node.js 22.12 or newer is required by the configured tooling. Tailwind is built locally; there is no runtime CSS CDN or third-party font request.

## Application state

`LibraryProvider` owns the active profile and a coherent snapshot of catalog, daily pick, recommendations, queue, and summary statistics. All profile-specific requests carry the same profile ID. Switching profiles aborts stale requests and hides snapshots belonging to a previous profile. The selected profile ID is stored locally as a convenience; it is not a session credential.

Mutations use a shared in-flight lock to prevent duplicate button submissions. Queue additions, removals, and moves can update the visible snapshot optimistically. A completed mutation refreshes authoritative data. On failure, the client exposes an error and resynchronizes with the server. A profile changed while a request was in flight does not receive the old profile's success notification or results. This is client coordination within one tab, not an offline queue or a distributed transaction.

`lib/api.ts` centralizes typed response contracts, HTTP status errors, body decoding, cancellation, and twelve-second timeouts. Lazy page imports keep feature code out of the initial route bundle. A render error boundary provides a reload path without exposing listening notes to a telemetry service.

## Pages

- Discover combines profile statistics, the stable daily album, and explained recommendations.
- Catalog searches and sorts the loaded local collection by title, artist, release year, and genre. Filters operate in memory; this is not a remote full-text index.
- Listen Next orders a profile's queue with keyboard-friendly move buttons. The reorder request submits both the desired order and the observed previous order. The server takes a SQLite write transaction and rejects membership or order conflicts with 409.
- Listening Journal paginates thirty rows at a time using a row ID cursor. Filters apply only to loaded entries and the UI states that limit. Notes, ratings, and listening dates can be edited; deletion is scoped to a profile and row ID.
- Your Patterns uses server aggregates for rating counts, genre and artist frequency, recent listening months, and an 84-day calendar. Genre totals count an album once for each genre, so their sum can exceed the number of listens.
- Listening Rooms creates organizational profiles, selects the active room, and exports a complete JSON log and queue.

Hash routes support deep links and browser Back without adding a Flask catch-all navigation route. The album dialog restores prior focus, contains keyboard tab navigation, supports Escape, associates its title for assistive technology, and validates rating and date input. Reduced-motion preferences disable loading animation and transitions.

## Artwork and content

Album artwork is generated with CSS from stable metadata hashes. It is an abstract visual aid and does not claim to reproduce original album covers. The bundled catalog contains six albums and no audio playback, streaming provider credentials, artist artwork downloads, or subscription integration.

Daily choices remain stable per profile and date even when a new rating changes the recommendation vector. Editing or removing an old note updates later aggregates and recommendation refreshes; it does not silently replace today's stored pick.

## Persistence and trust

The backend remains a trusted local Flask service with SQLite storage. Profiles provide organization, not authentication or isolation against a user who can access the API. Notes render as text, and no HTML from notes is evaluated. A profile export includes its entire stored journal and queue. Client list filters and paging do not limit that export.

The queue migration adds a `position` column and index to existing databases. Older rows sort deterministically by position, timestamp, and album ID until explicitly reordered. Editing an entry preserves its album reference. Removing an entry does not add it back to the queue. Resume cursors are not a database snapshot; refresh to see concurrently added entries.

Installation: run `npm install`, then `npm run dev` in `client`; run `python app.py` in `server`. Vite proxies `/api` to localhost port 5000. `npm run build` creates assets served by Flask. A Node toolchain is required to verify the TypeScript and Tailwind production build. Browser behavior and builds were not exercised in the current environment.

Tailwind integration follows the [official Vite instructions](https://tailwindcss.com/docs/installation/using-vite).
