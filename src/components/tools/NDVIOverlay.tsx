import { useMemo } from "react";
import { TileLayer } from "react-leaflet";
import type { Zone } from "./FieldMap";

/**
 * NDVIOverlay — Sentinel-2 NDVI tiles via Sentinel Hub WMS using a public
 * INSTANCE_ID demo. NDVI palette: red (stressed) → yellow → green (healthy).
 *
 * For production: replace SH_INSTANCE_ID with your own Sentinel Hub instance
 * (free tier available at https://www.sentinel-hub.com/).
 *
 * Demo fallback: GIBS NASA MODIS NDVI (global, weekly composite, no key).
 */
const SH_INSTANCE_ID = ""; // set to your Sentinel Hub instance to upgrade quality

export interface NDVIOverlayProps {
  /** Zones currently drawn — used only to surface a "no fields" hint upstream */
  zones?: Zone[];
  /** Opacity of the overlay (0–1) */
  opacity?: number;
}

export default function NDVIOverlay({ opacity = 0.65 }: NDVIOverlayProps) {
  // Latest available MODIS NDVI 16-day composite from NASA GIBS — free, no key.
  // Date string: yesterday in YYYY-MM-DD (GIBS layers lag ~1 day).
  const dateStr = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // If a Sentinel Hub instance is configured, prefer it (Sentinel-2 10m NDVI).
  if (SH_INSTANCE_ID) {
    const url =
      `https://services.sentinel-hub.com/ogc/wms/${SH_INSTANCE_ID}` +
      `?REQUEST=GetMap&BBOX={bbox-epsg-3857}&LAYERS=NDVI&MAXCC=20&WIDTH=512&HEIGHT=512` +
      `&FORMAT=image/png&TRANSPARENT=true&TIME=${dateStr}/${dateStr}&CRS=EPSG:3857`;
    return (
      <TileLayer
        url={url}
        opacity={opacity}
        attribution='NDVI &copy; <a href="https://www.sentinel-hub.com">Sentinel Hub</a>'
        tileSize={512}
      />
    );
  }

  // Fallback: NASA GIBS MODIS Terra NDVI 16-day, EPSG:3857 GoogleMapsCompatible_Level9
  const gibsUrl =
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
    `MODIS_Terra_NDVI_16Day/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;

  return (
    <TileLayer
      url={gibsUrl}
      opacity={opacity}
      maxZoom={9}
      attribution='NDVI &copy; <a href="https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs">NASA GIBS</a> / MODIS'
    />
  );
}

/** Tiny legend rendered outside the map. */
export function NDVILegend() {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-muted-foreground">Stressed</span>
      <div
        className="h-2 w-32 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #b91c1c 0%, #f59e0b 35%, #facc15 50%, #84cc16 70%, #15803d 100%)",
        }}
      />
      <span className="text-muted-foreground">Healthy</span>
    </div>
  );
}

