import type { Metadata } from "next";

import { Importador } from "@/app/(app)/importar/importador";
import { Icone } from "@/components/icone";
import { Canhoto, Etiqueta, Secao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { dataHoraBR, rotulo } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Importar" };
export const dynamic = "force-dynamic";

export default async function PaginaImportar() {
  const user = await exigirUsuario();

  const [regioes, representadas, historico] = await Promise.all([
    prisma.region.findMany({ where: { userId: user.id }, orderBy: { nome: "asc" } }),
    prisma.representada.findMany({
      where: { userId: user.id, status: { in: ["ATIVA", "PROSPECCAO"] } },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.importJob.findMany({
      where: { userId: user.id, status: { in: ["CONCLUIDA", "ERRO"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const clientesPorCnpj = await prisma.client.findMany({
    where: { userId: user.id, cnpj: { not: null } },
    select: { id: true, cnpj: true, razaoSocial: true, nomeFantasia: true },
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div className="escala">
      <header className="mb-5">
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Importar</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1 max-w-[56ch] leading-relaxed">
          Jogue a planilha de clientes ou o PDF do pedido que a fábrica mandou. O sistema tenta
          adivinhar as colunas e mostra tudo antes de gravar.
        </p>
      </header>

      <Importador
        regioes={regioes.map((r) => ({ id: r.id, nome: r.nome }))}
        representadas={representadas.map((r) => ({
          id: r.id,
          nome: r.nomeFantasia ?? r.razaoSocial,
          cor: r.cor,
        }))}
        clientes={clientesPorCnpj.map((c) => ({
          id: c.id,
          cnpj: c.cnpj ?? "",
          nome: c.nomeFantasia ?? c.razaoSocial,
        }))}
      />

      {historico.length > 0 ? (
        <Secao titulo="Importações anteriores" className="mt-7">
          <div className="space-y-2">
            {historico.map((h) => (
              <Canhoto key={h.id} className="p-3.5 flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                    h.status === "CONCLUIDA"
                      ? "bg-quitado-fundo text-quitado"
                      : "bg-carimbo-fundo text-carimbo"
                  }`}
                >
                  <Icone nome={h.formato === "pdf" ? "pdf" : "planilha"} tamanho={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-tinta truncate">{h.arquivoNome}</p>
                  <p className="text-[11.5px] text-tinta-3">
                    {dataHoraBR(h.createdAt)} · {rotulo(h.tipo)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {h.importados > 0 ? (
                    <Etiqueta tom="quitado">{h.importados} novos</Etiqueta>
                  ) : null}
                  {h.atualizados > 0 ? (
                    <Etiqueta tom="tinta">{h.atualizados} atualizados</Etiqueta>
                  ) : null}
                  {h.ignorados > 0 ? (
                    <Etiqueta tom="neutro">{h.ignorados} fora</Etiqueta>
                  ) : null}
                </div>
              </Canhoto>
            ))}
          </div>
        </Secao>
      ) : null}
    </div>
  );
}
