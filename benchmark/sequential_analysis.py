import time

import pandas as pd

start = time.time()

df = pd.read_csv("datasets/lastfm_dataset.csv")

top_artists = (
    df.groupby("Artist")
    .size()
    .sort_values(ascending=False)
    .head(10)
)

end = time.time()

print("Sequential Execution Time:", round(end - start, 2), "seconds")
print(top_artists)
