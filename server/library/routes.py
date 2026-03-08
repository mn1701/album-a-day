import json
import re
from collections import Counter
from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from .extensions import hidden_ids, register_extensions

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
        with database.session() as db:
            key=profile(db);history=events(db,key);excluded=hidden_ids(db,key)
        return jsonify(recommender.rank(history,limit,excluded=excluded))
    @api.get('/today')
    def today():
        with database.session() as db:
            db.execute('BEGIN IMMEDIATE'); key=profile(db); day=date.today().isoformat()
            saved=db.execute('SELECT * FROM daily_picks WHERE profile_id=? AND day=?',(key,day)).fetchone()
            excluded=hidden_ids(db,key)
            if saved and saved['album_id'] in catalog.items and saved['album_id'] not in excluded:
                return jsonify({**catalog.items[saved['album_id']],'reasons':json.loads(saved['explanation'])})
            picks=recommender.rank(events(db,key),1,excluded=excluded)
            if not picks:return '',204
            pick=picks[0]
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
        limit=bounded('limit',100,500);before=bounded('before',2**63-1,2**63-1)
        query=request.args.get('q','').casefold().strip();month=request.args.get('month','');rating=request.args.get('rating','')
        if len(query)>200:raise ValueError('Search must be at most 200 characters.')
        conditions=['profile_id=?','rowid<?'];parameters=[]
        if rating:
            try:rating=int(rating)
            except ValueError:raise ValueError('Rating must be 1 to 5.')
            if not 1<=rating<=5:raise ValueError('Rating must be 1 to 5.')
            conditions.append('rating=?');parameters.append(rating)
        if month:
            if not re.fullmatch(r'\d{4}-\d{2}',month):raise ValueError('Month must use YYYY-MM.')
            start=date.fromisoformat(month+'-01');end=date(start.year+1,1,1) if start.month==12 else date(start.year,start.month+1,1)
            conditions.extend(['listened_on>=?','listened_on<?']);parameters.extend([start.isoformat(),end.isoformat()])
        result=[]
        with database.session() as db:
            key=profile(db)
            rows=db.execute('SELECT rowid AS listen_id,* FROM listens WHERE '+' AND '.join(conditions)+' ORDER BY rowid DESC',[key,before,*parameters])
            for row in rows:
                album=catalog.items.get(row['album_id'],{'id':row['album_id'],'title':'Removed from catalog','artist':'','genres':[],'year':0})
                if query and query not in ' '.join([album['title'],album['artist'],row['note']]).casefold():continue
                result.append({**album,**dict(row)})
                if len(result)>limit:break
        response=jsonify(result[:limit])
        if len(result)>limit:response.headers['X-Next-Cursor']=str(result[limit-1]['listen_id'])
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
            return jsonify([{**catalog.items[r['album_id']],'added_at':r['added_at']} for r in db.execute('SELECT * FROM queue WHERE profile_id=? ORDER BY position,added_at,album_id',(key,)) if r['album_id'] in catalog.items])
    @api.post('/queue')
    def enqueue():
        album_id=payload().get('album_id')
        if not isinstance(album_id,str) or album_id not in catalog.items: raise ValueError('Unknown album.')
        with database.session() as db:
            key=profile(db)
            db.execute('INSERT OR IGNORE INTO queue(profile_id,album_id,position) VALUES(?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM queue WHERE profile_id=?))',(key,album_id,key))
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
                  'queue':[dict(r) for r in db.execute('SELECT * FROM queue WHERE profile_id=? ORDER BY position,added_at,album_id',(key,))],
                  'hidden_albums':[dict(r) for r in db.execute('SELECT * FROM hidden_albums WHERE profile_id=?',(key,))],
                  'collections':[{**dict(row),'album_ids':[r['album_id'] for r in db.execute('SELECT album_id FROM collection_items WHERE collection_id=? ORDER BY position',(row['id'],))]} for row in db.execute('SELECT * FROM collections WHERE profile_id=?',(key,))]}
        response=jsonify(data);response.headers['Content-Disposition']='attachment; filename="listening-export.json"';return response
    @api.put('/queue/order')
    def reorder_queue():
        data=payload();ids=data.get('album_ids');expected=data.get('expected_order')
        if not isinstance(ids,list) or len(ids)>1000 or not all(isinstance(x,str) for x in ids) or len(set(ids))!=len(ids): raise ValueError('Provide unique album IDs in queue order.')
        with database.session() as db:
            db.execute('BEGIN IMMEDIATE');key=profile(db)
            current=[r['album_id'] for r in db.execute('SELECT album_id FROM queue WHERE profile_id=? ORDER BY position,added_at,album_id',(key,))]
            if expected is not None and (not isinstance(expected,list) or not all(isinstance(x,str) for x in expected)):raise ValueError('expected_order must be an array of album IDs.')
            if set(ids)!=set(current) or (expected is not None and expected!=current):return jsonify(error='Queue changed. Refresh before reordering.'),409
            db.executemany('UPDATE queue SET position=? WHERE profile_id=? AND album_id=?',[(i,key,album_id) for i,album_id in enumerate(ids)])
        return '',204
    @api.patch('/listens/<int:listen_id>')
    def edit_listen(listen_id):
        data=payload()
        if not data or not set(data).issubset({'rating','note','listened_on'}):raise ValueError('Provide rating, note or listening date.')
        with database.session() as db:
            key=profile(db)
            row=db.execute('SELECT * FROM listens WHERE rowid=? AND profile_id=?',(listen_id,key)).fetchone()
            if row is None:return jsonify(error='Listening entry not found.'),404
            rating=data.get('rating',row['rating']);note=data.get('note',row['note']);day=data.get('listened_on',row['listened_on'])
            if type(rating) is not int or not 1<=rating<=5:raise ValueError('Rating must be an integer from 1 to 5.')
            if not isinstance(note,str) or len(note)>4000:raise ValueError('Note must be at most 4000 characters.')
            if not isinstance(day,str):raise ValueError('Use an ISO listening date.')
            parsed=date.fromisoformat(day)
            if parsed>date.today():raise ValueError('Listening dates cannot be in the future.')
            db.execute('UPDATE listens SET rating=?,note=?,listened_on=? WHERE rowid=? AND profile_id=?',(rating,note,parsed.isoformat(),listen_id,key))
        return '',204
    @api.delete('/listens/<int:listen_id>')
    def delete_listen(listen_id):
        with database.session() as db:
            key=profile(db)
            result=db.execute('DELETE FROM listens WHERE rowid=? AND profile_id=?',(listen_id,key))
            if not result.rowcount:return jsonify(error='Listening entry not found.'),404
        return '',204
    @api.get('/insights')
    def insights():
        genres=Counter();artists=Counter();ratings=Counter();months=Counter();days=Counter();unique=set();total=0
        with database.session() as db:
            key=profile(db)
            for row in db.execute('SELECT album_id,rating,listened_on FROM listens WHERE profile_id=?',(key,)):
                total+=1;unique.add(row['album_id']);months[row['listened_on'][:7]]+=1;days[row['listened_on']]+=1
                if row['rating'] is not None:ratings[row['rating']]+=1
                album=catalog.items.get(row['album_id'])
                if album:
                    genres.update(album['genres']);artists[album['artist']]+=1
        today=date.today();calendar=[{'date':(today-timedelta(days=n)).isoformat(),'count':days[(today-timedelta(days=n)).isoformat()]} for n in range(83,-1,-1)]
        return jsonify(total=total,unique_albums=len(unique),genres=[{'name':name,'count':count} for name,count in genres.most_common(12)],
            artists=[{'name':name,'count':count} for name,count in artists.most_common(8)],ratings=[{'rating':r,'count':ratings[r]} for r in range(1,6)],
            months=[{'month':month,'count':count} for month,count in sorted(months.items())[-12:]],calendar=calendar)
    register_extensions(api,database,catalog)
    return api
