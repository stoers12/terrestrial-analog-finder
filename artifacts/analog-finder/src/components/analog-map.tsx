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
          html: `<div class="dk${sel ? " dk-sel" : ""}"><span>D${i + 1}</span></div>`,
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
          html: `<div class="${cls}" style="--c:${scoreColor(match.score)}"><span>${rank}</span>${match.site.id === selectedId ? `<b class="mk-label">${match.site.name}</b>` : ""}</div>`,
        });
        return { match, rank, icon };
      }),
    [matches, selectedId],
  );

  const strong = heat ? heat.filter((h) => h.score >= 68).length : 0;
  return (
    <div className="panel overflow-hidden rounded-lg border border-foreground/15 bg-secondary text-secondary-foreground shadow-lg" data-testid="map-analogs">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-secondary-foreground/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em]">
        <div className="flex items-center gap-3">
          <span className="rounded-[2px] bg-primary px-1.5 py-px text-primary-foreground">01</span>
          <span className="opacity-90">Survey view</span>
          <span className="hidden opacity-45 sm:inline">NASA GIBS Blue Marble / EPSG:3857</span>
        </div>
        <div className="flex items-center gap-4 opacity-80">
          <span><b className="text-secondary-foreground">{matches.length}</b> sites</span>
          <span><b className="text-primary">{discoveries.length}</b> leads</span>
          {heat && <span className="hidden sm:inline"><b>{strong}</b> strong cells</span>}
          <span>{focus ? `${Math.abs(focus.lat).toFixed(1)}${focus.lat >= 0 ? "N" : "S"} ${Math.abs(focus.lon).toFixed(1)}${focus.lon >= 0 ? "E" : "W"}` : "--"}</span>
        </div>
      </div>
    <div className="map-frame relative isolate h-[420px] overflow-hidden md:h-[560px]">
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

      <label className="absolute right-3 top-3 z-[500] flex cursor-pointer select-none items-center gap-2.5 rounded-md border border-secondary-foreground/15 bg-secondary/85 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-secondary-foreground shadow-lg backdrop-blur">
        <input type="checkbox" checked={showHeat} onChange={(e) => onToggleHeat(e.target.checked)} data-testid="toggle-heat" className="peer sr-only" />
        <span className="relative h-4 w-7 rounded-full bg-secondary-foreground/25 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-secondary-foreground after:transition-transform peer-checked:after:translate-x-3" />
        Heat layer{heat ? <span className="opacity-60">{heat.length} cells</span> : null}
      </label>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-secondary-foreground/15 bg-secondary/85 p-3 text-[11px] text-secondary-foreground shadow-lg backdrop-blur">
        <div className="mb-2 font-mono uppercase tracking-widest opacity-60 text-[10px]">Status</div>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-2 border-secondary-foreground bg-secondary-foreground/20" /> Established</span>
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-secondary-foreground bg-secondary-foreground/20" /> Emerging</span>
          <span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rotate-45 border-2 border-primary bg-secondary-foreground/20" /> Proposed new</span>
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rotate-45 bg-primary" /> Grid discovery (D1, D2...)</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] opacity-75"><i className="inline-block h-3 w-3 rounded-full border border-dashed border-primary" /> Pulsing ring: top three</div>
        <div className="mt-3 mb-1 font-mono uppercase tracking-widest opacity-60 text-[10px]">Score</div>
        <div className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${scoreColor(35)}, ${scoreColor(57)}, ${scoreColor(80)})` }} />
        <div className="mt-1 flex w-32 justify-between font-mono text-[10px] opacity-60"><span>35</span><span>80+</span></div>
      </div>

      {matches.length === 0 && ready && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-background/60 backdrop-blur-[2px]">
          <div className="rounded-md border bg-card px-5 py-4 text-center text-foreground shadow-lg">
            <div className="font-display text-lg font-semibold">No sites on the map</div>
            <div className="text-sm text-muted-foreground">Loosen the filters in the ranking panel.</div>
          </div>
        </div>
      )}

      <span className="map-corner tl" /><span className="map-corner tr" /><span className="map-corner bl" /><span className="map-corner br" />
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
    </div>
  );
}
