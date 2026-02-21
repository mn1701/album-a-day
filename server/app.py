"""Application composition for the local listening library."""
import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from library.catalog import Catalog
from library.database import Database
from library.recommendation import Recommender
from library.routes import routes

ROOT=Path(__file__).parent
DIST=ROOT.parent/'client/dist'

def create_app(database=None,catalog=None):
    app=Flask(__name__)
    app.config['MAX_CONTENT_LENGTH']=128*1024
    collection=Catalog(catalog or os.environ.get('ALBUM_CATALOG',ROOT/'albums.json'))
    db=Database(database or os.environ.get('ALBUM_DATABASE',(ROOT/'albums.sqlite3' if (ROOT/'albums.sqlite3').exists() else ROOT/'data/albums.sqlite3')))
    app.register_blueprint(routes(db,collection,Recommender(collection)))
    @app.get('/')
    def home():
        return send_from_directory(DIST,'index.html') if DIST.exists() else jsonify(service='An Album a Day API',client='Run the Vite client on port 5175.')
    @app.get('/<path:path>')
    def assets(path): return send_from_directory(DIST,path)
    return app

if __name__=='__main__': create_app().run(host='127.0.0.1',port=5000)
