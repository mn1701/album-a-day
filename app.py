"""Small, local album discovery service."""
import json
import sqlite3
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request

ROOT = Path(__file__).parent


def create_app(database=None, catalog=None):
    app = Flask(__name__)
    db_path = Path(database or ROOT / "albums.sqlite3")
    catalog_path = Path(catalog or ROOT / "albums.json")

    def connect():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        db.execute("CREATE TABLE IF NOT EXISTS listens (album_id TEXT NOT NULL, listened_on TEXT NOT NULL DEFAULT CURRENT_DATE, rating INTEGER CHECK(rating BETWEEN 1 AND 5), note TEXT DEFAULT '')")
        db.commit()
        return db

    def albums():
        return json.loads(catalog_path.read_text(encoding="utf-8"))

    @app.get("/")
    def home():
        return """<!doctype html><meta name=viewport content='width=device-width'><title>An Album a Day</title>
        <style>body{font:18px system-ui;max-width:680px;margin:3rem auto;padding:0 1rem;background:#10131a;color:#eef}button,input{font:inherit;padding:.6rem;margin:.25rem}article{padding:1.4rem;border:1px solid #556;border-radius:1rem}</style>
        <h1>An Album a Day</h1><p>A little nudge to listen to a full record.</p><article id=album>Loading today's pick…</article>
        <h2>Find another</h2><input id=genres placeholder='genres, separated by commas'><button onclick=listAlbums()>Browse catalog</button><div id=list></div>
        <script>
        async function today(){let a=await fetch('/api/today').then(r=>r.json());document.querySelector('#album').innerHTML=`<h2>${a.title}</h2><p>${a.artist} · ${a.year}</p><p>${a.genres.join(' / ')}</p><button onclick="rate('${a.id}',5)">Loved it</button> <button onclick="rate('${a.id}',3)">It was fine</button> <button onclick="rate('${a.id}',1)">Not for me</button>`}
        async function rate(id,rating){await fetch('/api/listens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({album_id:id,rating})});today()}
        async function listAlbums(){let g=encodeURIComponent(document.querySelector('#genres').value);let a=await fetch('/api/albums?genres='+g).then(r=>r.json());document.querySelector('#list').innerHTML=a.map(x=>`<p><b>${x.title}</b> · ${x.artist} (${x.year})</p>`).join('')}
        today();</script>"""

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/albums")
    def list_albums():
        wanted = {x.strip().casefold() for x in request.args.get("genres", "").split(",") if x.strip()}
        items = albums()
        if wanted:
            items.sort(key=lambda a: (len(wanted.intersection(g.casefold() for g in a["genres"])), a["title"].casefold()), reverse=True)
        return jsonify(items)

    @app.get("/api/today")
    def today():
        db = connect()
        recent = {r[0] for r in db.execute("SELECT album_id FROM listens WHERE listened_on >= date('now','-30 days')")}
        db.close()
        available = [a for a in albums() if a["id"] not in recent] or albums()
        # Rotate reproducibly so the same local catalog yields one stable daily pick.
        day_number = date.today().toordinal()
        return jsonify(available[day_number % len(available)])

    @app.post("/api/listens")
    def record_listen():
        body = request.get_json(silent=True) or {}
        known = {a["id"] for a in albums()}
        album_id, rating = body.get("album_id"), body.get("rating")
        if album_id not in known or not isinstance(rating, int) or not 1 <= rating <= 5:
            return jsonify(error="Use a catalog album_id and a rating from 1 to 5."), 400
        db = connect()
        db.execute("INSERT INTO listens(album_id, rating) VALUES (?, ?)", (album_id, rating))
        db.commit()
        db.close()
        return jsonify(status="saved"), 201

    @app.get("/api/listens")
    def listen_history():
        db = connect()
        rows = db.execute("SELECT album_id, listened_on, rating, note FROM listens ORDER BY listened_on DESC, rowid DESC LIMIT 100").fetchall()
        db.close()
        by_id = {a["id"]: a for a in albums()}
        return jsonify([{**by_id[r["album_id"]], "listened_on": r["listened_on"], "rating": r["rating"]} for r in rows])

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5000)
