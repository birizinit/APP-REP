import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormCliente } from "@/app/(app)/clientes/form";
import { Icone } from "@/components/icone";
import { exigirUsuario } from "@/lib/auth";
import { formatarCnpj, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const [cliente, regioes, representadas] = await Promise.all([
    prisma.client.findFirst({
      where: { id, userId: user.id },
      include: { representadas: { select: { representadaId: true } } },
    }),
    prisma.region.findMany({ where: { userId: user.id }, orderBy: { nome: "asc" } }),
    prisma.representada.findMany({
      where: { userId: user.id, status: { in: ["ATIVA", "PROSPECCAO"] } },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  if (!cliente) notFound();

  return (
    <div>
      <header className="mb-5">
        <Link
          href={`/clientes/${cliente.id}`}
          className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5"
        >
          <Icone nome="setaEsquerda" tamanho={13} />
          {cliente.nomeFantasia ?? cliente.razaoSocial}
        </Link>
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Editar cadastro</h1>
      </header>

      <FormCliente
        regioes={regioes.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor }))}
        representadas={representadas.map((r) => ({
          id: r.id,
          nome: r.nomeFantasia ?? r.razaoSocial,
          cor: r.cor,
        }))}
        inicial={{
          id: cliente.id,
          tipoPessoa: cliente.tipoPessoa,
          cnpj: cliente.cnpj ? formatarCnpj(cliente.cnpj) : "",
          cpf: cliente.cpf ?? "",
          razaoSocial: cliente.razaoSocial,
          nomeFantasia: cliente.nomeFantasia ?? "",
          inscricaoEstadual: cliente.inscricaoEstadual ?? "",
          email: cliente.email ?? "",
          telefone: cliente.telefone ?? "",
          whatsapp: cliente.whatsapp ?? "",
          contatoNome: cliente.contatoNome ?? "",
          contatoCargo: cliente.contatoCargo ?? "",
          contatoEmail: cliente.contatoEmail ?? "",
          contatoFone: cliente.contatoFone ?? "",
          cep: cliente.cep ?? "",
          logradouro: cliente.logradouro ?? "",
          numero: cliente.numero ?? "",
          complemento: cliente.complemento ?? "",
          bairro: cliente.bairro ?? "",
          cidade: cliente.cidade ?? "",
          uf: cliente.uf ?? "",
          pontoReferencia: cliente.pontoReferencia ?? "",
          regionId: cliente.regionId ?? "",
          curva: cliente.curva,
          curvaAutomatica: cliente.curvaAutomatica,
          status: cliente.status,
          frequenciaVisitaDias: String(cliente.frequenciaVisitaDias),
          tempoVisitaMin: String(cliente.tempoVisitaMin),
          horaAbre: cliente.horaAbre ?? "08:00",
          horaFecha: cliente.horaFecha ?? "18:00",
          condicaoPagamento: cliente.condicaoPagamento ?? "",
          limiteCredito: cliente.limiteCredito ? String(num(cliente.limiteCredito)) : "",
          potencialMensal: cliente.potencialMensal ? String(num(cliente.potencialMensal)) : "",
          origem: cliente.origem ?? "",
          observacoes: cliente.observacoes ?? "",
          tags: cliente.tags.join(", "),
          lat: cliente.lat ? String(cliente.lat) : "",
          lng: cliente.lng ? String(cliente.lng) : "",
          representadas: cliente.representadas.map((r) => r.representadaId),
        }}
      />
    </div>
  );
}
