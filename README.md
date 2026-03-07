# An Album a Day

A personal listening library with daily album picks, explained recommendations, a listening queue, ratings, notes, and separate local profiles. The React, TypeScript, and Tailwind CSS client talks to a Flask API backed by SQLite and a JSON album catalog.

## Run

Requires Python 3.10 or newer and Node.js 22.12 or newer with npm.

```sh
cd server
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Run `npm install` and `npm run dev` in `client` in another terminal. The API listens on localhost port 5000 and the client on port 5175. `npm run build` produces client assets for Flask. `ALBUM_DATABASE` overrides the database path. An existing `server/albums.sqlite3` is retained when present; otherwise the database lives in `server/data/albums.sqlite3`. `ALBUM_CATALOG` selects a replacement catalog JSON file.

## Recommendations

The content model builds normalized TF-IDF vectors from weighted genres, artist identity, and decade. Ratings form a preference vector with a 180 day decay. Candidate scoring includes unseen-album novelty and a stable daily tiebreaker. Greedy selection penalizes similarity to albums already chosen, and explanations identify matched genres or exploration choices.

Albums heard in the last 30 days are excluded until the small catalog is exhausted. A daily pick is stored per profile and date so recording a new rating does not change that day's selection. The included six-album catalog is deliberately small; expand it to make ranking and diversity more useful. `python scripts/inspect_catalog.py albums.json --album a1` prints content neighbors for inspecting the catalog model.

## Library and API

Local profiles separate listening histories and queues. One profile selection controls discovery, the daily pick, queue, journal, and analytics throughout the client. Profile IDs are organizational labels and provide no access control.

`/api/albums` searches the catalog. `/api/recommendations` returns ranked explanations; `/api/today` persists the daily choice. `/api/listens` records ratings and notes and supports history pagination through a row ID cursor. `/api/queue` manages the queue, `/api/stats` summarizes listening, and `/api/export` exports profile data. Pass `profile` to choose a profile. Successful logging removes an album from its queue.

`server/library` separates catalog vectors, ranking, storage, and API routes. `client/src/state/LibraryProvider.tsx` coordinates profile state, cancellations, and optimistic queue updates. Lazy-loaded pages provide discovery, catalog filters, ordered queues, an editable paginated journal, insights, and profile management. The client is styled with Tailwind CSS 4 and includes an accessible album dialog, empty states, error recovery, and generated album artwork. The service is intended for trusted local use. Catalog entries require unique IDs, titles, artists, genres, and a year. Removed catalog entries remain visible in listening history using their saved IDs.

## Client and journal extensions

Queue order persists in SQLite. Reordering supplies the previous order and rejects concurrent changes before applying a new order transactionally. Journal entries support profile-scoped editing and deletion. `/api/insights` aggregates actual listening records for genres, artists, ratings, monthly activity, and a twelve-week calendar. UI journal search covers loaded pages; profile exports cover all stored entries.

See [client architecture](docs/client-architecture.md) for screen behavior, API contracts, migration details, and current validation limits. Audio playback and streaming service integration are outside this application's scope.
