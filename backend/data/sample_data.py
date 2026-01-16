import random

def get_city_data():
    data = []
    for i in range(50):
        data.append({
            "lat": 20.30 + random.uniform(-0.05, 0.05),
            "lon": 85.82 + random.uniform(-0.05, 0.05),
            "lst": random.uniform(30, 45),   # Land Surface Temp
            "ndvi": random.uniform(0.1, 0.7)
        })
    return data
