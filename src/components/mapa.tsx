"use client";

import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

import { decodificarPolyline } from "@/lib/rotas";

export interface PontoMapa {
  lat: number;
  lng: number;
  label: string;
  ordem?: number;
  tipo?: "base" | "parada" | "visitado" | "atual";
}

/**
 * Mapa da rota. Leaflet direto no useEffect — sem wrapper de React,
 * o que evita briga de versão e deixa o controle do traçado na mão.
 * Os marcadores são divIcon, então seguem o tema do app.
 */
export function MapaRota({
  pontos,
  polyline,
  altura = 260,
  interativo = true,
}: {
  pontos: PontoMapa[];
  polyline?: string | null;
  altura?: number;
  interativo?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!container.current || pontos.length === 0) return;
    let cancelado = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !container.current) return;

      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
      }

      const mapaLocal = L.map(container.current, {
        zoomControl: interativo,
        scrollWheelZoom: false,
        dragging: interativo,
        attributionControl: true,
      });
      mapa.current = mapaLocal;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapaLocal);

      // --- traçado ---
      const corTraco =
        getComputedStyle(document.documentElement).getPropertyValue("--color-caneta").trim() ||
        "#1b34c4";

      const coordenadas: Array<[number, number]> = polyline
        ? decodificarPolyline(polyline)
        : pontos.map((p) => [p.lat, p.lng]);

      if (coordenadas.length > 1) {
        L.polyline(coordenadas, {
          color: corTraco,
          weight: 4,
          opacity: 0.55,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(mapaLocal);

        L.polyline(coordenadas, {
          color: corTraco,
          weight: 2,
          opacity: 0.95,
          dashArray: polyline ? undefined : "7 7",
        }).addTo(mapaLocal);
      }

      // --- marcadores ---
      for (const ponto of pontos) {
        const base = ponto.tipo === "base";
        const visitado = ponto.tipo === "visitado";
        const atual = ponto.tipo === "atual";

        const cor = base
          ? "var(--color-tinta-2)"
          : visitado
            ? "var(--color-quitado)"
            : atual
              ? "var(--color-ambar)"
              : "var(--color-caneta)";

        const conteudo = base
          ? `<span style="display:block;width:8px;height:8px;border-radius:50%;background:#fff"></span>`
          : `<span>${ponto.ordem ?? ""}</span>`;

        const icone = L.divIcon({
          className: "pino-parada",
          html: `<div style="
            width:28px;height:28px;border-radius:50% 50% 50% 8px;
            transform:rotate(45deg);
            background:${cor};
            border:2.5px solid var(--color-papel-alto);
            box-shadow:0 3px 10px -2px rgba(0,0,0,.45);
            display:grid;place-items:center;
          "><span style="
            transform:rotate(-45deg);
            color:#fff;font-weight:800;font-size:12px;
            font-family:var(--font-display);
          ">${conteudo}</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 26],
          popupAnchor: [0, -26],
        });

        L.marker([ponto.lat, ponto.lng], { icon: icone })
          .addTo(mapaLocal)
          .bindPopup(
            `<strong style="font-family:var(--font-sans)">${ponto.label}</strong>`,
            { closeButton: false },
          );
      }

      const limites = L.latLngBounds(pontos.map((p) => [p.lat, p.lng] as [number, number]));
      mapaLocal.fitBounds(limites, { padding: [34, 34], maxZoom: 14 });

      // o container só ganha altura depois do paint
      setTimeout(() => mapaLocal.invalidateSize(), 60);
    })();

    return () => {
      cancelado = true;
      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
      }
    };
  }, [pontos, polyline, interativo]);

  if (pontos.length === 0) return null;

  return (
    <div
      ref={container}
      style={{ height: altura }}
      className="w-full rounded-xl overflow-hidden border border-papel-borda z-0"
      role="img"
      aria-label="Mapa da rota"
    />
  );
}
