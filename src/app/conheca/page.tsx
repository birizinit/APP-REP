import type { Metadata } from "next";

import "@/components/landing/landing.css";
import { Landing } from "@/components/landing/landing";
import { usuarioAtual } from "@/lib/auth";

export const metadata: Metadata = {
  title: { absolute: "Representei — pare de perder comissão e quilômetro" },
  description:
    "O talão digital do representante comercial: rota com custo real de combustível, comissão de cada representada conferida no automático e aviso antes do cliente sumir.",
  openGraph: {
    title: "Representei — o talão digital do representante",
    description:
      "Rota com custo real, comissão conferida no automático e aviso antes do cliente sumir.",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic";

export default async function PaginaConheca() {
  // Quem ja tem conta ve "Abrir meu talão" em vez de "Criar conta".
  const logado = Boolean(await usuarioAtual().catch(() => null));
  return <Landing logado={logado} />;
}
