"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { concluirRota, excluirRota, iniciarRota, marcarParada } from "@/app/actions/rotas";
import { Icone } from "@/components/icone";
import { Canhoto } from "@/components/ui";
import { cx } from "@/lib/format";

export function AcoesRota({
  id,
  status,
  linkCompleto,
  paradas,
}: {
  id: string;
  status: string;
  linkCompleto: string;
  paradas: Array<{ id: string; label: string; status: string; lat: number; lng: number }>;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  const proxima = paradas.find((p) => p.status !== "VISITADO" && p.status !== "PULADO");
  const todasFeitas = paradas.every((p) => p.status === "VISITADO" || p.status === "PULADO");

  function acao(fn: () => Promise<unknown>) {
    iniciar(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <Canhoto className="overflow-hidden">
      <div className="p-3.5 space-y-2">
        {status === "PLANEJADA" || status === "RASCUNHO" ? (
          <button
            type="button"
            onClick={() => acao(() => iniciarRota(id))}
            disabled={pendente}
            className="botao botao-tinta w-full"
          >
            <Icone nome="raio" tamanho={16} />
            Começar a rota
          </button>
        ) : null}

        {proxima ? (
          <>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${proxima.lat},${proxima.lng}&travelmode=driving`}
              target="_blank"
              rel="noreferrer"
              className="botao botao-tinta w-full"
            >
              <Icone nome="bussola" tamanho={16} />
              Navegar até {proxima.label.split(" ").slice(0, 2).join(" ")}
            </a>
            <button
              type="button"
              onClick={() => acao(() => marcarParada(proxima.id, "VISITADO"))}
              disabled={pendente}
              className="botao botao-papel w-full"
            >
              <Icone nome="check" tamanho={16} />
              Marcar como visitado
            </button>
          </>
        ) : null}

        <a
          href={linkCompleto}
          target="_blank"
          rel="noreferrer"
          className="botao botao-papel w-full"
        >
          <Icone nome="externo" tamanho={15} />
          Abrir rota inteira no Maps
        </a>

        {todasFeitas && status !== "CONCLUIDA" ? (
          <button
            type="button"
            onClick={() => acao(() => concluirRota(id))}
            disabled={pendente}
            className="botao botao-tinta w-full"
          >
            <Icone nome="carimboIcone" tamanho={16} />
            Encerrar rota
          </button>
        ) : null}
      </div>

      <div className="border-t border-papel-borda">
        {confirmando ? (
          <div className="p-3.5 anim-subir">
            <p className="text-[13px] text-tinta mb-2.5">
              Excluir esta rota? As visitas na agenda continuam.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="botao botao-papel flex-1 text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  iniciar(async () => {
                    await excluirRota(id);
                    router.push("/rotas");
                    router.refresh();
                  })
                }
                disabled={pendente}
                className={cx("botao flex-1 text-[13px] bg-carimbo text-white")}
              >
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-tinta-3 hover:text-carimbo"
          >
            <Icone nome="lixeira" tamanho={14} />
            Excluir rota
          </button>
        )}
      </div>
    </Canhoto>
  );
}
