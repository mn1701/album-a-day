import json
import re
from datetime import date
from flask import Blueprint, jsonify, request

def routes(database,catalog,recommender):
    api=Blueprint('library',__name__,url_prefix='/api')
    def profile(db):
        key=request.args.get('profile','local')
        if not db.execute('SELECT id FROM profiles WHERE id=?',(key,)).fetchone(): raise ValueError('Unknown listening profile.')
        return key
    def payload():
        data=request.get_json(silent=True)
        if not isinstance(data,dict): raise ValueError('A JSON object is required.')
        return data
    def bounded(name,default,upper):
        try: value=int(request.args.get(name,default))
        except ValueError: raise ValueError(f'{name} must be an integer.')
        if not 1<=value<=upper: raise ValueError(f'{name} must be between 1 and {upper}.')
        return value
    def events(db,key):
        return [dict(r) for r in db.execute('SELECT rowid AS listen_id,* FROM listens WHERE profile_id=? ORDER BY listened_on DESC,rowid DESC LIMIT 5000',(key,))]
    @api.errorhandler(ValueError)
    def invalid(exc): return jsonify(error=str(exc)),400
    @api.get('/health')
    def health(): return {'status':'ok','model':recommender.version,'catalog_size':len(catalog.items)}
    @api.get('/profiles')
    def profiles():
        with database.session() as db: return jsonify([dict(r) for r in db.execute('SELECT * FROM profiles ORDER BY name')])
    @api.post('/profiles')
    def create_profile():
        data=payload(); key=data.get('id',''); name=data.get('name','')
        if not isinstance(key,str) or not re.fullmatch(r'[a-z0-9_-]{1,40}',key): raise ValueError('Profile ID must use lowercase letters, numbers, hyphens or underscores.')
        if not isinstance(name,str) or not 1<=len(name.strip())<=100: raise ValueError('Profile name is required.')
        with database.session() as db:
            if db.execute('SELECT id FROM profiles WHERE id=?',(key,)).fetchone(): return jsonify(error='Profile already exists.'),409
            db.execute('INSERT INTO profiles VALUES(?,?)',(key,name.strip()))
        return jsonify(id=key,name=name.strip()),201
    @api.get('/albums')
    def albums(): return jsonify(catalog.search(request.args.get('q',''),request.args.get('genres','')))
    @api.get('/recommendations')
    def recommendations():
        limit=bounded('limit',10,50)
        with database.session() as db: history=events(db,profile(db))
        return jsonify(recommender.rank(history,limit))
    @api.get('/today')
    def today():
        with database.session() as db:
            db.execute('BEGIN IMMEDIATE'); key=profile(db); day=date.today().isoformat()
            saved=db.execute('SELECT * FROM daily_picks WHERE profile_id=? AND day=?',(key,day)).fetchone()
            if saved and saved['album_id'] in catalog.items:
                return jsonify({**catalog.items[saved['album_id']],'reasons':json.loads(saved['explanation'])})
            pick=recommender.rank(events(db,key),1)[0]
            db.execute('INSERT OR REPLACE INTO daily_picks VALUES(?,?,?,?)',(key,day,pick['album']['id'],json.dumps(pick['reasons'])))
            return jsonify({**pick['album'],'reasons':pick['reasons']})
    @api.post('/listens')
    def listen():
        data=payload(); album_id=data.get('album_id'); rating=data.get('rating'); note=data.get('note','')
        if not isinstance(album_id,str) or album_id not in catalog.items or type(rating) is not int or not 1<=rating<=5: raise ValueError('Use a catalog album ID and integer rating from 1 to 5.')
        if not isinstance(note,str) or len(note)>4000: raise ValueError('Note must be at most 4000 characters.')
        raw_date=data.get('listened_on',date.today().isoformat())
        if not isinstance(raw_date,str): raise ValueError('Listening date must be an ISO date string.')
        listened_on=date.fromisoformat(raw_date)
        if listened_on>date.today(): raise ValueError('Listening dates cannot be in the future.')
        with database.session() as db:
            key=profile(db)
            cur=db.execute('INSERT INTO listens(album_id,rating,note,listened_on,profile_id) VALUES(?,?,?,?,?)',(album_id,rating,note,listened_on.isoformat(),key))
            db.execute('DELETE FROM queue WHERE profile_id=? AND album_id=?',(key,album_id))
            return jsonify(status='saved',listen_id=cur.lastrowid),201
    @api.get('/listens')
    def history():
        limit=bounded('limit',100,500)
        before=bounded('before',2**63-1,2**63-1)
        with database.session() as db:
            key=profile(db)
            rows=db.execute('SELECT rowid AS listen_id,* FROM listens WHERE profile_id=? AND rowid<? ORDER BY rowid DESC LIMIT ?',(key,before,limit)).fetchall()
        result=[]
        for row in rows:
            album=catalog.items.get(row['album_id'],{'id':row['album_id'],'title':'Removed from catalog','artist':'','genres':[],'year':0})
            result.append({**album,**dict(row)})
        response=jsonify(result)
        if rows: response.headers['X-Next-Cursor']=str(rows[-1]['listen_id'])
        return response
    @api.get('/stats')
    def stats():
        with database.session() as db:
            key=profile(db)
            row=db.execute('SELECT COUNT(*) AS listens,AVG(rating) AS average_rating,MAX(listened_on) AS last_listened,COUNT(DISTINCT album_id) AS unique_albums,COUNT(DISTINCT listened_on) AS listening_days FROM listens WHERE profile_id=?',(key,)).fetchone()
        return jsonify({**dict(row),'average_rating':round(row['average_rating'],1) if row['average_rating'] else None,'catalog_size':len(catalog.items)})
    @api.get('/queue')
    def queue():
        with database.session() as db:
            key=profile(db)
            return jsonify([{**catalog.items[r['album_id']],'added_at':r['added_at']} for r in db.execute('SELECT * FROM queue WHERE profile_id=? ORDER BY added_at,album_id',(key,)) if r['album_id'] in catalog.items])
    @api.post('/queue')
    def enqueue():
        album_id=payload().get('album_id')
        if not isinstance(album_id,str) or album_id not in catalog.items: raise ValueError('Unknown album.')
        with database.session() as db:
            key=profile(db)
            db.execute('INSERT OR IGNORE INTO queue(profile_id,album_id) VALUES(?,?)',(key,album_id))
        return jsonify(status='queued'),201
    @api.delete('/queue/<album_id>')
    def dequeue(album_id):
        with database.session() as db:
            key=profile(db); db.execute('DELETE FROM queue WHERE profile_id=? AND album_id=?',(key,album_id))
        return '',204
    @api.get('/export')
    def export():
        with database.session() as db:
            key=profile(db)
            data={'version':1,'profile':key,'listens':[dict(r) for r in db.execute('SELECT * FROM listens WHERE profile_id=?',(key,))],
                  'queue':[dict(r) for r in db.execute('SELECT * FROM queue WHERE profile_id=?',(key,))]}
        response=jsonify(data);response.headers['Content-Disposition']='attachment; filename="listening-export.json"';return response
    return api
