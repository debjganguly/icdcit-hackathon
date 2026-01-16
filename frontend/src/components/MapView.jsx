import React, { useEffect, useState } from "react";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = "pk.eyJ1IjoiYXZpZGlwdGEiLCJhIjoiY21rZnZxZHg2MDFheDNxcGZlbWJjamw5YyJ9.c57B3jUBmbJZ0xvSxaJY6g";

function MapView() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/uhi")
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <Map
      initialViewState={{
        latitude: 20.30,
        longitude: 85.82,
        zoom: 11
      }}
      style={{ width: "100%", height: "90vh" }}
      mapboxAccessToken={TOKEN}
      mapStyle="mapbox://styles/mapbox/dark-v10"
    >
      {data.map((d, i) => (
        <Marker key={i} latitude={d.lat} longitude={d.lon}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background:
                d.zone === 2 ? "red" :
                d.zone === 1 ? "orange" : "green"
            }}
            title={d.recommendation}
          />
        </Marker>
      ))}
    </Map>
  );
}

export default MapView;
