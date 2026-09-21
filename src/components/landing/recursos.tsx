"use client";

import { useEffect, useState } from "react";

import { Icone, type NomeIcone } from "@/components/icone";
import { Contador, fmt, movimentoReduzido, preenchido, seguirMouse, useNaTela } from "@/components/landing/uteis";

// ==================================================================
// RECURSOS — bento com uma microinteração por cartão
// ==================================================================

function Cartao({
  className,
  icone,
  titulo,
  texto,
  children,
  atraso = 0,
  emCima = false,
}: {
  className?: string;
  icone: NomeIcone;
  titulo: string;
  texto: string;
  children?: React.ReactNode;
  atraso?: number;
  emCima?: boolean;
}) {
  return (
    <article
      className={`lp-bento canhoto p-5 sm:p-6 flex flex-col ${className ?? ""}`}
      onPointerMove={seguirMouse}
      data-rv
      data-rv-grupo
      style={{ "--rv-atraso": `${atraso}s` } as React.CSSProperties}
    >
      <span className="w-10 h-10 rounded-xl grid place-items-center bg-caneta-fundo text-caneta">
        <Icone nome={icone} tamanho={19} />
      </span>
      <h3 className="font-display font-bold text-[20px] tracking-[-0.03em] text-tinta mt-4 leading-tight">{titulo}</h3>
      <p className="text-[14.5px] text-tinta-2 mt-2 leading-relaxed">{texto}</p>
      {children ? <div className={`mt-5 flex-1 flex flex-col ${emCima ? "justify-start" : "justify-end"}`}>{children}</div> : null}
    </article>
  );
}

