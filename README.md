# An Album a Day

A small starter for discovering one album each day. The Flask API reads a local catalog, ranks albums against a few listener preferences, and avoids recently suggested albums. The sample catalog is intentionally tiny. Replace it with your own listening data or a music service integration.

## Run it

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug
curl 'http://127.0.0.1:5000/album?genres=ambient,jazz'
```

This is a starter, not a trained recommendation model or a deployed service. No accounts or listening history are sent anywhere.
