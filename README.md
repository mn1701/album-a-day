# An Album a Day

A personal listening library with daily album picks, explained recommendations, a listening queue, ratings, notes, and separate local profiles. The React and TypeScript client talks to a Flask API backed by SQLite and a JSON album catalog.

## Run

Requires Python 3.10 or newer and Node.js with npm.

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

Local profiles separate listening histories and queues. The main dashboard uses the default local profile; the listening desk switches profiles explicitly. Profile IDs are organizational labels and provide no access control.

`/api/albums` searches the catalog. `/api/recommendations` returns ranked explanations; `/api/today` persists the daily choice. `/api/listens` records ratings and notes and supports history pagination through a row ID cursor. `/api/queue` manages the queue, `/api/stats` summarizes listening, and `/api/export` exports profile data. Pass `profile` to choose a profile. Successful logging removes an album from its queue.

`server/library` separates catalog vectors, ranking, storage, and API routes. `client/src/features/ListeningDesk.tsx` provides the profile, queue, recommendation, and export workflow. The service is intended for trusted local use. Catalog entries require unique IDs, titles, artists, genres, and a year. Removed catalog entries remain visible in listening history using their saved IDs.
