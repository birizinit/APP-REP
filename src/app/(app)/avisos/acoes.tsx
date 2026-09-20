"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { marcarAvisosLidos } from "@/app/actions/ajustes";
import { Icone } from "@/components/icone";

export function BotaoMarcarLidos() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await marcarAvisosLidos();
          router.refresh();
        })
      }
      className="botao botao-papel text-[13px]"
    >
      <Icone nome="check" tamanho={15} />
      Marcar como lidos
    </button>
  );
}
