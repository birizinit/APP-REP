"use client";

import { useEffect } from "react";

/** Registra o service worker que faz o app funcionar offline e receber push. */
export function RegistrarSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* silencioso: o app funciona sem isso */
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar);

    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
