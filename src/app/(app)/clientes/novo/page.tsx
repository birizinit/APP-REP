import type { Metadata } from "next";
import Link from "next/link";

import { FormCliente } from "@/app/(app)/clientes/form";
import { Icone } from "@/components/icone";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  const user = await exigirUsuario();

  const [regioes, representadas] = await Promise.all([
    prisma.region.findMany({ where: { userId: user.id }, orderBy: { nome: "asc" } }),
    prisma.representada.findMany({
      where: { userId: user.id, status: { in: ["ATIVA", "PROSPECCAO"] } },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  return (
    <div>
      <header className="mb-5">
        <Link href="/clientes" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
          <Icone nome="setaEsquerda" tamanho={13} />
          Clientes
        </Link>
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Novo cliente</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1">
          Comece pelo CNPJ — o resto vem preenchido.
        </p>
      </header>

      <FormCliente
        regioes={regioes.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor }))}
        representadas={representadas.map((r) => ({
          id: r.id,
          nome: r.nomeFantasia ?? r.razaoSocial,
          cor: r.cor,
        }))}
      />
    </div>
  );
}
