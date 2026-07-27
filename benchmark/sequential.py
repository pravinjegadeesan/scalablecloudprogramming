import time

import pandas as pd

start = time.time()

df = pd.read_csv("datasets/lastfm_dataset.csv")
result = df.groupby("Artist").size()

end = time.time()

print("Sequential:", round(end - start, 2), "seconds")
print(result.head())
