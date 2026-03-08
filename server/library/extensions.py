"""Profile-scoped recommendation feedback and ordered album collections."""
from flask import jsonify, request

def hidden_ids(db,profile):
    return {row['album_id'] for row in db.execute('SELECT album_id FROM hidden_albums WHERE profile_id=?',(profile,))}

def register_extensions(api,database,catalog):
    def owner(db):
        key=request.args.get('profile','local')
        if not db.execute('SELECT id FROM profiles WHERE id=?',(key,)).fetchone():raise ValueError('Unknown listening profile.')
        return key
    def body():
        value=request.get_json(silent=True)
        if not isinstance(value,dict):raise ValueError('A JSON object is required.')
        return value
    def album_view(album_id):
        return catalog.items.get(album_id,{'id':album_id,'title':'Removed from catalog','artist':'','year':0,'genres':[]})
    def fields(value):
        name=value.get('name','');description=value.get('description','');ids=value.get('album_ids',[])
        if not isinstance(name,str) or not 1<=len(name.strip())<=80:raise ValueError('Collection name must be 1 to 80 characters.')
        if not isinstance(description,str) or len(description)>500:raise ValueError('Description must be at most 500 characters.')
        if not isinstance(ids,list) or len(ids)>100 or not all(isinstance(i,str) and i in catalog.items for i in ids) or len(set(ids))!=len(ids):raise ValueError('Select up to 100 unique catalog albums.')
        return name.strip(),description,ids
    @api.get('/feedback/hidden')
    def feedback_list():
        with database.session() as db:
            key=owner(db)
            return jsonify([{**album_view(row['album_id']),'hidden_at':row['created_at']} for row in db.execute('SELECT * FROM hidden_albums WHERE profile_id=? ORDER BY created_at DESC,album_id',(key,))])
    @api.post('/feedback/hidden')
    def hide_album():
        album_id=body().get('album_id')
        if not isinstance(album_id,str) or album_id not in catalog.items:raise ValueError('Unknown catalog album.')
        with database.session() as db:
            key=owner(db);db.execute('INSERT OR IGNORE INTO hidden_albums(profile_id,album_id) VALUES(?,?)',(key,album_id))
        return '',204
    @api.delete('/feedback/hidden/<album_id>')
    def restore_album(album_id):
        with database.session() as db:
            key=owner(db);db.execute('DELETE FROM hidden_albums WHERE profile_id=? AND album_id=?',(key,album_id))
        return '',204
    @api.get('/collections')
    def collections():
        with database.session() as db:
            key=owner(db);result=[]
            for row in db.execute('SELECT * FROM collections WHERE profile_id=? ORDER BY updated_at DESC,id DESC',(key,)):
                items=[album_view(item['album_id']) for item in db.execute('SELECT album_id FROM collection_items WHERE collection_id=? ORDER BY position',(row['id'],))]
                result.append({**dict(row),'albums':items})
        return jsonify(result)
    @api.post('/collections')
    def create_collection():
        name,description,ids=fields(body())
        with database.session() as db:
            db.execute('BEGIN IMMEDIATE');key=owner(db)
            if db.execute('SELECT COUNT(*) FROM collections WHERE profile_id=?',(key,)).fetchone()[0]>=50:raise ValueError('A profile can have at most 50 collections.')
            if db.execute('SELECT id FROM collections WHERE profile_id=? AND name=? COLLATE NOCASE',(key,name)).fetchone():return jsonify(error='A collection with this name already exists.'),409
            result=db.execute('INSERT INTO collections(profile_id,name,description) VALUES(?,?,?)',(key,name,description));collection_id=result.lastrowid
            db.executemany('INSERT INTO collection_items(collection_id,album_id,position) VALUES(?,?,?)',[(collection_id,album_id,index) for index,album_id in enumerate(ids)])
        return jsonify(id=collection_id,version=1),201
    @api.put('/collections/<int:collection_id>')
    def replace_collection(collection_id):
        data=body();name,description,ids=fields(data);version=data.get('version')
        if type(version) is not int or version<1:raise ValueError('Provide the current collection version.')
        with database.session() as db:
            db.execute('BEGIN IMMEDIATE');key=owner(db)
            current=db.execute('SELECT * FROM collections WHERE id=? AND profile_id=?',(collection_id,key)).fetchone()
            if current is None:return jsonify(error='Collection not found.'),404
            if current['version']!=version:return jsonify(error='Collection changed. Reload before saving.'),409
            if db.execute('SELECT id FROM collections WHERE profile_id=? AND name=? COLLATE NOCASE AND id!=?',(key,name,collection_id)).fetchone():return jsonify(error='A collection with this name already exists.'),409
            db.execute('UPDATE collections SET name=?,description=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND profile_id=?',(name,description,collection_id,key))
            db.execute('DELETE FROM collection_items WHERE collection_id=?',(collection_id,))
            db.executemany('INSERT INTO collection_items(collection_id,album_id,position) VALUES(?,?,?)',[(collection_id,album_id,index) for index,album_id in enumerate(ids)])
        return jsonify(id=collection_id,version=version+1)
    @api.delete('/collections/<int:collection_id>')
    def remove_collection(collection_id):
        with database.session() as db:
            key=owner(db);result=db.execute('DELETE FROM collections WHERE id=? AND profile_id=?',(collection_id,key))
            if not result.rowcount:return jsonify(error='Collection not found.'),404
        return '',204
