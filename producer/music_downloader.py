import requests

# Replace with your own Last.fm API Key
API_KEY = "84432e4771b28a548b9339d648276a6a"

BASE_URL = "https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=84432e4771b28a548b9339d648276a6a&format=json"


def download_chart(limit=10):
    """
    Fetch the current top tracks from Last.fm.
    """

    params = {
        "method": "chart.gettoptracks",
        "api_key": API_KEY,
        "format": "json",
        "limit": limit
    }

    try:
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        tracks = data["tracks"]["track"]

        print(f"Successfully fetched {len(tracks)} tracks.\n")

        return tracks

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return []


def print_tracks(tracks):
    """
    Display tracks in a readable format.
    """

    for i, track in enumerate(tracks, start=1):
        print("-" * 50)
        print(f"Rank      : {i}")
        print(f"Track     : {track['name']}")
        print(f"Artist    : {track['artist']['name']}")
        print(f"Listeners : {track['listeners']}")
        print(f"Playcount : {track['playcount']}")
        print(f"URL       : {track['url']}")


if __name__ == "__main__":
    tracks = download_chart(limit=10)

    if tracks:
        print_tracks(tracks)