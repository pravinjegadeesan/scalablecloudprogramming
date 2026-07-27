import json
import time
from datetime import datetime

from music_downloader import download_chart
from kinesis_producer import send_event

def create_event(track):

    event = {
        "timestamp": datetime.utcnow().isoformat(),

        "track": track["name"],

        "artist": track["artist"]["name"],

        "listeners": int(track["listeners"]),

        "playcount": int(track["playcount"])
    }

    return event


def start_producer():
    while True:
        try:
            print("Fetching music chart...")
            tracks = download_chart()
            print(f"Fetched {len(tracks)} tracks\n")
            if not tracks:
                time.sleep(10)
                continue
            for track in tracks:
                event = create_event(track)
                print(json.dumps(event, indent=4))
                print("-" * 50)
                send_event(event)
                time.sleep(2)
        except Exception as e:
            print(f"Producer error: {e}")
            time.sleep(5)
if __name__ == "__main__":
    start_producer()