export function Recursos() {
  return (
    <section id="recursos" className="py-20 md:py-28 scroll-mt-16" aria-labelledby="lp-rec">
      <div className="lp-wrap">
        <div className="max-w-[760px]" data-rv>
          <p className="carimbo text-quitado">o que tem dentro</p>
          <h2 id="lp-rec" className="lp-titulo text-[36px] sm:text-[52px] mt-4">
            Tudo que o caderno fazia. <span className="text-caneta">E o que ele nunca fez.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-6 gap-4 mt-12">
          <Cartao
            className="md:col-span-3 md:row-span-2"
            emCima
            icone="comissao"
            titulo="Comissão conferida, parcela por parcela"
            texto="Cadastre o acordo de cada representada — base bruta, líquida ou no pagamento, percentual fixo, por faixa ou por linha. O app gera as parcelas e marca o que venceu."
          >
            <ParcelasCarimbo />
          </Cartao>

          <Cartao
            className="md:col-span-3"
            icone="rota"
            titulo="Três rotas de uma vez"
            texto="Mais rápida, mais barata ou equilibrada — que soma combustível e o valor da sua hora. Você escolhe."
            atraso={0.06}
          >
            <TresRotas />
          </Cartao>

          <Cartao
            className="md:col-span-3"
            icone="clientes"
            titulo="Ficha do cliente pelo CNPJ"
            texto="Digite o CNPJ: razão social, endereço, CNAE e situação vêm da Receita. O endereço vira ponto no mapa."
            atraso={0.12}
          >
            <CnpjDigitando />
          </Cartao>

          <Cartao
            className="md:col-span-2"
            icone="alerta"
            titulo="Aviso antes do cliente sumir"
            texto="Curva ABC automática e alerta de quem passou do prazo de visita ou parou de comprar."
          >
            <CurvaAbc />
          </Cartao>

          <Cartao
            className="md:col-span-2"
            icone="sino"
            titulo="Notificação no celular"
            texto="Rota do dia, 30 min antes da visita, 3 dias antes da comissão vencer."
            atraso={0.06}
          >
            <Avisos />
          </Cartao>

          <Cartao
            className="md:col-span-2"
            icone="grafico"
            titulo="Previsão de caixa"
            texto="Quanto cai na conta nos próximos seis meses, por representada."
            atraso={0.12}
          >
            <PrevisaoCaixa />
          </Cartao>

          <Cartao
            className="md:col-span-3"
            icone="pedido"
            titulo="Quanto 1% de desconto te custa"
            texto="Enquanto você lança o pedido, o app mostra a comissão, as parcelas e o que cada ponto de desconto tira do seu bolso."
          >
            <Desconto />
          </Cartao>

          <Cartao
            className="md:col-span-3"
            icone="importar"
            titulo="Traga o que você já tem"
            texto="Planilha de clientes ou pedidos (.xlsx, .csv) e até o PDF de pedido da fábrica. O app adivinha as colunas e mostra a prévia antes de gravar."
            atraso={0.06}
          >
            <div className="flex flex-wrap gap-2">
              {[
                { i: "planilha" as const, t: "clientes.xlsx" },
                { i: "planilha" as const, t: "pedidos.csv" },
                { i: "pdf" as const, t: "pedido-fabrica.pdf" },
              ].map((a, k) => (
                <span
                  key={a.t}
                  className="lp-flutua inline-flex items-center gap-2 rounded-lg border border-papel-borda bg-papel px-3 py-2 text-[13px] font-medium text-tinta"
                  style={{ animationDelay: `${-k * 1.3}s` }}
                >
                  <span className="text-caneta"><Icone nome={a.i} tamanho={16} /></span>
                  {a.t}
                </span>
              ))}
            </div>
          </Cartao>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10 text-[14px] text-tinta-2" data-rv>
          {[
            { i: "localizar" as const, t: "Check-in com prova de localização" },
            { i: "agenda" as const, t: "Sugestão automática da semana" },
            { i: "whatsapp" as const, t: "WhatsApp com mensagem pronta" },
            { i: "dia" as const, t: "Modo estrada para a noite" },
          ].map((x) => (
            <span key={x.t} className="flex items-center gap-2">
              <span className="text-caneta"><Icone nome={x.i} tamanho={17} /></span>
              {x.t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- microinterações ----------------

type Status = "a receber" | "pago" | "vencido";
const PARCELAS_INICIAIS: { rep: string; venc: string; valor: number; status: Status }[] = [
  { rep: "Indústria Alfa", venc: "05/10", valor: 1840, status: "a receber" },
  { rep: "Plásticos Beta", venc: "10/10", valor: 960, status: "a receber" },
  { rep: "Metalúrgica Gama", venc: "28/09", valor: 1320, status: "a receber" },
  { rep: "Têxtil Delta", venc: "15/10", valor: 2410, status: "a receber" },
];
const RESULTADO: Status[] = ["pago", "pago", "vencido", "a receber"];

function ParcelasCarimbo() {
  const [parcelas, setParcelas] = useState(PARCELAS_INICIAIS);
  const [passou, setPassou] = useState(false);

  function passarRegua() {
    if (passou) {
      setParcelas(PARCELAS_INICIAIS);
      setPassou(false);
      return;
    }
    setPassou(true);
    RESULTADO.forEach((st, i) => {
      setTimeout(() => {
        setParcelas((atual) => atual.map((p, k) => (k === i ? { ...p, status: st } : p)));
      }, 180 + i * 260);
    });
  }

  const recebido = parcelas.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0);
  const vencido = parcelas.filter((p) => p.status === "vencido").reduce((s, p) => s + p.valor, 0);

  return (
    <div>
      <ul className="rounded-xl border border-papel-borda bg-papel divide-y divide-dashed divide-papel-borda">
        {parcelas.map((p) => (
          <li key={p.rep} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-tinta truncate">{p.rep}</p>
              <p className="text-[12px] text-tinta-3">vence {p.venc}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="cifra text-[14px]">{fmt.reais(p.valor)}</span>
              <span
                key={p.status}
                className={`carimbo !text-[9.5px] w-[78px] justify-center ${p.status === "a receber" ? "text-tinta-3 !rotate-0" : "carimbo-batendo"} ${
                  p.status === "pago" ? "text-quitado" : p.status === "vencido" ? "text-carimbo" : ""
                }`}
              >
                {p.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-[13px] text-tinta-2">
          Recebido <strong className="text-quitado cifra">{fmt.reais(recebido)}</strong> · vencido{" "}
          <strong className="text-carimbo cifra">{fmt.reais(vencido)}</strong>
        </p>
        <button type="button" onClick={passarRegua} className="botao botao-tinta !h-[42px] !px-4 text-[14px]">
          <Icone nome={passou ? "atualizar" : "carimboIcone"} tamanho={16} />
          {passou ? "De novo" : "Passar a régua"}
        </button>
      </div>
    </div>
  );
}

const MODOS = [
  { id: "rapido", rotulo: "Mais rápida", km: 168, min: 214, reais: 118.4 },
  { id: "barata", rotulo: "Mais barata", km: 142, min: 246, reais: 96.3 },
  { id: "equil", rotulo: "Equilibrada", km: 151, min: 225, reais: 103.1 },
] as const;

function TresRotas() {
  const [modo, setModo] = useState(1);
  const m = MODOS[modo];
  return (
    <div>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-papel border border-papel-borda" role="tablist" aria-label="Modo da rota">
        {MODOS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={i === modo}
            onClick={() => setModo(i)}
            className={`h-9 rounded-lg text-[13px] font-semibold transition-all ${
              i === modo ? "bg-caneta text-white shadow-[var(--shadow-grampo)]" : "text-tinta-2 hover:text-tinta"
            }`}
          >
            {x.rotulo}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <div>
          <p className="numeral text-[24px] text-tinta"><Contador valor={m.km} duracao={500} /> km</p>
          <p className="text-[11.5px] text-tinta-3">distância</p>
        </div>
        <div>
          <p className="numeral text-[24px] text-tinta">{Math.floor(m.min / 60)}h{String(m.min % 60).padStart(2, "0")}</p>
          <p className="text-[11.5px] text-tinta-3">no volante</p>
        </div>
        <div>
          <p className="numeral text-[24px] text-quitado"><Contador valor={m.reais} formato={fmt.centavos} duracao={500} /></p>
          <p className="text-[11.5px] text-tinta-3">combustível</p>
        </div>
      </div>
      <p className="text-[11px] text-tinta-3 mt-3 text-center">exemplo com 7 visitas</p>
    </div>
  );
}

const CNPJ = "12.345.678/0001-90";
const CAMPOS = [
  ["Razão social", "Comercial Exemplo Ltda"],
  ["Endereço", "Av. Brasil, 1500 · Campinas/SP"],
  ["CNAE", "4649-4 · atacado de artigos domésticos"],
] as const;

function CnpjDigitando() {
  const { ref, visto } = useNaTela<HTMLDivElement>(0.4);
  const [n, setN] = useState(0);
  const [campos, setCampos] = useState(0);

  useEffect(() => {
    if (!visto) return;
    if (movimentoReduzido()) {
      setN(CNPJ.length);
      setCampos(CAMPOS.length + 1);
      return;
    }
    let vivo = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ciclo = () => {
      setN(0);
      setCampos(0);
      for (let i = 1; i <= CNPJ.length; i++) timers.push(setTimeout(() => vivo && setN(i), i * 70));
      const fim = CNPJ.length * 70 + 300;
      for (let k = 1; k <= CAMPOS.length + 1; k++) timers.push(setTimeout(() => vivo && setCampos(k), fim + k * 320));
      timers.push(setTimeout(() => vivo && ciclo(), fim + 5200));
    };
    ciclo();
    return () => {
      vivo = false;
      timers.forEach(clearTimeout);
    };
  }, [visto]);

  return (
    <div ref={ref} className="rounded-xl border border-papel-borda bg-papel p-4">
      <p className="rotulo !mb-1.5">CNPJ</p>
      <p className={`cifra text-[17px] text-tinta ${n < CNPJ.length ? "lp-digitando" : ""}`}>{CNPJ.slice(0, n) || " "}</p>
      <div className="mt-3 space-y-2">
        {CAMPOS.map(([rot, val], i) => (
          <div key={rot} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-tinta-3 shrink-0">{rot}</span>
            <span className={`text-right text-tinta font-medium truncate transition-all duration-500 ${campos > i ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}>
              {val}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-tinta-3">Situação</span>
          {campos > CAMPOS.length ? (
            <span className="carimbo carimbo-batendo text-quitado !text-[10px]">ativa</span>
          ) : (
            <span className="h-[22px]" />
          )}
        </div>
      </div>
    </div>
  );
}

function CurvaAbc() {
  const barras = [
    { c: "A", h: 88, cor: "var(--color-curva-a)" },
    { c: "B", h: 58, cor: "var(--color-curva-b)" },
    { c: "C", h: 34, cor: "var(--color-curva-c)" },
    { c: "D", h: 16, cor: "var(--color-curva-d)" },
  ];
  return (
    <div>
      <div className="flex items-end gap-3 h-[92px]">
        {barras.map((b, i) => (
          <div key={b.c} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div
              className="lp-barra-cresce w-full rounded-t-md"
              style={{ height: `${b.h}%`, background: b.cor, transitionDelay: `${i * 0.1}s` }}
            />
            <span className="text-[12px] font-bold text-tinta-2">{b.c}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] rounded-lg bg-carimbo-fundo text-carimbo px-3 py-2 flex items-center gap-1.5">
        <Icone nome="alerta" tamanho={14} />
        Mercado Sol (A) não compra há 47 dias
      </p>
    </div>
  );
}

function Avisos() {
  const lista = [
    { i: "rota" as const, t: "Rota de hoje pronta · 7 visitas" },
    { i: "relogio" as const, t: "Visita na Casa Lima em 30 min" },
    { i: "cofre" as const, t: "Comissão da Beta vence em 3 dias" },
  ];
  return (
    <div className="relative h-[118px]">
      {lista.map((a, i) => (
        <div
          key={a.t}
          className="lp-notif absolute inset-x-0 rounded-xl border border-papel-borda bg-papel-alto shadow-[var(--shadow-papel)] px-3 py-2.5 flex items-center gap-2.5"
          style={{ top: `${i * 38}px`, "--n-atraso": `${i * 0.5}s` } as React.CSSProperties}
        >
          <span className="w-7 h-7 rounded-lg grid place-items-center bg-caneta-fundo text-caneta shrink-0">
            <Icone nome={a.i} tamanho={14} />
          </span>
          <p className="text-[12.5px] font-medium text-tinta truncate">{a.t}</p>
        </div>
      ))}
    </div>
  );
}

function PrevisaoCaixa() {
  const meses = [
    { m: "out", v: 62 },
    { m: "nov", v: 78 },
    { m: "dez", v: 70 },
    { m: "jan", v: 48 },
    { m: "fev", v: 66 },
    { m: "mar", v: 90 },
  ];
  return (
    <div className="flex items-end gap-2 h-[110px]">
      {meses.map((x, i) => (
        <div key={x.m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <div
            className="lp-barra-cresce w-full rounded-t-md bg-graf-receber"
            style={{ height: `${x.v}%`, transitionDelay: `${i * 0.08}s` }}
          />
          <span className="text-[11px] text-tinta-3">{x.m}</span>
        </div>
      ))}
    </div>
  );
}

function Desconto() {
  const PEDIDO = 10_000;
  const TAXA = 0.05;
  const [desc, setDesc] = useState(5);
  const comissao = PEDIDO * (1 - desc / 100) * TAXA;
  const perdido = PEDIDO * TAXA - comissao;
  return (
    <div className="rounded-xl border border-papel-borda bg-papel p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-tinta-2">Desconto no pedido de {fmt.reais(PEDIDO)}</span>
        <span className="cifra text-[15px] text-tinta">{desc}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={15}
        step={1}
        value={desc}
        onChange={(e) => setDesc(Number(e.target.value))}
        className="lp-slider mt-3"
        style={preenchido(desc, 0, 15)}
        aria-label="Desconto no pedido"
        aria-valuetext={`${desc}%`}
      />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-[11.5px] text-tinta-3">Sua comissão (5%)</p>
          <p className="numeral text-[22px] text-tinta"><Contador valor={comissao} formato={fmt.centavos} duracao={350} /></p>
        </div>
        <div>
          <p className="text-[11.5px] text-tinta-3">Saiu do seu bolso</p>
          <p className="numeral text-[22px] text-carimbo">−<Contador valor={perdido} formato={fmt.centavos} duracao={350} /></p>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// ETANOL OU GASOLINA
// ==================================================================

export function Flex() {
  const [gas, setGas] = useState(6.19);
  const [eta, setEta] = useState(4.09);
  const razao = eta / gas;
  const etanol = razao <= 0.7;

  return (
    <section className="pb-20 md:pb-28" aria-labelledby="lp-flex">
      <div className="lp-wrap">
        <div className="canhoto picote overflow-hidden grid md:grid-cols-[1.1fr_1fr]" data-rv="zoom">
          <div className="p-6 sm:p-9">
            <p className="rotulo">Carro flex?</p>
            <h2 id="lp-flex" className="lp-titulo text-[30px] sm:text-[40px] mt-1">
              Etanol ou gasolina hoje?
            </h2>
            <p className="text-[15.5px] text-tinta-2 mt-3 leading-relaxed max-w-[42ch]">
              Coloque o preço do posto. No app a conta usa o consumo do <em>seu</em> carro na cidade e na estrada.
            </p>
            <div className="space-y-6 mt-8">
              <label className="block">
                <span className="flex justify-between text-[13.5px] font-semibold text-tinta-2">
                  Gasolina <span className="cifra text-tinta">{fmt.centavos(gas)}</span>
                </span>
                <input type="range" className="lp-slider mt-3" min={4} max={8} step={0.01} value={gas} style={preenchido(gas, 4, 8)} onChange={(e) => setGas(Number(e.target.value))} aria-label="Preço da gasolina" />
              </label>
              <label className="block">
                <span className="flex justify-between text-[13.5px] font-semibold text-tinta-2">
                  Etanol <span className="cifra text-tinta">{fmt.centavos(eta)}</span>
                </span>
                <input type="range" className="lp-slider mt-3" min={2.5} max={6.5} step={0.01} value={eta} style={preenchido(eta, 2.5, 6.5)} onChange={(e) => setEta(Number(e.target.value))} aria-label="Preço do etanol" />
              </label>
            </div>
          </div>
          <div
            className={`p-6 sm:p-9 flex flex-col items-center justify-center text-center transition-colors duration-500 ${
              etanol ? "bg-quitado-fundo" : "bg-ambar-fundo"
            }`}
            aria-live="polite"
          >
            <p className="text-[13px] font-semibold text-tinta-2">Etanol custa</p>
            <p className="numeral text-[56px] leading-none text-tinta mt-1">{fmt.inteiro(razao * 100)}%</p>
            <p className="text-[13px] text-tinta-3">da gasolina (a referência é 70%)</p>
            <span key={String(etanol)} className={`carimbo carimbo-grande carimbo-batendo mt-7 ${etanol ? "text-quitado" : "text-ambar"}`}>
              {etanol ? "abasteça etanol" : "abasteça gasolina"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================================================================
// COMPARATIVO
// ==================================================================

const LINHAS = [
  "Confere a comissão contra o acordo de cada representada",
  "Avisa três dias antes da comissão vencer",
  "Ordena a rota pelo custo real do carro",
  "Diz quem está sumindo da carteira",
  "Mostra quanto vai cair na conta nos próximos meses",
  "Registra glosa com motivo, para você cobrar",
];

export function Comparativo() {
  return (
    <section className="pb-20 md:pb-28" aria-labelledby="lp-comp">
      <div className="lp-wrap">
        <h2 id="lp-comp" className="lp-titulo text-[32px] sm:text-[44px] text-center" data-rv>
          Caderno, planilha e WhatsApp <span className="text-tinta-3">vs.</span> <span className="text-caneta">Representei</span>
        </h2>
        <div className="canhoto mt-10 overflow-hidden max-w-[900px] mx-auto" data-rv>
          <div className="grid grid-cols-[1fr_76px_76px] sm:grid-cols-[1fr_130px_130px] items-center px-4 sm:px-6 py-3 border-b border-papel-borda text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.1em] text-tinta-3">
            <span>O que precisa</span>
            <span className="text-center">Do jeito antigo</span>
            <span className="text-center text-caneta">Representei</span>
          </div>
          {LINHAS.map((l, i) => (
            <div
              key={l}
              className="grid grid-cols-[1fr_76px_76px] sm:grid-cols-[1fr_130px_130px] items-center px-4 sm:px-6 py-3.5 border-b border-dashed border-papel-borda last:border-b-0"
              data-rv
              style={{ "--rv-atraso": `${i * 0.06}s` } as React.CSSProperties}
            >
              <span className="text-[14.5px] text-tinta pr-3">{l}</span>
              <span className="flex justify-center text-carimbo"><Icone nome="fechar" tamanho={19} /></span>
              <span className="flex justify-center">
                <span className="w-7 h-7 rounded-full grid place-items-center bg-quitado text-papel-alto">
                  <Icone nome="check" tamanho={16} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
