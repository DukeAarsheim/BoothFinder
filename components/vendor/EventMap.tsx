"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import { REGION_BOUNDS, type LocatedEvent } from "@/lib/vendor/geo";
import { formatBoothFee, formatDateRange, formatLocation } from "@/lib/vendor/format";

const PIN_SVG =
  '<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">' +
  '<path class="bf-pin-body" d="M15 1.5C7.5 1.5 1.5 7.4 1.5 14.8c0 9.6 11.2 21.300 13.500 23.700 2.300-2.400 13.500-14.100 13.500-23.700C28.500 7.400 22.500 1.500 15 1.500z"/>' +
  '<circle class="bf-pin-dot" cx="15" cy="14.5" r="5"/></svg>';

const pinIcon = L.divIcon({
  className: "bf-pin",
  html: PIN_SVG,
  iconSize: [30, 40],
  iconAnchor: [15, 39],
  popupAnchor: [0, -36],
});

/** Popup built with DOM nodes (textContent), so event text is never parsed as HTML. */
function popupContent({ event, precision }: LocatedEvent) {
  const el = (tag: string, className: string, text?: string | null) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const root = el("div", "space-y-1");
  if (event.is_sample) {
    root.append(
      el("span", "inline-block rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-semibold text-amber-300", "Sample"),
    );
  }
  root.append(el("p", "!m-0 text-sm font-semibold leading-snug text-neutral-100", event.name));
  const meta = [formatDateRange(event.start_date, event.end_date), formatLocation(event)]
    .filter(Boolean)
    .join(" · ");
  if (meta) root.append(el("p", "!m-0 text-xs text-neutral-400", meta));
  const fee = formatBoothFee(event);
  root.append(
    el("p", "!m-0 text-xs font-medium text-orange-300", fee ? `Booth fee ${fee}` : "Booth fee not listed"),
  );
  if (precision === "county") {
    root.append(el("p", "!m-0 text-[11px] text-neutral-500", "Placed at the county seat; city not listed"));
  }
  return root;
}

/**
 * Leaflet map of events. Parent owns the data and the selection:
 *  - `events` are the currently filtered, located events (pins follow filters)
 *  - `selectedId` highlights a pin, opens its preview, and flies to it
 *  - `onSelect` fires when a pin is clicked
 * Load with next/dynamic and `ssr: false` (Leaflet needs `window`).
 */
export default function EventMap({
  events,
  selectedId,
  onSelect,
}: {
  events: LocatedEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);
  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedRef.current = selectedId;
  });

  // Create the map once.
  useEffect(() => {
    const markers = markersRef.current;
    const map = L.map(containerRef.current!, {
      minZoom: 7,
      zoomSnap: 0.25,
      maxZoom: 17,
      maxBounds: L.latLngBounds(REGION_BOUNDS).pad(0.8),
      maxBoundsViscosity: 0.8,
    }).fitBounds(REGION_BOUNDS);

    // OpenStreetMap's free tiles: no API key. Attribution is required.
    // map.css darkens them to match the app's dark theme.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current!);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // Rebuild pins whenever the filtered events change, and frame them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    markers.forEach((m) => m.remove());
    markers.clear();

    for (const item of events) {
      const marker = L.marker(item.position, {
        icon: pinIcon,
        title: item.event.name,
        alt: item.event.name,
        riseOnHover: true,
      })
        .bindPopup(() => popupContent(item), { closeButton: true, autoPanPadding: [24, 24] })
        .on("click", () => onSelectRef.current(item.event.id))
        .on("popupclose", () => {
          if (selectedRef.current === item.event.id) onSelectRef.current(null);
        })
        .addTo(map);
      markers.set(item.event.id, marker);
    }

    if (events.length > 0) {
      map.fitBounds(L.latLngBounds(events.map((e) => e.position)), {
        padding: [40, 40],
        maxZoom: 12,
      });
    } else {
      map.fitBounds(REGION_BOUNDS);
    }
  }, [events]);

  // Reflect the selection: highlight, preview, and focus.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker, id) => {
      const on = id === selectedId;
      marker.getElement()?.classList.toggle("bf-pin--selected", on);
      marker.setZIndexOffset(on ? 1000 : 0);
    });
    if (!selectedId) {
      map.closePopup();
      return;
    }
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    const target = marker.getLatLng();
    const zoom = Math.max(map.getZoom(), 12);
    if (!map.getBounds().pad(-0.15).contains(target) || map.getZoom() < 12) {
      map.flyTo(target, zoom, { duration: 0.6 });
    }
    if (!marker.isPopupOpen()) marker.openPopup();
  }, [selectedId, events]);

  return (
    <div
      ref={containerRef}
      className="bf-map h-full w-full"
      role="region"
      aria-label="Map of events on the California Central Coast"
    />
  );
}
