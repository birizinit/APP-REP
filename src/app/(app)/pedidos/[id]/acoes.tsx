"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { excluirPedido, lancarNotaFiscal, mudarStatusPedido } from "@/app/actions/pedidos";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, Etiqueta } from "@/components/ui";
import { cx, rotulo } from "@/lib/format";

const FLUXO = ["RASCUNHO", "ENVIADO", "APROVADO", "FATURADO", "ENTREGUE"];

export function AcoesPedido({
  id,
  status,
  notaFiscal,
}: {
  id: string;
  status: string;
  notaFiscal: { numero: string; serie: string; data: string; chave: string; valor: string };
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [painelNf, setPainelNf] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const indice = FLUXO.indexOf(status);
  const proximo = indice >= 0 && indice < FLUXO.length - 1 ? FLUXO[indice + 1] : null;

  function enviarNf(dados: FormData) {
    setErro(null);
    dados.set("id", id);
    iniciar(async () => {
      const r = await lancarNotaFiscal(dados);
      if (r?.erro) {
        setErro(r.erro);
        return;
      }
      setPainelNf(false);
      router.refresh();
    });
  }

  return (
    <Canhoto className="overflow-hidden">
      <div className="p-3.5 space-y-2">
        {proximo && status !== "CANCELADO" ? (
          <button
            type="button"
            onClick={() =>
              iniciar(async () => {
                await mudarStatusPedido(id, proximo as never);
                router.refresh();
              })
            }
            disabled={pendente}
            className="botao botao-tinta w-full"
          >
            <Icone nome="check" tamanho={16} />
            Marcar como {rotulo(proximo).toLowerCase()}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setPainelNf((v) => !v)}
          className="botao botao-papel w-full"
        >
          <Icone nome="nota" tamanho={16} />
          {notaFiscal.numero ? "Editar nota fiscal" : "Lançar nota fiscal"}
        </button>
      </div>

      {painelNf ? (
        <form
          action={enviarNf}
          className="px-3.5 pb-3.5 anim-subir border-t border-papel-borda pt-3.5"
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Campo rotulo="Número" obrigatorio>
              <input
                name="notaFiscalNumero"
                defaultValue={notaFiscal.numero}
                className="campo cifra text-[13px]"
                required
              />
            </Campo>
            <Campo rotulo="Série">
              <input
                name="notaFiscalSerie"
                defaultValue={notaFiscal.serie}
                className="campo cifra text-[13px]"
              />
            </Campo>
            <Campo rotulo="Emissão">
              <input
                type="date"
                name="notaFiscalData"
                defaultValue={notaFiscal.data}
                className="campo text-[13px]"
              />
            </Campo>
            <Campo rotulo="Valor">
              <input
                name="notaFiscalValor"
                defaultValue={notaFiscal.valor}
                inputMode="decimal"
                className="campo cifra text-[13px]"
              />
            </Campo>
            <Campo rotulo="Chave de acesso" className="col-span-2">
              <input
                name="notaFiscalChave"
                defaultValue={notaFiscal.chave}
                inputMode="numeric"
                placeholder="44 dígitos"
                className="campo cifra text-[12px]"
              />
            </Campo>
          </div>

          <p className="text-[11.5px] text-tinta-3 mt-2 leading-snug">
            Se o plano paga no faturamento, o vencimento da comissão é recalculado a partir desta
            data.
          </p>

          {erro ? <p className="text-[12.5px] text-carimbo mt-2">{erro}</p> : null}

          <button type="submit" disabled={pendente} className="botao botao-tinta w-full mt-3 text-[13px]">
            {pendente ? "Salvando..." : "Salvar nota"}
          </button>
        </form>
      ) : null}

      <div className="border-t border-papel-borda p-3.5">
        <p className="rotulo mb-1.5">Situação</p>
        <div className="flex flex-wrap gap-1.5">
          {[...FLUXO, "CANCELADO", "DEVOLVIDO"].map((s) => (
            <button
              key={s}
              type="button"
              disabled={pendente || s === status}
              onClick={() =>
                iniciar(async () => {
                  await mudarStatusPedido(id, s as never);
                  router.refresh();
                })
              }
              className={cx(
                "etiqueta transition-colors",
                s === status
                  ? "bg-caneta text-white border-caneta"
                  : "border-papel-borda text-tinta-3 hover:text-tinta",
              )}
            >
              {rotulo(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-papel-borda">
        {confirmando ? (
          <div className="p-3.5 anim-subir">
            <p className="text-[13px] text-tinta mb-2.5">
              Excluir o pedido e as comissões ainda não recebidas?
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
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await excluirPedido(id);
                    if (r?.erro) {
                      setErro(r.erro);
                      setConfirmando(false);
                      return;
                    }
                    router.push("/pedidos");
                    router.refresh();
                  })
                }
                className="botao flex-1 text-[13px] bg-carimbo text-white"
              >
                Excluir
              </button>
            </div>
            {erro ? <p className="text-[12.5px] text-carimbo mt-2">{erro}</p> : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-tinta-3 hover:text-carimbo"
          >
            <Icone nome="lixeira" tamanho={14} />
            Excluir pedido
          </button>
        )}
      </div>
    </Canhoto>
  );
}
