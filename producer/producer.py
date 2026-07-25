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

    print("Fetching music chart...")

    tracks = download_chart()

    print(f"Fetched {len(tracks)} tracks\n")

    for track in tracks:

        event = create_event(track)

        print(json.dumps(event, indent=4))

        print("-" * 50)

        # simulate real-time streaming
        time.sleep(1)

        send_event(event)
if __name__ == "__main__":
    start_producer()