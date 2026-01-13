"""Inspect TF-IDF neighborhoods without starting the web application."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from library.catalog import Catalog

parser=argparse.ArgumentParser()
parser.add_argument('catalog',type=Path)
parser.add_argument('--album',required=True)
args=parser.parse_args()
catalog=Catalog(args.catalog)
if args.album not in catalog.items: parser.error('Unknown album ID')
vector=catalog.vectors[args.album]
ranked=sorted(((key,catalog.similarity(vector,v)) for key,v in catalog.vectors.items() if key!=args.album),key=lambda row:row[1],reverse=True)
print(json.dumps([{'album':catalog.items[key],'similarity':round(score,4)} for key,score in ranked],indent=2))
