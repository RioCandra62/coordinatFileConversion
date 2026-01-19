"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";

type Point = {
  lat: number;
  lon: number;
  name?: string;
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);

  return null;
}

// Ubah peta jadi citra satelit

export default function MapPreview({ points }: { points: Point[] }) {
  const [mapType, setMapType] = useState<"osm" | "satellite">("osm");
  const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const SAT_URL =
    "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Imagery/MapServer/tile/{z}/{y}/{x}";
  if (!points.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        No Point to Preview
      </div>
    );
  }

  return (
    <MapContainer
      className="w-full h-full rounded-xl"
      style={{ height: "100%", width: "100%" }}
      center={[points[0].lat, points[0].lon]}
      zoom={13}
      scrollWheelZoom
    >
      <TileLayer url={mapType === "osm" ? OSM_URL : SAT_URL} />
      <FitBounds points={points} />

      {points.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lon]}>
          <Popup>{p.name || `Point ${i + 1}`}</Popup>
        </Marker>
      ))}

      <button
        onClick={() => setMapType(mapType === "osm" ? "satellite" : "osm")}
        className="
    absolute top-4 right-4 z-1000
    bg-white px-4 py-2 rounded shadow
    text-sm font-medium
  "
      >
        {mapType === "osm" ? "Satellite" : "Map"}
      </button>
    </MapContainer>
  );
}
