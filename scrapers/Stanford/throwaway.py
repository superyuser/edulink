import json

# performs baby checks of dataset

with open("./data/scraped/AllDepts_Got55.json", "r") as f:
    data = json.load(f)
    print(len(data))

