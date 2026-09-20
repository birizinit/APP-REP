import type { Metadata } from "next";

import {
  SecaoBase,
  SecaoNotificacoes,
  SecaoPerfil,
  SecaoRegioes,
  SecaoSeguranca,
  SecaoVeiculos,
} from "@/app/(app)/ajustes/secoes";
import { Canhoto } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { num, paraInputData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function PaginaAjustes({
  searchParams,
}: {
  searchParams: Promise<{ bemvindo?: string }>;
}) {
  const params = await searchParams;
  const user = await exigirUsuario();

  const [veiculos, regioes, semRegiao, abastecimentos] = await Promise.all([
    prisma.vehicle.findMany({ where: { userId: user.id }, orderBy: { padrao: "desc" } }),
    prisma.region.findMany({
      where: { userId: user.id },
      orderBy: { nome: "asc" },
      include: { _count: { select: { clientes: true } } },
    }),
    prisma.client.count({ where: { userId: user.id, regionId: null } }),
    prisma.refuel.findMany({
      where: { vehicle: { userId: user.id } },
      orderBy: { data: "desc" },
      take: 5,
      include: { vehicle: { select: { apelido: true } } },
    }),
  ]);

  const vapidPublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <div className="escala max-w-[820px]">
      <header className="mb-5">
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Ajustes</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1">
          Base da rota, veículo, regiões e notificações.
        </p>
      </header>

      {params.bemvindo ? (
        <Canhoto picotado className="p-4 mb-4 border-l-[3px] border-l-[var(--color-caneta)]">
          <p className="text-[15px] text-tinta">Bem-vindo ao Representei.</p>
          <p className="text-[13px] text-tinta-2 mt-1.5 leading-relaxed">
            Comece cadastrando o <strong>endereço da sua base</strong> e o <strong>veículo</strong>.
            Sem isso a rota não calcula quilometragem nem combustível. Depois cadastre as
            representadas com o plano de comissão de cada uma.
          </p>
        </Canhoto>
      ) : null}

      <div className="space-y-4">
        <SecaoPerfil
          inicial={{
            nome: user.nome,
            email: user.email,
            telefone: user.telefone ?? "",
            whatsapp: user.whatsapp ?? "",
            cpfCnpj: user.cpfCnpj ?? "",
            metaMensal: String(num(user.metaMensal)),
            metaVisitasDia: String(user.metaVisitasDia),
            jornadaInicio: user.jornadaInicio,
            jornadaFim: user.jornadaFim,
            almocoInicio: user.almocoInicio,
            almocoMinutos: String(user.almocoMinutos),
          }}
        />

        <SecaoBase
          inicial={{
            baseLabel: user.baseLabel ?? "",
            baseCep: user.baseCep ?? "",
            baseRua: user.baseRua ?? "",
            baseNum: user.baseNum ?? "",
            baseBairro: user.baseBairro ?? "",
            baseCidade: user.baseCidade ?? "",
            baseUf: user.baseUf ?? "",
            baseLat: user.baseLat,
            baseLng: user.baseLng,
          }}
        />

        <SecaoVeiculos
          veiculos={veiculos.map((v) => ({
            id: v.id,
            apelido: v.apelido,
            marca: v.marca ?? "",
            modelo: v.modelo ?? "",
            ano: v.ano ? String(v.ano) : "",
            placa: v.placa ?? "",
            combustivel: v.combustivel,
            flex: v.flex,
            consumoCidade: String(v.consumoCidade),
            consumoEstrada: String(v.consumoEstrada),
            precoGasolina: String(num(v.precoGasolina)),
            precoEtanol: String(num(v.precoEtanol)),
            precoDiesel: String(num(v.precoDiesel)),
            custoManutencaoKm: String(num(v.custoManutencaoKm)),
            pedagioMedioDia: String(num(v.pedagioMedioDia)),
            hodometro: v.hodometro ? String(v.hodometro) : "",
            padrao: v.padrao,
            ativo: v.ativo,
          }))}
          abastecimentos={abastecimentos.map((a) => ({
            id: a.id,
            veiculo: a.vehicle.apelido,
            data: paraInputData(a.data),
            litros: a.litros,
            valorLitro: num(a.valorLitro),
            valorTotal: num(a.valorTotal),
            hodometro: a.hodometro,
            posto: a.posto,
          }))}
        />

        <SecaoRegioes
          regioes={regioes.map((r) => ({
            id: r.id,
            nome: r.nome,
            cor: r.cor,
            uf: r.uf ?? "",
            diaSemana: r.diaSemana === null ? "" : String(r.diaSemana),
            cidades: r.cidades.join(", "),
            total: r._count.clientes,
          }))}
          semRegiao={semRegiao}
        />

        <SecaoNotificacoes vapidPublica={vapidPublica} />

        <SecaoSeguranca />
      </div>
    </div>
  );
}
