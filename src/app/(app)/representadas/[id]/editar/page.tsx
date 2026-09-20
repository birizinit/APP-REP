import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormRepresentada } from "@/app/(app)/representadas/form";
import { Icone } from "@/components/icone";
import { exigirUsuario } from "@/lib/auth";
import { formatarCnpj, num, paraInputData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar representada" };

export default async function EditarRepresentada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const r = await prisma.representada.findFirst({ where: { id, userId: user.id } });
  if (!r) notFound();

  return (
    <div>
      <header className="mb-5">
        <Link href={`/representadas/${r.id}`} className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
          <Icone nome="setaEsquerda" tamanho={13} />
          {r.nomeFantasia ?? r.razaoSocial}
        </Link>
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Editar representada</h1>
      </header>

      <FormRepresentada
        inicial={{
          id: r.id,
          razaoSocial: r.razaoSocial,
          nomeFantasia: r.nomeFantasia ?? "",
          cnpj: r.cnpj ? formatarCnpj(r.cnpj) : "",
          inscricaoEstadual: r.inscricaoEstadual ?? "",
          segmento: r.segmento ?? "",
          site: r.site ?? "",
          cor: r.cor,
          email: r.email ?? "",
          telefone: r.telefone ?? "",
          whatsapp: r.whatsapp ?? "",
          contatoNome: r.contatoNome ?? "",
          contatoCargo: r.contatoCargo ?? "",
          contatoEmail: r.contatoEmail ?? "",
          contatoFone: r.contatoFone ?? "",
          cep: r.cep ?? "",
          logradouro: r.logradouro ?? "",
          numero: r.numero ?? "",
          bairro: r.bairro ?? "",
          cidade: r.cidade ?? "",
          uf: r.uf ?? "",
          status: r.status,
          contratoInicio: r.contratoInicio ? paraInputData(r.contratoInicio) : "",
          contratoFim: r.contratoFim ? paraInputData(r.contratoFim) : "",
          exclusividade: r.exclusividade,
          territorio: r.territorio ?? "",
          prazoEntregaDias: r.prazoEntregaDias ? String(r.prazoEntregaDias) : "",
          pedidoMinimo: r.pedidoMinimo ? String(num(r.pedidoMinimo)) : "",
          metaMensal: String(num(r.metaMensal)),
          observacoes: r.observacoes ?? "",
        }}
      />
    </div>
  );
}
