import sqlite3
from contextlib import contextmanager, closing
from pathlib import Path

class Database:
    def __init__(self, path):
        self.path=Path(path)
        self.path.parent.mkdir(parents=True,exist_ok=True)
        with self.session() as db:
            db.executescript('''
              CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS hidden_albums(profile_id TEXT NOT NULL REFERENCES profiles(id),album_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(profile_id,album_id));
              CREATE TABLE IF NOT EXISTS collections(id INTEGER PRIMARY KEY AUTOINCREMENT,profile_id TEXT NOT NULL REFERENCES profiles(id),
                name TEXT NOT NULL COLLATE NOCASE,description TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(profile_id,name));
              CREATE TABLE IF NOT EXISTS collection_items(collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                album_id TEXT NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(collection_id,album_id));
              INSERT OR IGNORE INTO profiles VALUES('local','My listening room');
              CREATE TABLE IF NOT EXISTS listens(album_id TEXT NOT NULL,listened_on TEXT NOT NULL DEFAULT CURRENT_DATE,
                rating INTEGER CHECK(rating BETWEEN 1 AND 5),note TEXT NOT NULL DEFAULT '',profile_id TEXT NOT NULL DEFAULT 'local');
              CREATE TABLE IF NOT EXISTS queue(profile_id TEXT NOT NULL REFERENCES profiles(id),album_id TEXT NOT NULL,
                added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(profile_id,album_id));
              CREATE TABLE IF NOT EXISTS daily_picks(profile_id TEXT NOT NULL,day TEXT NOT NULL,album_id TEXT NOT NULL,
                explanation TEXT NOT NULL,PRIMARY KEY(profile_id,day));
            ''')
            fields={r['name'] for r in db.execute('PRAGMA table_info(listens)')}
            if 'profile_id' not in fields: db.execute("ALTER TABLE listens ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'local'")
            queue_fields={r['name'] for r in db.execute('PRAGMA table_info(queue)')}
            if 'position' not in queue_fields: db.execute('ALTER TABLE queue ADD COLUMN position INTEGER NOT NULL DEFAULT 0')
            db.execute('CREATE INDEX IF NOT EXISTS queue_profile_position ON queue(profile_id,position)')
            db.execute('CREATE INDEX IF NOT EXISTS listens_profile_date ON listens(profile_id,listened_on)')

    @contextmanager
    def session(self):
        with closing(sqlite3.connect(self.path,timeout=10)) as db:
            db.row_factory=sqlite3.Row
            db.execute('PRAGMA foreign_keys=ON')
            with db: yield db
