import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
}
export interface MapCircle {
  lat: number;
  lng: number;
  radius: number;
  label: string;
}

interface Props {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  circles?: MapCircle[];
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export default function CivicMap({ center, zoom = 12, markers = [], circles = [], picked, onPick, onMarkerClick, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  const clickRef = useRef(onMarkerClick);
  pickRef.current = onPick;
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(m);
    m.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    circles.forEach((c) =>
      L.circle([c.lat, c.lng], { radius: c.radius, color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.18, weight: 1.5 })
        .bindTooltip(c.label)
        .addTo(g),
    );
    markers.forEach((mk) =>
      L.circleMarker([mk.lat, mk.lng], { radius: 7, color: "#ffffff", weight: 2, fillColor: mk.color, fillOpacity: 0.95 })
        .bindTooltip(mk.label)
        .on("click", () => clickRef.current?.(mk.id))
        .addTo(g),
    );
    if (picked) {
      L.circleMarker(picked, { radius: 10, color: "#0b2545", weight: 3, fillColor: "#38bdf8", fillOpacity: 1 })
        .bindTooltip("Complaint location")
        .addTo(g);
    }
  }, [markers, circles, picked]);

  return <div ref={el} className={className ?? "h-80 w-full rounded-lg"} />;
}
