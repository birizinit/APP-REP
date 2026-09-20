"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { concluirVisita, registrarCheckin } from "@/app/actions/agenda";
import { Icone, type NomeIcone } from "@/components/icone";
import { Avatar, Carimbo, Etiqueta, SeloCurva, type Tom } from "@/components/ui";
import {
  cx,
  dataBR,
  dinheiro,
  endereco,
  hora,
  km,
  linkWhatsapp,
  rotulo,
  tempoRelativo,
} from "@/lib/format";

// ==================================================================
// Compromisso da agenda
// ==================================================================

export interface CompromissoUI {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  resultado: string | null;
  inicio: string;
  fim: string;
  local: string | null;
  descricao: string | null;
  notas: string | null;
  checkinEm: string | null;
  checkinDistanciaM: number | null;
  cliente: {
    id: string;
    nome: string;
    curva: "A" | "B" | "C" | "D";
    whatsapp: string | null;
    telefone: string | null;
    lat: number | null;
    lng: number | null;
    endereco: string;
  } | null;
}

const iconePorTipo: Record<string, NomeIcone> = {
  VISITA: "clientes",
  PROSPECCAO: "alvo",
  COBRANCA: "comissao",
  ENTREGA: "veiculo",
  REUNIAO: "usuario",
  TREINAMENTO: "estrela",
  POS_VENDA: "check",
  PESSOAL: "relogio",
};

const tomPorStatus: Record<string, Tom> = {
  PLANEJADO: "neutro",
  CONFIRMADO: "tinta",
  EM_ROTA: "ambar",
  EM_ATENDIMENTO: "ambar",
  CONCLUIDO: "quitado",
  CANCELADO: "neutro",
  REAGENDADO: "rosa",
  NAO_ATENDIDO: "carimbo",
};

