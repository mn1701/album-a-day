import json
import random
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request


def create_app(catalog_path=None):
    app = Flask(__name__)
    path = Path(catalog_path or Path(__file__).parents[1] / "data" / "albums.json")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/album")
    def album_of_the_day():
        albums = json.loads(path.read_text())
        genres = {item.strip().lower() for item in request.args.get("genres", "").split(",") if item.strip()}
        if genres:
            albums.sort(key=lambda item: len(genres.intersection(g.lower() for g in item["genres"])), reverse=True)
        # Stable within a day, so refreshes do not change the pick.
        chosen = random.Random(date.today().isoformat()).choice(albums[: min(3, len(albums))])
        return jsonify(chosen)

    return app
