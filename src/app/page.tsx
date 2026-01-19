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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [zone, setZone] = useState("51S");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  // ================= AUTO PREVIEW =================
  useEffect(() => {
    if (!file || !zone) return;

    setLoading(true);
    handlePreview(file).finally(() => setLoading(false));
  }, [file, zone]);

  // ================= HANDLE PREVIEW =================
  async function handlePreview(file: File) {
    console.log("HANDLE PREVIEW CALLED", file.name, zone);

    setLoading(true);

    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: any[] = [];

    // ---------- CSV ----------
    if (ext === "csv") {
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",
      });

      if (parsed.errors.length) {
        console.warn("CSV parse warnings:", parsed.errors);
      }

      rows = parsed.data as any[];
    }

    // ---------- XLSX ----------
    else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } else {
      alert("File tidak didukung");
      setLoading(false);
      return;
    }

    // ---------- UTM ----------
    const zoneNumber = Number(zone.slice(0, -1));
    const hemisphere = zone.slice(-1);

    const utm = `+proj=utm +zone=${zoneNumber} +datum=WGS84 +units=m +no_defs ${
      hemisphere === "S" ? "+south" : ""
    }`;

    // ---------- CONVERT ----------
    const result: Point[] = rows
      .map((row, i) => {
        const eRaw =
          row.easting ??
          row.Easting ??
          row.x ??
          row.X ??
          row.utm_x ??
          row.EASTING;
        const nRaw =
          row.northing ??
          row.Northing ??
          row.y ??
          row.Y ??
          row.utm_y ??
          row.NORTHING;

        if (eRaw == null || nRaw == null) return null;

        const e = Number(String(eRaw).replace(/,/g, ""));
        const n = Number(String(nRaw).replace(/,/g, ""));

        if (!Number.isFinite(e) || !Number.isFinite(n)) return null;

        const [lon, lat] = proj4(utm, "WGS84", [e, n]);

        return {
          lat,
          lon,
          name: row.name || `Point ${i + 1}`,
        };
      })
      .filter(Boolean) as Point[];

    setPoints(result);
    setLoading(false);
  }

  function downloadKML() {
    if (!points.length || !file) {
      alert("No data to download");
      return;
    }

    const placemarks = points
      .map(
        (p) => `
    <Placemark>
      <name>${p.name ?? "Point"}</name>
      <Point>
        <coordinates>${p.lon},${p.lat},0</coordinates>
      </Point>
    </Placemark>
  `,
      )
      .join("");

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${file.name}</name>
    ${placemarks}
  </Document>
</kml>`;

    // 🔑 GANTI EXTENSION FILE
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const outputName = `${baseName}.kml`;

    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = outputName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8 h-full">
      {/* ================= HEADER ================= */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">CSV / XLSX to KML</h1>
        <p className="text-gray-500">Upload → Select UTM → Preview</p>
      </div>

      {/* ================= CONTROLS ================= */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
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

      {/* ================= MAP ================= */}
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
