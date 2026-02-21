"""Content affinity, recency suppression, and greedy diversity re-ranking."""
import hashlib
import math
from collections import defaultdict
from datetime import date, timedelta

class Recommender:
    version='content-diversity-v1'
    def __init__(self,catalog): self.catalog=catalog

    def rank(self,listens,limit=10,day=None):
        day=day or date.today()
        taste=defaultdict(float)
        recent=set()
        seen=set()
        genre_ratings=defaultdict(list)
        for event in listens:
            item=self.catalog.items.get(event['album_id'])
            if not item: continue
            age=max(0,(day-date.fromisoformat(event['listened_on'])).days)
            strength=(event['rating']-3)*math.exp(-age/180)
            for token,value in self.catalog.vectors[item['id']].items(): taste[token]+=value*strength
            for genre in item['genres']: genre_ratings[genre].append(event['rating'])
            seen.add(item['id'])
            if age<30: recent.add(item['id'])
        norm=math.sqrt(sum(v*v for v in taste.values())) or 1
        taste={t:v/norm for t,v in taste.items()}
        candidates=[a for a in self.catalog.items.values() if a['id'] not in recent]
        if not candidates: candidates=list(self.catalog.items.values())
        ranked=[]
        for album in candidates:
            affinity=self.catalog.similarity(taste,self.catalog.vectors[album['id']])
            novelty=0.15 if album['id'] not in seen else 0
            jitter=int.from_bytes(hashlib.sha256((day.isoformat()+album['id']).encode()).digest()[:4],'big')/2**32*0.025
            matched=[g for g in album['genres'] if genre_ratings[g] and sum(genre_ratings[g])/len(genre_ratings[g])>=4]
            reasons=['Matches highly rated styles: '+', '.join(matched)] if matched else ['Explore a different part of your catalog']
            if novelty: reasons.append('Not yet in your listening log')
            if album['id'] in recent: reasons.append('Catalog exhausted: recent listening exclusion relaxed')
            ranked.append({'album':album,'score':affinity+novelty+jitter,'reasons':reasons})
        selected=[]
        while ranked and len(selected)<limit:
            def utility(candidate):
                duplicate=max((self.catalog.similarity(self.catalog.vectors[candidate['album']['id']],self.catalog.vectors[s['album']['id']]) for s in selected),default=0)
                return candidate['score']-0.25*duplicate
            best=max(ranked,key=lambda r:(utility(r),r['album']['id']))
            selected.append({**best,'rank_score':round(utility(best),4),'model':self.version})
            ranked.remove(best)
        return selected
