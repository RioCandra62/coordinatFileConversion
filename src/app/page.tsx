"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import proj4 from "proj4";

const MapPreview = dynamic(() => import("./components/mapPreview"), {
  ssr: false,
});

type Point = {
  lat: number;
  lon: number;
  name?: string;
};

// ================= COLUMN DICTIONARY =================
const NAME_FIELDS = [
  "name",
  "Name",
  "nama",
  "Nama",
  "id",
  "ID",
  "titik",
  "Titik",
  "station",
  "Station",
];

const LAT_FIELDS = [
  "lat",
  "latitude",
  "Latitude",
  "LAT",
  "lintang",
  "Lintang",
];

const LON_FIELDS = [
  "lon",
  "lng",
  "long",
  "longitude",
  "Longitude",
  "LON",
  "bujur",
  "Bujur",
];

const EASTING_FIELDS = [
  "easting",
  "Easting",
  "x",
  "X",
  "utm_x",
  "EASTING",
];

const NORTHING_FIELDS = [
  "northing",
  "Northing",
  "y",
  "Y",
  "utm_y",
  "NORTHING",
];

// ================= HELPERS =================
function pick(row: any, keys: string[]) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  return null;
}

function getPointName(row: any, index: number) {
  const v = pick(row, NAME_FIELDS);
  return v ? String(v) : `Point ${index + 1}`;
}

function toNumber(v: any) {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function escapeXML(str: string) {
  return str.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c]!));
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [zone, setZone] = useState("51S");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  // ================= AUTO PREVIEW =================
  useEffect(() => {
    if (!file) return;
    setLoading(true);
    handlePreview(file).finally(() => setLoading(false));
  }, [file, zone]);

  // ================= HANDLE PREVIEW =================
  async function handlePreview(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: any[] = [];

    if (ext === "csv") {
      const text = await file.text();
      rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data as any[];
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } else {
      alert("File tidak didukung");
      return;
    }

    // ---------- UTM PROJ ----------
    const zoneNumber = Number(zone.slice(0, -1));
    const hemisphere = zone.slice(-1);
    const utm = `+proj=utm +zone=${zoneNumber} +datum=WGS84 +units=m +no_defs ${
      hemisphere === "S" ? "+south" : ""
    }`;

    const result: Point[] = rows
      .map((row, i) => {
        // ===== TRY LAT LONG =====
        const latRaw = pick(row, LAT_FIELDS);
        const lonRaw = pick(row, LON_FIELDS);

        const lat = toNumber(latRaw);
        const lon = toNumber(lonRaw);

        if (lat != null && lon != null) {
          return {
            lat,
            lon,
            name: getPointName(row, i),
          };
        }

        // ===== FALLBACK UTM =====
        const e = toNumber(pick(row, EASTING_FIELDS));
        const n = toNumber(pick(row, NORTHING_FIELDS));

        if (e == null || n == null) return null;

        const [lonUtm, latUtm] = proj4(utm, "WGS84", [e, n]);

        return {
          lat: latUtm,
          lon: lonUtm,
          name: getPointName(row, i),
        };
      })
      .filter(Boolean) as Point[];

    setPoints(result);
  }

  // ================= DOWNLOAD KML =================
  function downloadKML() {
    if (!points.length || !file) {
      alert("No data to download");
      return;
    }

    const placemarks = points
      .map(
        (p) => `
    <Placemark>
      <name>${escapeXML(p.name ?? "Point")}</name>
      <Point>
        <coordinates>${p.lon},${p.lat},0</coordinates>
      </Point>
    </Placemark>`
      )
      .join("");

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(file.name)}</name>
    ${placemarks}
  </Document>
</kml>`;

    const base = file.name.replace(/\.[^/.]+$/, "");
    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${base}.kml`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8 h-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold">CSV / XLSX to KML</h1>
        <p className="text-gray-500">
          Auto detect LatLong / UTM (ID & EN supported)
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border rounded px-3 py-2"
        />

        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          disabled={!file}
          className="border px-4 py-2 rounded disabled:opacity-50"
        >
          <option value="48S">UTM 48S</option>
          <option value="49S">UTM 49S</option>
          <option value="50S">UTM 50S</option>
          <option value="51S">UTM 51S</option>
          <option value="52S">UTM 52S</option>
          <option value="48N">UTM 48N</option>
          <option value="49N">UTM 49N</option>
          <option value="50N">UTM 50N</option>
          <option value="51N">UTM 51N</option>
        </select>

        <button
          onClick={downloadKML}
          disabled={!file}
          className="bg-gray-800 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Download
        </button>
      </div>

      <div className="w-full flex-1 border rounded-xl overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            Loading preview...
          </div>
        ) : (
          <MapPreview points={points} />
        )}
      </div>
    </div>
  );
}