export function ItemAgenda({ c, compacto }: { c: CompromissoUI; compacto?: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [painelFim, setPainelFim] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const concluido = c.status === "CONCLUIDO";
  const emAtendimento = c.status === "EM_ATENDIMENTO";
  const wa = c.cliente ? linkWhatsapp(c.cliente.whatsapp ?? c.cliente.telefone) : null;

  function fazerCheckin() {
    setAviso(null);
    const seguir = (lat?: number, lng?: number) =>
      iniciar(async () => {
        const r = await registrarCheckin(c.id, lat, lng);
        if (r?.distancia !== undefined && r.distancia !== null) {
          setAviso(
            r.distancia <= 300
              ? `Check-in confirmado a ${r.distancia} m do cliente.`
              : `Check-in feito, mas você está a ${(r.distancia / 1000).toFixed(1)} km do endereço cadastrado.`,
          );
        }
        router.refresh();
      });

    if (!navigator.geolocation) return seguir();
    navigator.geolocation.getCurrentPosition(
      (pos) => seguir(pos.coords.latitude, pos.coords.longitude),
      () => seguir(),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function finalizar(resultado: string, notas: string) {
    iniciar(async () => {
      await concluirVisita(c.id, resultado as never, notas);
      setPainelFim(false);
      router.refresh();
    });
  }

  return (
    <div
      className={cx(
        "canhoto overflow-hidden transition-opacity",
        concluido && "opacity-[0.72]",
        emAtendimento && "ring-2 ring-[color-mix(in_oklab,var(--color-ambar)_45%,transparent)]",
      )}
    >
      <div className="flex gap-3 p-3.5">
        {/* horário */}
        <div className="shrink-0 text-center w-[46px] pt-0.5">
          <p className="cifra text-[15px] font-medium text-tinta leading-none">{hora(c.inicio)}</p>
          <p className="text-[10.5px] text-tinta-3 mt-1">{hora(c.fim)}</p>
          {emAtendimento ? (
            <span className="inline-block mt-2 w-2 h-2 rounded-full bg-ambar ponto-vivo" />
          ) : null}
        </div>

        <div className="w-px bg-papel-borda shrink-0" />

        {/* corpo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-tinta-3 shrink-0">
              <Icone nome={iconePorTipo[c.tipo] ?? "agenda"} tamanho={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cx(
                  "text-[14.5px] font-semibold text-tinta leading-snug",
                  concluido && "risco decoration-[var(--color-tinta-3)]",
                )}
              >
                {c.cliente ? (
                  <Link href={`/clientes/${c.cliente.id}`} className="hover:text-caneta">
                    {c.titulo}
                  </Link>
                ) : (
                  c.titulo
                )}
              </p>
              {c.local ? (
                <p className="text-[12px] text-tinta-3 mt-0.5 flex items-center gap-1">
                  <Icone nome="pino" tamanho={11} />
                  {c.local}
                </p>
              ) : null}
            </div>
            {c.cliente ? <SeloCurva curva={c.cliente.curva} tamanho={20} /> : null}
          </div>

          {!compacto && c.descricao ? (
            <p className="text-[12.5px] text-tinta-2 mt-2 leading-relaxed">{c.descricao}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <Etiqueta tom={tomPorStatus[c.status] ?? "neutro"}>{rotulo(c.status)}</Etiqueta>
            {c.resultado ? (
              <Etiqueta tom={c.resultado === "PEDIDO" ? "quitado" : "neutro"}>
                {rotulo(c.resultado)}
              </Etiqueta>
            ) : null}
            {c.checkinDistanciaM !== null ? (
              <Etiqueta tom={c.checkinDistanciaM <= 300 ? "quitado" : "ambar"} icone="localizar">
                {c.checkinDistanciaM <= 999
                  ? `${c.checkinDistanciaM} m`
                  : `${(c.checkinDistanciaM / 1000).toFixed(1)} km`}
              </Etiqueta>
            ) : null}
          </div>

          {c.notas ? (
            <p className="text-[12px] text-tinta-2 mt-2.5 pl-2.5 border-l-2 border-papel-borda leading-relaxed">
              {c.notas}
            </p>
          ) : null}

          {aviso ? (
            <p className="text-[12px] text-quitado mt-2 anim-surgir flex items-center gap-1">
              <Icone nome="check" tamanho={13} />
              {aviso}
            </p>
          ) : null}
        </div>
      </div>

      {/* ações */}
      {!concluido ? (
        <div className="flex items-stretch border-t border-papel-borda divide-x divide-[var(--color-papel-borda)]">
          {!c.checkinEm ? (
            <button
              type="button"
              onClick={fazerCheckin}
              disabled={pendente}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-caneta active:bg-caneta-fundo disabled:opacity-50"
            >
              <Icone nome="localizar" tamanho={15} />
              Check-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPainelFim((v) => !v)}
              disabled={pendente}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-quitado active:bg-quitado-fundo disabled:opacity-50"
            >
              <Icone nome="check" tamanho={15} />
              Encerrar visita
            </button>
          )}

          {c.cliente?.lat && c.cliente?.lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${c.cliente.lat},${c.cliente.lng}&travelmode=driving`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
            >
              <Icone nome="bussola" tamanho={15} />
              Navegar
            </a>
          ) : null}

          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
            >
              <Icone nome="whatsapp" tamanho={15} />
              Avisar
            </a>
          ) : null}
        </div>
      ) : null}

      {painelFim ? <PainelEncerrar aoConfirmar={finalizar} pendente={pendente} /> : null}
    </div>
  );
}

function PainelEncerrar({
  aoConfirmar,
  pendente,
}: {
  aoConfirmar: (resultado: string, notas: string) => void;
  pendente: boolean;
}) {
  const [resultado, setResultado] = useState("PEDIDO");
  const [notas, setNotas] = useState("");

  const opcoes = [
    { valor: "PEDIDO", rotulo: "Saiu pedido", icone: "pedido" as const, tom: "quitado" },
    { valor: "ORCAMENTO", rotulo: "Orçamento", icone: "nota" as const, tom: "tinta" },
    { valor: "SEM_PEDIDO", rotulo: "Sem pedido", icone: "menos" as const, tom: "neutro" },
    { valor: "CLIENTE_AUSENTE", rotulo: "Não estava", icone: "fechar" as const, tom: "neutro" },
    { valor: "AGENDOU_RETORNO", rotulo: "Volto depois", icone: "historico" as const, tom: "tinta" },
    { valor: "RECLAMACAO", rotulo: "Reclamação", icone: "alerta" as const, tom: "carimbo" },
  ];

  return (
    <div className="border-t border-papel-borda p-3.5 bg-[color-mix(in_oklab,var(--color-tinta)_3%,transparent)] anim-subir">
      <p className="rotulo">Como foi?</p>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setResultado(o.valor)}
            className={cx(
              "flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-semibold transition-colors",
              resultado === o.valor
                ? "border-caneta bg-caneta-fundo text-caneta"
                : "border-papel-borda text-tinta-3",
            )}
          >
            <Icone nome={o.icone} tamanho={15} />
            {o.rotulo}
          </button>
        ))}
      </div>

      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={2}
        placeholder="O que ficou combinado? (fica no histórico do cliente)"
        className="campo resize-none text-[13px]"
      />

      <button
        type="button"
        onClick={() => aoConfirmar(resultado, notas)}
        disabled={pendente}
        className="botao botao-tinta w-full mt-2.5"
      >
        {pendente ? "Salvando..." : "Registrar e fechar"}
      </button>
    </div>
  );
}

// ==================================================================
// Cliente
// ==================================================================

export interface ClienteUI {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cidade: string | null;
  uf: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  curva: "A" | "B" | "C" | "D";
  status: string;
  totalComprado: number;
  qtdPedidos: number;
  ultimaVisitaEm: string | null;
  ultimoPedidoEm: string | null;
  whatsapp: string | null;
  telefone: string | null;
  regiao: { nome: string; cor: string } | null;
  risco?: { nivel: string; pontos: number; motivos: string[] } | null;
}

const tomStatusCliente: Record<string, Tom> = {
  PROSPECT: "azul",
  ATIVO: "quitado",
  INATIVO: "neutro",
  EM_RISCO: "carimbo",
  BLOQUEADO: "carimbo",
  PERDIDO: "neutro",
};

export function CartaoCliente({ c, mostrarRisco }: { c: ClienteUI; mostrarRisco?: boolean }) {
  const wa = linkWhatsapp(
    c.whatsapp ?? c.telefone,
    `Olá! Aqui é o representante. Tudo bem por aí?`,
  );

  return (
    <div className="canhoto overflow-hidden">
      <Link href={`/clientes/${c.id}`} className="block p-3.5 active:bg-[color-mix(in_oklab,var(--color-tinta)_4%,transparent)]">
        <div className="flex items-start gap-3">
          <Avatar nome={c.nomeFantasia ?? c.razaoSocial} cor={c.regiao?.cor} tamanho={40} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className="text-[14.5px] font-semibold text-tinta leading-snug truncate flex-1">
                {c.nomeFantasia ?? c.razaoSocial}
              </p>
              <SeloCurva curva={c.curva} tamanho={20} />
            </div>

            <p className="text-[12px] text-tinta-3 mt-0.5 flex items-center gap-1 truncate">
              <Icone nome="pino" tamanho={11} />
              {c.cidade ? `${c.cidade}/${c.uf}` : "Sem endereço"}
              {c.regiao ? (
                <>
                  <span className="text-papel-borda">·</span>
                  <span style={{ color: c.regiao.cor }}>{c.regiao.nome}</span>
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Etiqueta tom={tomStatusCliente[c.status] ?? "neutro"}>{rotulo(c.status)}</Etiqueta>
              {c.qtdPedidos > 0 ? (
                <span className="text-[11.5px] text-tinta-3">
                  <span className="cifra text-tinta-2">{dinheiro(c.totalComprado)}</span> em{" "}
                  {c.qtdPedidos} {c.qtdPedidos === 1 ? "pedido" : "pedidos"}
                </span>
              ) : (
                <span className="text-[11.5px] text-tinta-3">Sem pedidos ainda</span>
              )}
            </div>

            {mostrarRisco && c.risco && c.risco.nivel !== "ok" ? (
              <div
                className={cx(
                  "mt-2.5 rounded-lg px-2.5 py-2 text-[12px] leading-snug",
                  c.risco.nivel === "critico"
                    ? "bg-carimbo-fundo text-carimbo"
                    : "bg-ambar-fundo text-ambar",
                )}
              >
                <span className="font-semibold flex items-center gap-1.5">
                  <Icone nome="fogo" tamanho={13} />
                  {c.risco.nivel === "critico" ? "Risco alto" : "Merece atenção"}
                </span>
                <span className="block mt-0.5 opacity-90">{c.risco.motivos[0]}</span>
              </div>
            ) : (
              <p className="text-[11.5px] text-tinta-3 mt-1.5">
                Última visita {tempoRelativo(c.ultimaVisitaEm)}
              </p>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-stretch border-t border-papel-borda divide-x divide-[var(--color-papel-borda)]">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
          >
            <Icone nome="whatsapp" tamanho={14} />
            WhatsApp
          </a>
        ) : null}
        <Link
          href={`/agenda?novo=1&cliente=${c.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
        >
          <Icone nome="calendarioMais" tamanho={14} />
          Agendar
        </Link>
        <Link
          href={`/pedidos/novo?cliente=${c.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-caneta active:bg-caneta-fundo"
        >
          <Icone nome="pedido" tamanho={14} />
          Pedido
        </Link>
      </div>
    </div>
  );
}

// ==================================================================
// Comissão
// ==================================================================

export interface ComissaoUI {
  id: string;
  descricao: string;
  competencia: string;
  vencimento: string;
  valorPrevisto: number;
  valorRecebido: number;
  valorLiquido: number;
  status: string;
  parcela: number;
  totalParcelas: number;
  representada: { nomeFantasia: string | null; razaoSocial: string; cor: string };
  pedido: { id: string; numero: string } | null;
}

export const tomComissao: Record<string, Tom> = {
  PREVISTA: "rosa",
  A_RECEBER: "amarela",
  VENCIDA: "carimbo",
  PARCIAL: "ambar",
  RECEBIDA: "quitado",
  GLOSADA: "neutro",
  CANCELADA: "neutro",
};

export function LinhaComissao({
  c,
  aoBaixar,
}: {
  c: ComissaoUI;
  aoBaixar?: (c: ComissaoUI) => void;
}) {
  const aberto = c.valorPrevisto - c.valorRecebido;
  const vencida = c.status === "VENCIDA";
  const recebida = c.status === "RECEBIDA";

  return (
    <div className={cx("canhoto p-3.5 relative overflow-hidden", recebida && "opacity-80")}>
      {recebida ? (
        <span className="absolute -right-2 top-3 pointer-events-none">
          <Carimbo tom="quitado">pago</Carimbo>
        </span>
      ) : null}
      {c.status === "GLOSADA" ? (
        <span className="absolute -right-3 top-3 pointer-events-none">
          <Carimbo tom="neutro">glosada</Carimbo>
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <span
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ background: c.representada.cor }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-tinta-3">
            {c.representada.nomeFantasia ?? c.representada.razaoSocial}
          </p>
          <p className="text-[14px] font-semibold text-tinta leading-snug mt-0.5 pr-16">
            {c.descricao}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Etiqueta tom={tomComissao[c.status] ?? "neutro"}>{rotulo(c.status)}</Etiqueta>
            <span
              className={cx(
                "text-[11.5px] flex items-center gap-1",
                vencida ? "text-carimbo font-semibold" : "text-tinta-3",
              )}
            >
              <Icone nome="relogio" tamanho={11} />
              {recebida ? "recebida" : "vence"} {dataBR(c.vencimento)}
              {vencida ? ` · ${tempoRelativo(c.vencimento)}` : ""}
            </span>
            {c.totalParcelas > 1 ? (
              <span className="text-[11.5px] text-tinta-3">
                {c.parcela}/{c.totalParcelas}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 mt-3 pt-3 border-t border-papel-borda">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-tinta-3 font-bold">
            {recebida ? "Recebido" : "Em aberto"}
          </p>
          <p
            className={cx(
              "cifra text-[18px] font-medium mt-0.5",
              vencida ? "text-carimbo" : recebida ? "text-quitado" : "text-tinta",
            )}
          >
            {dinheiro(recebida ? c.valorRecebido : aberto)}
          </p>
          {c.valorRecebido > 0 && !recebida ? (
            <p className="text-[11px] text-tinta-3 mt-0.5">
              já entrou <span className="cifra">{dinheiro(c.valorRecebido)}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {c.pedido ? (
            <Link
              href={`/pedidos/${c.pedido.id}`}
              className="botao botao-fantasma text-[12.5px] px-2.5 py-1.5"
            >
              {c.pedido.numero}
            </Link>
          ) : null}
          {!recebida && c.status !== "GLOSADA" && aoBaixar ? (
            <button
              type="button"
              onClick={() => aoBaixar(c)}
              className="botao botao-tinta text-[12.5px] px-3 py-1.5"
            >
              <Icone nome="carimboIcone" tamanho={14} />
              Dar baixa
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// Parada da rota
// ==================================================================

export interface ParadaUI {
  id: string;
  ordem: number;
  label: string;
  status: string;
  distanciaAnteriorKm: number;
  duracaoAnteriorMin: number;
  chegadaPrevista: string | null;
  permanenciaMin: number;
  cliente: { id: string; curva: "A" | "B" | "C" | "D"; cidade: string | null; uf: string | null } | null;
  lat: number;
  lng: number;
}

export function TrilhaParadas({ paradas, origem }: { paradas: ParadaUI[]; origem?: string }) {
  return (
    <ol className="relative">
      {origem ? (
        <li className="relative flex gap-3 pb-4">
          <span className="relative z-10 w-[26px] h-[26px] rounded-full grid place-items-center shrink-0 bg-papel-alto border-2 border-papel-borda text-tinta-3">
            <Icone nome="dia" tamanho={13} />
          </span>
          <span className="absolute left-[13px] top-[26px] bottom-0 w-[2px] bg-papel-borda" />
          <div className="pt-0.5 min-w-0">
            <p className="text-[13px] font-semibold text-tinta-2">{origem}</p>
            <p className="text-[11.5px] text-tinta-3">Saída</p>
          </div>
        </li>
      ) : null}

      {paradas.map((p, i) => {
        const ultimo = i === paradas.length - 1;
        const visitado = p.status === "VISITADO";
        const emRota = p.status === "EM_ROTA";

        return (
          <li key={p.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!ultimo ? (
              <span className="absolute left-[13px] top-[26px] bottom-0 w-[2px] bg-papel-borda" />
            ) : null}

            <span
              className={cx(
                "relative z-10 w-[26px] h-[26px] rounded-full grid place-items-center shrink-0 text-[11.5px] font-bold border-2",
                visitado
                  ? "bg-quitado border-quitado text-white"
                  : emRota
                    ? "bg-ambar border-ambar text-white"
                    : "bg-papel-alto border-caneta text-caneta",
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {visitado ? <Icone nome="check" tamanho={13} /> : p.ordem}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cx(
                      "text-[14px] font-semibold text-tinta leading-snug truncate",
                      visitado && "risco decoration-[var(--color-tinta-3)]",
                    )}
                  >
                    {p.cliente ? (
                      <Link href={`/clientes/${p.cliente.id}`} className="hover:text-caneta">
                        {p.label}
                      </Link>
                    ) : (
                      p.label
                    )}
                  </p>
                  <p className="text-[11.5px] text-tinta-3 mt-0.5 flex items-center flex-wrap gap-x-2">
                    {p.chegadaPrevista ? (
                      <span className="cifra">{hora(p.chegadaPrevista)}</span>
                    ) : null}
                    {p.distanciaAnteriorKm > 0 ? (
                      <span className="flex items-center gap-1">
                        <Icone nome="veiculo" tamanho={11} />
                        {km(p.distanciaAnteriorKm)} · {p.duracaoAnteriorMin} min
                      </span>
                    ) : null}
                    {p.cliente?.cidade ? <span>{p.cliente.cidade}</span> : null}
                  </p>
                </div>
                {p.cliente ? <SeloCurva curva={p.cliente.curva} tamanho={19} /> : null}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Navegar até ${p.label}`}
                  className="shrink-0 p-1.5 -mr-1 rounded-lg text-tinta-3 hover:text-caneta"
                >
                  <Icone nome="bussola" tamanho={16} />
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
