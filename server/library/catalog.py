import json
import math
from collections import Counter
from pathlib import Path

class Catalog:
    def __init__(self, path):
        entries=json.loads(Path(path).read_text(encoding='utf-8'))
        if not isinstance(entries,list) or not entries: raise ValueError('Catalog must be a nonempty array.')
        self.items={}
        for row in entries:
            if not isinstance(row,dict): raise ValueError('Each catalog entry must be an object.')
            for key in ('id','title','artist'):
                if not isinstance(row.get(key),str) or not row[key].strip(): raise ValueError(f'Invalid {key}.')
            if row['id'] in self.items: raise ValueError('Duplicate album ID: '+row['id'])
            if type(row.get('year')) is not int: raise ValueError('Album year must be an integer.')
            if not isinstance(row.get('genres'),list) or not row['genres'] or not all(isinstance(g,str) and g.strip() for g in row['genres']):
                raise ValueError('Each album needs genre strings.')
            self.items[row['id']]=row
        documents={key:Counter(self.tokens(item)) for key,item in self.items.items()}
        frequency=Counter(token for terms in documents.values() for token in terms)
        total=len(documents)
        self.vectors={}
        for key,terms in documents.items():
            vector={t:(1+math.log(n))*(1+math.log((total+1)/(frequency[t]+1))) for t,n in terms.items()}
            norm=math.sqrt(sum(v*v for v in vector.values())) or 1
            self.vectors[key]={t:v/norm for t,v in vector.items()}

    @staticmethod
    def tokens(item):
        return ['genre:'+g.casefold().strip() for g in item['genres']]*3 + ['artist:'+item['artist'].casefold(), 'decade:'+str(item['year']//10)]

    @staticmethod
    def similarity(left,right):
        return sum(v*right.get(token,0) for token,v in left.items())

    def search(self,query='',genres=''):
        wanted={g.strip().casefold() for g in genres.split(',') if g.strip()}
        query=query.strip().casefold()
        return [a for a in self.items.values() if (not wanted or wanted.intersection(g.casefold() for g in a['genres']))
                and (not query or query in ' '.join([a['title'],a['artist'],*a['genres']]).casefold())]
