import { NextResponse } from "next/server";
import Papa from "papaparse";
import proj4 from "proj4";

function utmToLatLon(e: number, n: number, zone: number) {
  const utm = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  return proj4(utm, "WGS84", [e, n]); // [lon, lat]
}

function generateKML(points: any[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
${points.map(p => `
<Placemark>
  <name>${p.name || "Point"}</name>
  <Point>
    <coordinates>${p.lon},${p.lat},0</coordinates>
  </Point>
</Placemark>
`).join("")}
</Document>
</kml>`;
}

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file") as File;
  const zone = Number(data.get("zone"));

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true });

  const points = parsed.data.map((r: any) => {
    const [lon, lat] = utmToLatLon(
      Number(r.easting),
      Number(r.northing),
      zone
    );

    return { lat, lon, name: r.name };
  });

  const kml = generateKML(points);

  return new NextResponse(kml, {
    headers: {
      "Content-Type": "application/vnd.google-earth.kml+xml",
      "Content-Disposition": "attachment; filename=output.kml",
    },
  });
}
