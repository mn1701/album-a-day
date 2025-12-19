# An Album a Day

A local album discovery app with a daily pick, genre-filtered catalog, and a private SQLite listening log. The included catalog is deliberately small and editable. No account or external music service is required.

## Run it

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000. Picks rotate from the catalog and skip albums logged in the last 30 days when possible. Ratings and history stay in albums.sqlite3 on your machine. This is a lightweight catalog-based recommender, not a trained machine-learning model.
