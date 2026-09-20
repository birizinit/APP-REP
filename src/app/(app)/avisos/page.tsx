import type { Metadata } from "next";
import Link from "next/link";

import { BotaoMarcarLidos } from "@/app/(app)/avisos/acoes";
import { Icone, type NomeIcone } from "@/components/icone";
import { Canhoto, Etiqueta, Secao, Vazio } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { dataHoraBR, tempoRelativo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Avisos" };
export const dynamic = "force-dynamic";

const iconePorTipo: Record<string, NomeIcone> = {
  ROTA_DO_DIA: "rota",
  VISITA_PROXIMA: "agenda",
  CLIENTE_EM_RISCO: "fogo",
  COMISSAO_A_VENCER: "relogio",
  COMISSAO_VENCIDA: "alerta",
  COMISSAO_RECEBIDA: "cofre",
  PEDIDO_FATURADO: "pedido",
  META: "alvo",
  ANIVERSARIO: "estrela",
  SISTEMA: "sino",
};

const corPorTipo: Record<string, string> = {
  COMISSAO_VENCIDA: "bg-carimbo-fundo text-carimbo",
  CLIENTE_EM_RISCO: "bg-carimbo-fundo text-carimbo",
  COMISSAO_A_VENCER: "bg-ambar-fundo text-ambar",
  COMISSAO_RECEBIDA: "bg-quitado-fundo text-quitado",
  META: "bg-quitado-fundo text-quitado",
};

export default async function PaginaAvisos() {
  const user = await exigirUsuario();

  const avisos = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const naoLidos = avisos.filter((a) => !a.lida).length;

  return (
    <div className="escala">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Avisos</h1>
          <p className="text-[13.5px] text-tinta-3 mt-1">
            {naoLidos > 0 ? `${naoLidos} não lidos` : "Tudo lido"}
          </p>
        </div>
        {naoLidos > 0 ? <BotaoMarcarLidos /> : null}
      </header>

      <Secao titulo="Recentes">
        {avisos.length > 0 ? (
          <div className="space-y-2">
            {avisos.map((a) => {
              const conteudo = (
                <Canhoto
                  className={`p-3.5 flex items-start gap-3 ${
                    a.lida ? "opacity-70" : ""
                  } transition-transform active:scale-[0.99]`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                      corPorTipo[a.tipo] ?? "bg-caneta-fundo text-caneta"
                    }`}
                  >
                    <Icone nome={iconePorTipo[a.tipo] ?? "sino"} tamanho={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="text-[14px] font-semibold text-tinta leading-snug flex-1">
                        {a.titulo}
                      </p>
                      {!a.lida ? (
                        <span className="w-2 h-2 rounded-full bg-caneta shrink-0 mt-1.5" />
                      ) : null}
                    </div>
                    <p className="text-[12.5px] text-tinta-2 mt-0.5 leading-snug">{a.corpo}</p>
                    <p className="text-[11px] text-tinta-3 mt-1.5">
                      {tempoRelativo(a.createdAt)} · {dataHoraBR(a.createdAt)}
                      {a.enviadaPush ? " · enviado no celular" : ""}
                    </p>
                  </div>

                  {a.url ? (
                    <span className="text-tinta-3 shrink-0 self-center">
                      <Icone nome="seta" tamanho={16} />
                    </span>
                  ) : null}
                </Canhoto>
              );

              return a.url ? (
                <Link key={a.id} href={a.url} className="block">
                  {conteudo}
                </Link>
              ) : (
                <div key={a.id}>{conteudo}</div>
              );
            })}
          </div>
        ) : (
          <Vazio
            titulo="Nenhum aviso ainda"
            descricao="Assim que houver rota do dia, comissão vencendo ou cliente sumindo, eu aviso aqui e no celular."
          />
        )}
      </Secao>
    </div>
  );
}
