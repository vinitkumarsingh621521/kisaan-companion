import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, LayersControl, Polygon, Tooltip as LeafletTooltip } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L, { LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix Leaflet default marker icon paths (Vite issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface Zone {
  id: string;
  crop: string;
  color: string;
  hectares: number;
  acres: number;
  latlngs: { lat: number; lng: number }[];
}

interface Props {
  center: [number, number];
  zones: Zone[];
  selectedCrop: string;
  cropColor: string;
  onCreate: (latlngs: LatLng[]) => void;
  onDelete: (ids: string[]) => void;
}

export default function FieldMap({ center, zones, selectedCrop, cropColor, onCreate, onDelete }: Props) {
  const fgRef = useRef<L.FeatureGroup>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const created = (e: any) => {
    const layer = e.layer as L.Polygon;
    const latlngs = (layer.getLatLngs()[0] as LatLng[]);
    onCreate(latlngs);
    // Remove from edit layer; we render zones from state.
    fgRef.current?.removeLayer(layer);
  };

  const deleted = (e: any) => {
    const ids: string[] = [];
    e.layers.eachLayer((l: any) => { if (l._zoneId) ids.push(l._zoneId); });
    if (ids.length) onDelete(ids);
  };

  if (!mounted) return null;

  return (
    <MapContainer center={center} zoom={15} className="w-full h-full rounded-xl" style={{ minHeight: 480 }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Streets">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Render saved zones */}
      {zones.map((z) => (
        <Polygon
          key={z.id}
          positions={z.latlngs.map((p) => [p.lat, p.lng]) as any}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.4, weight: 2 }}
          eventHandlers={{
            add: (e: any) => { (e.target as any)._zoneId = z.id; },
          }}
        >
          <LeafletTooltip direction="center" permanent className="!bg-card/90 !text-foreground !border-border">
            <span className="text-xs font-medium">{z.crop} • {z.acres.toFixed(2)} ac</span>
          </LeafletTooltip>
        </Polygon>
      ))}

      <FeatureGroup ref={fgRef as any}>
        <EditControl
          position="topleft"
          onCreated={created}
          onDeleted={deleted}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: { color: cropColor, fillOpacity: 0.4 },
            },
          }}
          edit={{ edit: false }}
        />
      </FeatureGroup>
    </MapContainer>
  );
}
