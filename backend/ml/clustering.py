import numpy as np
from sklearn.cluster import KMeans

def detect_heat_zones(data):
    X = np.array([[d["lst"], d["ndvi"]] for d in data])

    kmeans = KMeans(n_clusters=3, random_state=42)
    labels = kmeans.fit_predict(X)

    for i, d in enumerate(data):
        d["zone"] = int(labels[i])

        if labels[i] == 2:
            d["recommendation"] = "Tree plantation & green roofs"
        elif labels[i] == 1:
            d["recommendation"] = "Cool pavements & urban parks"
        else:
            d["recommendation"] = "Maintain existing green cover"

    return data
