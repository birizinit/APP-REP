import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AcoesRota } from "@/app/(app)/rotas/[id]/acoes";
import { TrilhaParadas } from "@/components/cartoes";
import { Icone } from "@/components/icone";
import { MapaRota } from "@/components/mapa";
import { Canhoto, CanhotoTitulo, Carimbo, Etiqueta, LinhaPicotada } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import {
  dataBR,
  dinheiro,
  duracao,
  km,
  litros,
  num,
  plain,
  rotulo,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { linkGoogleMaps } from "@/lib/rotas";

export const metadata: Metadata = { title: "Rota" };
export const dynamic = "force-dynamic";

export default async function PaginaRota({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await exigirUsuario();

  const rota = await prisma.route.findFirst({
    where: { id, userId: user.id },
    include: {
      veiculo: true,
      paradas: {
        orderBy: { ordem: "asc" },
        include: {
          cliente: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              curva: true,
              cidade: true,
              uf: true,
              whatsapp: true,
              telefone: true,
            },
          },
        },
      },
    },
  });

  if (!rota) notFound();

  const visitadas = rota.paradas.filter((p) => p.status === "VISITADO").length;
  const completa = visitadas === rota.paradas.length && rota.paradas.length > 0;

  const pontosMapa = [
    ...(rota.origemLat && rota.origemLng
      ? [
          {
            lat: rota.origemLat,
            lng: rota.origemLng,
            label: rota.origemLabel ?? "Base",
            tipo: "base" as const,
          },
        ]
      : []),
    ...rota.paradas.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      label: p.label,
      ordem: p.ordem,
      tipo:
        p.status === "VISITADO"
          ? ("visitado" as const)
          : p.status === "EM_ROTA"
            ? ("atual" as const)
            : ("parada" as const),
    })),
  ];

  const linkCompleto = linkGoogleMaps(pontosMapa.map((p) => ({ lat: p.lat, lng: p.lng })));

  return (
    <div className="escala">
      <header className="mb-5">
        <Link href="/rotas" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
          <Icone nome="setaEsquerda" tamanho={13} />
          Rotas
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[31px] tracking-[-0.04em] text-tinta">{rota.nome}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Etiqueta
                tom={
                  rota.status === "EM_ANDAMENTO"
                    ? "ambar"
                    : rota.status === "CONCLUIDA"
                      ? "quitado"
                      : "neutro"
                }
              >
                {rotulo(rota.status)}
              </Etiqueta>
              <Etiqueta
                tom="tinta"
                icone={rota.modo === "RAPIDO" ? "raio" : rota.modo === "ECONOMICO" ? "folha" : "balanca"}
              >
                {rotulo(rota.modo)}
              </Etiqueta>
              <span className="text-[12.5px] text-tinta-3">
                {dataBR(rota.data)}
                {rota.veiculo ? ` · ${rota.veiculo.apelido}` : ""}
              </span>
            </div>
          </div>
          {completa ? (
            <span className="shrink-0">
              <Carimbo tom="quitado" grande batendo>
                feita
              </Carimbo>
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
        <div className="space-y-4">
          <Canhoto className="p-2.5">
            <MapaRota pontos={pontosMapa} polyline={rota.polyline} altura={300} />
          </Canhoto>

          <Canhoto className="p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-[15px]">Paradas</h2>
              <span className="text-[12.5px] text-tinta-3">
                {visitadas} de {rota.paradas.length} visitadas
              </span>
            </div>

            <TrilhaParadas
              origem={rota.origemLabel ?? undefined}
              paradas={plain(
                rota.paradas.map((p) => ({
                  id: p.id,
                  ordem: p.ordem,
                  label: p.label,
                  status: p.status,
                  distanciaAnteriorKm: p.distanciaAnteriorKm,
                  duracaoAnteriorMin: p.duracaoAnteriorMin,
                  chegadaPrevista: p.chegadaPrevista?.toISOString() ?? null,
                  permanenciaMin: p.permanenciaMin,
                  lat: p.lat,
                  lng: p.lng,
                  cliente: p.cliente
                    ? {
                        id: p.cliente.id,
                        curva: p.cliente.curva,
                        cidade: p.cliente.cidade,
                        uf: p.cliente.uf,
                      }
                    : null,
                })),
              )}
            />
          </Canhoto>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <AcoesRota
            id={rota.id}
            status={rota.status}
            linkCompleto={linkCompleto}
            paradas={rota.paradas.map((p) => ({
              id: p.id,
              label: p.label,
              status: p.status,
              lat: p.lat,
              lng: p.lng,
            }))}
          />

          <Canhoto picotado className="p-4">
            <p className="rotulo mb-1">Custo da rota</p>
            <p className="cifra text-[30px] text-tinta font-medium leading-none mb-4">
              {dinheiro(rota.custoTotal)}
            </p>

            <div className="space-y-1.5 text-[12.5px]">
              {[
                { r: `Combustível · ${litros(rota.consumoLitros)}`, v: num(rota.custoCombustivel) },
                { r: "Manutenção e desgaste", v: num(rota.custoManutencao) },
                ...(num(rota.custoPedagio) > 0 ? [{ r: "Pedágio", v: num(rota.custoPedagio) }] : []),
              ].map((l) => (
                <div key={l.r} className="flex items-baseline gap-2">
                  <span className="text-tinta-2">{l.r}</span>
                  <span className="flex-1 border-b border-dotted border-papel-borda translate-y-[-3px]" />
                  <span className="cifra text-tinta">{dinheiro(l.v)}</span>
                </div>
              ))}
            </div>

            <LinhaPicotada />

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { r: "Distância", v: km(rota.distanciaKm) },
                { r: "Tempo", v: duracao(rota.duracaoMin) },
                {
                  r: "Por km",
                  v: dinheiro(rota.distanciaKm > 0 ? num(rota.custoTotal) / rota.distanciaKm : 0),
                },
              ].map((m) => (
                <div key={m.r}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tinta-3">
                    {m.r}
                  </p>
                  <p className="cifra text-[14px] text-tinta mt-0.5">{m.v}</p>
                </div>
              ))}
            </div>

            {num(rota.reaisEconomizados) > 0 ? (
              <div className="mt-4 rounded-xl bg-quitado-fundo px-3 py-2.5 flex items-start gap-2">
                <span className="text-quitado shrink-0 mt-px">
                  <Icone nome="folha" tamanho={15} />
                </span>
                <p className="text-[12px] text-quitado leading-snug">
                  A ordenação automática cortou <strong>{km(rota.kmEconomizados)}</strong> e{" "}
                  <strong>{dinheiro(rota.reaisEconomizados)}</strong> em relação à ordem em que você
                  escolheu os clientes.
                </p>
              </div>
            ) : null}
          </Canhoto>

          {rota.veiculo ? (
            <Canhoto>
              <CanhotoTitulo
                titulo={rota.veiculo.apelido}
                sub={[rota.veiculo.marca, rota.veiculo.modelo].filter(Boolean).join(" ") || undefined}
                icone="veiculo"
              />
              <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <div>
                  <p className="text-tinta-3">Consumo cidade</p>
                  <p className="cifra text-tinta">{rota.veiculo.consumoCidade} km/l</p>
                </div>
                <div>
                  <p className="text-tinta-3">Consumo estrada</p>
                  <p className="cifra text-tinta">{rota.veiculo.consumoEstrada} km/l</p>
                </div>
                <div>
                  <p className="text-tinta-3">Combustível</p>
                  <p className="text-tinta">
                    {rotulo(rota.veiculo.combustivel)}
                    {rota.veiculo.flex ? " (flex)" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-tinta-3">Custo por km</p>
                  <p className="cifra text-tinta">{dinheiro(rota.veiculo.custoManutencaoKm)}</p>
                </div>
              </div>
            </Canhoto>
          ) : null}
        </div>
      </div>
    </div>
  );
}
