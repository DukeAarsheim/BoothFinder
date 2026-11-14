"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import { REGION_BOUNDS, type LocatedEvent } from "@/lib/vendor/geo";
import {
  formatBoothFee,
  formatDateRange,
  formatFeeShort,
  formatLocation,
} from "@/lib/vendor/format";

/** Marker = a pill with the booth fee, or a dot when no fee is listed. */
function feeIcon(label: string | null) {
  const span = document.createElement("span");
  span.className = label ? "bf-fee" : "bf-fee bf-fee--none";
  if (label) span.textContent = label;
  return L.divIcon({
    className: "bf-marker",
    html: span,
    iconSize: [0, 0],
    popupAnchor: [0, label ? -34 : -10],
  });
}

/** Popup built with DOM nodes (textContent), so event text is never parsed as HTML. */
function popupContent({ event, precision }: LocatedEvent) {
  const el = (tag: string, className: string, text?: string | null) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const root = el("div", "space-y-0.5");
  root.append(el("p", "!m-0 text-sm font-semibold leading-snug text-neutral-950", event.name));
  const meta = [formatDateRange(event.start_date, event.end_date), formatLocation(event)]
    .filter(Boolean)
    .join(" · ");
  if (meta) root.append(el("p", "!m-0 text-[13px] text-neutral-600", meta));
  const fee = formatBoothFee(event);
  const feeLine = el("p", "!m-0 !mt-1.5 flex items-center gap-2 text-[13px] text-neutral-950");
  feeLine.append(el("span", fee ? "font-semibold" : "text-neutral-500", fee ? `${fee} booth fee` : "Booth fee not listed"));
  if (event.is_sample) {
    feeLine.append(el("span", "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900", "Sample"));
  }
  root.append(feeLine);
  if (precision === "county") {
    root.append(el("p", "!m-0 text-xs text-neutral-500", "Placed at the county seat; city not listed"));
  }
  return root;
}

/**
 * Leaflet map of events. Parent owns the data and the selection:
 *  - `events` are the currently filtered, located events (markers follow filters)
 *  - `selectedId` highlights a marker, opens its preview, and flies to it
 *  - `onSelect` fires when a marker is clicked
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
  const framedRef = useRef(false);
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
    // map.css mutes their colors.
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
      map.stop(); // cancel any fly/zoom animation before tearing down
      map.remove();
      mapRef.current = null;
      framedRef.current = false;
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
        icon: feeIcon(formatFeeShort(item.event)),
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

    // First framing is instant; later ones (filter changes) animate.
    const animate = framedRef.current;
    framedRef.current = true;
    if (events.length > 0) {
      map.fitBounds(L.latLngBounds(events.map((e) => e.position)), {
        padding: [40, 40],
        maxZoom: 12,
        animate,
      });
    } else {
      map.fitBounds(REGION_BOUNDS, { animate });
    }
  }, [events]);

  // Reflect the selection: highlight, preview, and focus.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker, id) => {
      const on = id === selectedId;
      marker.getElement()?.classList.toggle("bf-marker--selected", on);
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
