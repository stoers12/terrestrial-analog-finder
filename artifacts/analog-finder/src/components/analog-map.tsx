import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CellMatch, Match } from "@/lib/similarity";
import { cellKey, type Discovery } from "@/lib/discoveries";
import { scoreColor, STATUS_LABEL } from "@/lib/analog-ui";

interface Props {
  matches: { match: Match; rank: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Scored grid cells for the heat layer; null while the grid is unavailable */
  heat: CellMatch[] | null;
  cellSizeDeg: number;
  showHeat: boolean;
  onToggleHeat: (v: boolean) => void;
  discoveries: Discovery[];
  selectedCellKey: string | null;
  onSelectCell: (key: string) => void;
}

function FlyTo({ lat, lon }: { lat?: number; lon?: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (lat === undefined || lon === undefined) return;
    map.flyTo([lat, lon], map.getZoom(), { duration: 1.1 });
  }, [lat, lon, map]);
  return null;
}

export function AnalogMap({ matches, selectedId, onSelect, heat, cellSizeDeg, showHeat, onToggleHeat, discoveries, selectedCellKey, onSelectCell }: Props) {
  const [ready, setReady] = useState(false);
  const selectedSite = matches.find((m) => m.match.site.id === selectedId)?.match.site;
  const selectedDisc = discoveries.find((d) => cellKey(d.cell) === selectedCellKey);
  const focus = selectedCellKey ? selectedDisc?.cell : selectedSite;

  const discMarkers = useMemo(
    () =>
      discoveries.map((d, i) => {
        const sel = cellKey(d.cell) === selectedCellKey;
        const size = sel ? 30 : 24;
        const icon = L.divIcon({
          className: "mk-wrap",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;border-radius:4px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font:700 11px var(--app-font-mono, monospace);border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45);transform:rotate(45deg)"><span style="transform:rotate(-45deg)">D${i + 1}</span></div>`,
        });
        return { d, i, icon };
      }),
    [discoveries, selectedCellKey],
  );

  const markers = useMemo(
    () =>
      matches.map(({ match, rank }) => {
        const size = Math.round(16 + Math.min(1, Math.max(0, (match.score - 35) / 45)) * 20);
        const status = match.site.status ?? "established";
        const cls = ["mk", `mk-${status}`, rank <= 3 ? "mk-top" : "", match.site.id === selectedId ? "mk-sel" : ""].join(" ");
        const icon = L.divIcon({
          className: "mk-wrap",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<div class="${cls}" style="--c:${scoreColor(match.score)}"><span>${rank}</span></div>`,
        });
        return { match, rank, icon };
      }),
    [matches, selectedId],
  );

  return (
    <div className="relative isolate h-[420px] md:h-[540px] overflow-hidden rounded-md border border-foreground/20 bg-muted" data-testid="map-analogs">
      <MapContainer
        center={[22, 10]}
        zoom={2}
        minZoom={2}
        worldCopyJump
        preferCanvas
        scrollWheelZoom
        className="h-full w-full"
        whenReady={() => setTimeout(() => setReady(true), 250)}
      >
        <TileLayer
          attribution='Imagery: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> Blue Marble'
          url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg"
          maxNativeZoom={8}
          maxZoom={8}
        />
        {showHeat &&
          heat?.map((h) => (
            <Rectangle
              key={cellKey(h.cell)}
              bounds={[
                [h.cell.lat - cellSizeDeg / 2, h.cell.lon - cellSizeDeg / 2],
                [h.cell.lat + cellSizeDeg / 2, h.cell.lon + cellSizeDeg / 2],
              ]}
              pathOptions={{ stroke: false, fillColor: scoreColor(h.score), fillOpacity: 0.55 }}
              eventHandlers={{ click: () => onSelectCell(cellKey(h.cell)) }}
            />
          ))}
        {discMarkers.map(({ d, i, icon }) => (
          <Marker
            key={cellKey(d.cell)}
            position={[d.cell.lat, d.cell.lon]}
            icon={icon}
            zIndexOffset={900}
            eventHandlers={{ click: () => onSelectCell(cellKey(d.cell)) }}
          >
            <Tooltip direction="top" offset={[0, -12]} className="mk-tip">
              <div className="font-semibold">D{i + 1} · {d.site.name}</div>
              <div className="font-mono text-[11px] opacity-80">{d.score.toFixed(1)} · discovery</div>
            </Tooltip>
          </Marker>
        ))}
        {markers.map(({ match, rank, icon }) => (
          <Marker
            key={match.site.id}
            position={[match.site.lat, match.site.lon]}
            icon={icon}
            zIndexOffset={match.site.id === selectedId ? 1000 : 100 - rank}
            eventHandlers={{ click: () => onSelect(match.site.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} className="mk-tip">
              <div className="font-semibold">#{rank} {match.site.name}</div>
              <div className="font-mono text-[11px] opacity-80">
                {match.score.toFixed(1)} · {STATUS_LABEL[match.site.status ?? "established"]}
              </div>
            </Tooltip>
          </Marker>
        ))}
        <FlyTo lat={focus?.lat} lon={focus?.lon} />
      </MapContainer>

      <label className="absolute right-3 top-3 z-[500] flex cursor-pointer items-center gap-2 rounded-md border border-foreground/10 bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <input type="checkbox" checked={showHeat} onChange={(e) => onToggleHeat(e.target.checked)} data-testid="toggle-heat" className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
        Heat layer{heat ? ` (${heat.length} cells)` : ""}
      </label>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md bg-card/90 p-3 text-[11px] shadow-lg backdrop-blur border border-foreground/10">
        <div className="mb-2 font-mono uppercase tracking-widest text-muted-foreground text-[10px]">Status</div>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-2 border-foreground bg-muted" /> Established</span>
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-foreground bg-muted" /> Emerging</span>
          <span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rotate-45 border-2 border-primary bg-muted" /> Proposed new</span>
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rotate-45 bg-primary" /> Grid discovery (D1, D2...)</span>
        </div>
        <div className="mt-3 mb-1 font-mono uppercase tracking-widest text-muted-foreground text-[10px]">Score</div>
        <div className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${scoreColor(35)}, ${scoreColor(57)}, ${scoreColor(80)})` }} />
        <div className="mt-1 flex w-32 justify-between font-mono text-[10px] text-muted-foreground"><span>35</span><span>80+</span></div>
      </div>

      {matches.length === 0 && ready && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-background/60 backdrop-blur-[2px]">
          <div className="rounded-md bg-card px-5 py-4 text-center shadow-lg border">
            <div className="font-display text-lg font-semibold">No sites on the map</div>
            <div className="text-sm text-muted-foreground">Loosen the filters in the ranking panel.</div>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 z-[600] grid place-items-center bg-secondary transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
        data-testid="status-map-loading"
      >
        <div className="w-56 text-center text-secondary-foreground">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-70">Acquiring basemap</div>
          <div className="relative mt-3 h-px w-full overflow-hidden bg-secondary-foreground/20">
            <div className="scanline absolute inset-y-0 w-1/2 bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
