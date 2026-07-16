import json
import time
from datetime import datetime

from spotify_downloader import download_chart


def create_event(row):

    event = {

        "timestamp":
            datetime.utcnow().isoformat(),

        "rank":
            int(row["rank"]),

        "track":
            row["track_name"],

        "artist":
            row["artist_names"],

        "streams":
            int(row["streams"])

    }

    return event



def start_producer():

    chart = download_chart()


    for _, row in chart.iterrows():

        event = create_event(row)


        print(
            json.dumps(event, indent=2)
        )


        # simulate streaming delay
        time.sleep(1)



if __name__ == "__main__":

    start_producer()