from flask import Flask, jsonify
from flask_cors import CORS

from data.sample_data import get_city_data
from ml.clustering import detect_heat_zones

app = Flask(__name__)
CORS(app)

@app.route("/api/uhi", methods=["GET"])
def get_uhi_data():
    raw_data = get_city_data()
    processed = detect_heat_zones(raw_data)
    return jsonify(processed)

if __name__ == "__main__":
    app.run(debug=True)
