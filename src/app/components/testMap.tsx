"use client";

import { MapContainer, TileLayer } from "react-leaflet";

export default function TestMap() {
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer
        center={[-6.2, 106.8]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
}
