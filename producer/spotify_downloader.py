import pandas as pd


SPOTIFY_URL = (
    "https://charts.spotify.com/charts/view/"
    "regional-global-daily/latest/download"
)


def download_spotify_chart():

    print("Downloading Spotify chart...")

    df = pd.read_csv(SPOTIFY_URL)

    print(
        f"Downloaded {len(df)} songs"
    )

    return df


if __name__ == "__main__":

    data = download_spotify_chart()

    print(data.head())