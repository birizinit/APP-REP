/**
 * Roteirizador.
 *
 * Camada de provedor: usa Google Directions/Distance Matrix quando existe
 * GOOGLE_MAPS_API_KEY, senao OSRM publico (gratis), e se a rede falhar cai
 * para calculo geodesico (haversine) com fator de sinuosidade — impreciso,
 * mas nunca deixa o representante na mao.
 *
 * Otimizacao: vizinho mais proximo + 2-opt sobre a matriz de custo do modo
 * escolhido (rapido = tempo, economico = distancia, equilibrado = dinheiro).
 */

export type ModoRota = "RAPIDO" | "ECONOMICO" | "EQUILIBRADO";

export interface Ponto {
  id: string;
  lat: number;
  lng: number;
  label: string;
  permanenciaMin?: number;
  fixo?: boolean;
  clientId?: string | null;
}

export interface Matriz {
  distancia: number[][]; // km
  duracao: number[][]; // minutos
  provider: "google" | "osrm" | "haversine";
}

export interface PerfilVeiculo {
  combustivel: "GASOLINA" | "ETANOL" | "DIESEL" | "GNV" | "ELETRICO";
  flex: boolean;
  consumoCidade: number;
  consumoEstrada: number;
  precoGasolina: number;
  precoEtanol: number;
  precoDiesel: number;
  precoKwh: number;
  custoManutencaoKm: number;
  pedagioMedioDia: number;
}

export const VEICULO_PADRAO: PerfilVeiculo = {
  combustivel: "GASOLINA",
  flex: false,
  consumoCidade: 10,
  consumoEstrada: 13,
  precoGasolina: 6.09,
  precoEtanol: 4.29,
  precoDiesel: 6.19,
  precoKwh: 0.95,
  custoManutencaoKm: 0.35,
  pedagioMedioDia: 0,
};

/** Quanto vale uma hora do representante — usado no modo equilibrado. */
const CUSTO_MINUTO_PADRAO = 0.6;

/** Acima disso a perna é considerada estrada (consumo melhor). */
const LIMITE_ESTRADA_KM = 15;

// ==================================================================
// Geometria
// ==================================================================

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ruas nao sao linha reta: fator tipico de malha urbana brasileira. */
const SINUOSIDADE = 1.32;

// ==================================================================
// Matriz de distancia
// ==================================================================

async function comTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "Representei/0.1" },
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

function matrizHaversine(pontos: Ponto[]): Matriz {
  const n = pontos.length;
  const distancia: number[][] = [];
  const duracao: number[][] = [];
  for (let i = 0; i < n; i++) {
    distancia[i] = [];
    duracao[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distancia[i][j] = 0;
        duracao[i][j] = 0;
        continue;
      }
      const km = haversine(pontos[i], pontos[j]) * SINUOSIDADE;
      distancia[i][j] = km;
      // velocidade media: 26 km/h no urbano curto, 62 km/h em trecho longo
      const velocidade = km > LIMITE_ESTRADA_KM ? 62 : 26;
      duracao[i][j] = (km / velocidade) * 60;
    }
  }
  return { distancia, duracao, provider: "haversine" };
}

async function matrizOsrm(pontos: Ponto[]): Promise<Matriz | null> {
  const base = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
  const coords = pontos.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${base}/table/v1/driving/${coords}?annotations=distance,duration`;
  try {
    const r = await comTimeout(url);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.code !== "Ok" || !j.distances || !j.durations) return null;
    return {
      distancia: (j.distances as number[][]).map((linha) => linha.map((m) => (m ?? 0) / 1000)),
      duracao: (j.durations as number[][]).map((linha) => linha.map((s) => (s ?? 0) / 60)),
      provider: "osrm",
    };
  } catch {
    return null;
  }
}

async function matrizGoogle(pontos: Ponto[]): Promise<Matriz | null> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  if (!chave) return null;
  // A Distance Matrix cobra por elemento; 25x25 é o teto por chamada.
  if (pontos.length > 25) return null;
  const locais = pontos.map((p) => `${p.lat},${p.lng}`).join("|");
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(locais)}` +
    `&destinations=${encodeURIComponent(locais)}&mode=driving&language=pt-BR&region=br&key=${chave}`;
  try {
    const r = await comTimeout(url);
    const j = await r.json();
    if (j.status !== "OK") return null;
    const distancia: number[][] = [];
    const duracao: number[][] = [];
    (j.rows as Array<{ elements: Array<Record<string, { value: number }> & { status: string }> }>).forEach(
      (linha, i) => {
        distancia[i] = [];
        duracao[i] = [];
        linha.elements.forEach((el, jx) => {
          const ok = el.status === "OK";
          distancia[i][jx] = ok ? (el.distance?.value ?? 0) / 1000 : haversine(pontos[i], pontos[jx]) * SINUOSIDADE;
          duracao[i][jx] = ok ? (el.duration?.value ?? 0) / 60 : (distancia[i][jx] / 30) * 60;
        });
      },
    );
    return { distancia, duracao, provider: "google" };
  } catch {
    return null;
  }
}

export async function calcularMatriz(pontos: Ponto[]): Promise<Matriz> {
  if (pontos.length < 2) return { distancia: [[0]], duracao: [[0]], provider: "haversine" };
  return (await matrizGoogle(pontos)) ?? (await matrizOsrm(pontos)) ?? matrizHaversine(pontos);
}

// ==================================================================
// Custo
// ==================================================================

/** No flex o etanol so compensa abaixo de ~70% do preco da gasolina. */
export function combustivelEscolhido(v: PerfilVeiculo): {
  tipo: "GASOLINA" | "ETANOL" | "DIESEL" | "GNV" | "ELETRICO";
  preco: number;
  dica: string | null;
} {
  if (v.combustivel === "DIESEL") return { tipo: "DIESEL", preco: v.precoDiesel, dica: null };
  if (v.combustivel === "ELETRICO") return { tipo: "ELETRICO", preco: v.precoKwh, dica: null };
  if (v.combustivel === "GNV") return { tipo: "GNV", preco: v.precoGasolina * 0.62, dica: null };

  if (!v.flex) {
    const preco = v.combustivel === "ETANOL" ? v.precoEtanol : v.precoGasolina;
    return { tipo: v.combustivel, preco, dica: null };
  }

  const proporcao = v.precoGasolina > 0 ? v.precoEtanol / v.precoGasolina : 1;
  if (proporcao <= 0.7) {
    return {
      tipo: "ETANOL",
      preco: v.precoEtanol,
      dica: `Etanol está a ${(proporcao * 100).toFixed(0)}% da gasolina — hoje compensa.`,
    };
  }
  return {
    tipo: "GASOLINA",
    preco: v.precoGasolina,
    dica: `Etanol a ${(proporcao * 100).toFixed(0)}% da gasolina — abasteça com gasolina.`,
  };
}

export interface CustoRota {
  distanciaKm: number;
  duracaoMin: number;
  litros: number;
  precoLitro: number;
  combustivel: string;
  custoCombustivel: number;
  custoManutencao: number;
  custoPedagio: number;
  custoTotal: number;
  custoPorKm: number;
  dicaCombustivel: string | null;
}

/** Consumo por perna: trecho longo gasta menos por km do que o urbano. */
export function calcularCusto(
  pernas: Array<{ km: number }>,
  veiculo: PerfilVeiculo,
  duracaoMin: number,
): CustoRota {
  const { tipo, preco, dica } = combustivelEscolhido(veiculo);
  const fatorEtanol = tipo === "ETANOL" && veiculo.flex ? 0.72 : 1; // etanol rende ~28% menos

  let litros = 0;
  let distanciaKm = 0;
  for (const perna of pernas) {
    const km = Math.max(0, perna.km);
    distanciaKm += km;
    const base = km > LIMITE_ESTRADA_KM ? veiculo.consumoEstrada : veiculo.consumoCidade;
    const consumo = Math.max(1, base * fatorEtanol);
    litros += km / consumo;
  }

  const custoCombustivel = litros * preco;
  const custoManutencao = distanciaKm * veiculo.custoManutencaoKm;
  const custoPedagio = veiculo.pedagioMedioDia;
  const custoTotal = custoCombustivel + custoManutencao + custoPedagio;

  return {
    distanciaKm,
    duracaoMin,
    litros,
    precoLitro: preco,
    combustivel: tipo,
    custoCombustivel,
    custoManutencao,
    custoPedagio,
    custoTotal,
    custoPorKm: distanciaKm > 0 ? custoTotal / distanciaKm : 0,
    dicaCombustivel: dica,
  };
}

// ==================================================================
// Otimizacao
// ==================================================================

function matrizDeCusto(m: Matriz, modo: ModoRota, veiculo: PerfilVeiculo): number[][] {
  const { preco } = combustivelEscolhido(veiculo);
  const custoKm = preco / Math.max(1, veiculo.consumoCidade) + veiculo.custoManutencaoKm;

  return m.distancia.map((linha, i) =>
    linha.map((km, j) => {
      const min = m.duracao[i]?.[j] ?? 0;
      if (modo === "RAPIDO") return min;
      if (modo === "ECONOMICO") return km;
      return km * custoKm + min * CUSTO_MINUTO_PADRAO;
    }),
  );
}

function custoDoCaminho(ordem: number[], custo: number[][], voltaAoInicio: boolean): number {
  let total = 0;
  for (let i = 0; i < ordem.length - 1; i++) total += custo[ordem[i]][ordem[i + 1]];
  if (voltaAoInicio && ordem.length > 1) total += custo[ordem[ordem.length - 1]][ordem[0]];
  return total;
}

/**
 * Vizinho mais proximo a partir da origem (indice 0) e refino 2-opt.
 * Paradas marcadas como fixas mantem a posicao original.
 */
export function otimizarOrdem(
  custo: number[][],
  opcoes: { voltaAoInicio?: boolean; fixos?: number[] } = {},
): number[] {
  const n = custo.length;
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);
  const voltaAoInicio = opcoes.voltaAoInicio ?? true;
  const fixos = new Set(opcoes.fixos ?? []);

  // --- vizinho mais proximo ---
  const visitado = new Array(n).fill(false);
  const ordem = [0];
  visitado[0] = true;
  for (let passo = 1; passo < n; passo++) {
    let melhor = -1;
    let melhorCusto = Infinity;
    const atual = ordem[ordem.length - 1];
    for (let j = 1; j < n; j++) {
      if (visitado[j]) continue;
      if (custo[atual][j] < melhorCusto) {
        melhorCusto = custo[atual][j];
        melhor = j;
      }
    }
    if (melhor === -1) break;
    ordem.push(melhor);
    visitado[melhor] = true;
  }

  // --- 2-opt ---
  let melhorou = true;
  let voltas = 0;
  while (melhorou && voltas < 80) {
    melhorou = false;
    voltas++;
    for (let i = 1; i < ordem.length - 1; i++) {
      for (let k = i + 1; k < ordem.length; k++) {
        if (fixos.has(ordem[i]) || fixos.has(ordem[k])) continue;
        const candidato = [
          ...ordem.slice(0, i),
          ...ordem.slice(i, k + 1).reverse(),
          ...ordem.slice(k + 1),
        ];
        if (custoDoCaminho(candidato, custo, voltaAoInicio) < custoDoCaminho(ordem, custo, voltaAoInicio) - 1e-9) {
          ordem.splice(0, ordem.length, ...candidato);
          melhorou = true;
        }
      }
    }
  }

  return ordem;
}

// ==================================================================
// Geometria do traçado (para desenhar no mapa)
// ==================================================================

/** Decodifica polyline do Google/OSRM (precisao 5). */
export function decodificarPolyline(texto: string, precisao = 5): Array<[number, number]> {
  const fator = Math.pow(10, precisao);
  const coords: Array<[number, number]> = [];
  let indice = 0;
  let lat = 0;
  let lng = 0;

  while (indice < texto.length) {
    let resultado = 1;
    let deslocamento = 0;
    let b: number;
    do {
      b = texto.charCodeAt(indice++) - 63 - 1;
      resultado += b << deslocamento;
      deslocamento += 5;
    } while (b >= 0x1f);
    lat += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    resultado = 1;
    deslocamento = 0;
    do {
      b = texto.charCodeAt(indice++) - 63 - 1;
      resultado += b << deslocamento;
      deslocamento += 5;
    } while (b >= 0x1f);
    lng += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    coords.push([lat / fator, lng / fator]);
  }
  return coords;
}

export async function tracarCaminho(pontos: Ponto[]): Promise<string | null> {
  if (pontos.length < 2) return null;
  const base = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
  const coords = pontos.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const r = await comTimeout(`${base}/route/v1/driving/${coords}?overview=full&geometries=polyline`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.code !== "Ok") return null;
    return j.routes?.[0]?.geometry ?? null;
  } catch {
    return null;
  }
}

// ==================================================================
// Montagem da rota
// ==================================================================

export interface ParadaCalculada {
  id: string;
  clientId?: string | null;
  label: string;
  lat: number;
  lng: number;
  ordem: number;
  distanciaAnteriorKm: number;
  duracaoAnteriorMin: number;
  permanenciaMin: number;
  chegadaPrevista: Date;
  saidaPrevista: Date;
  fixo: boolean;
}

export interface RotaCalculada {
  paradas: ParadaCalculada[];
  custo: CustoRota;
  provider: string;
  polyline: string | null;
  kmEconomizados: number;
  reaisEconomizados: number;
  horaFim: Date;
  estouraJornada: boolean;
}

export interface OpcoesRota {
  origem: Ponto;
  paradas: Ponto[];
  modo: ModoRota;
  veiculo?: PerfilVeiculo;
  retornaBase?: boolean;
  inicio: Date;
  jornadaFim?: string; // "18:00"
  almocoInicio?: string; // "12:00"
  almocoMinutos?: number;
  otimizar?: boolean;
}

function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Monta a rota completa: ordena, calcula custo e projeta os horarios. */
export async function montarRota(opcoes: OpcoesRota): Promise<RotaCalculada> {
  const veiculo = opcoes.veiculo ?? VEICULO_PADRAO;
  const retorna = opcoes.retornaBase ?? true;
  const pontos: Ponto[] = [opcoes.origem, ...opcoes.paradas];

  const matriz = await calcularMatriz(pontos);
  const custo = matrizDeCusto(matriz, opcoes.modo, veiculo);

  const fixos = pontos.map((p, i) => (p.fixo ? i : -1)).filter((i) => i > 0);
  const ordemOriginal = Array.from({ length: pontos.length }, (_, i) => i);
  const ordem =
    opcoes.otimizar === false
      ? ordemOriginal
      : otimizarOrdem(custo, { voltaAoInicio: retorna, fixos });

  // --- pernas na ordem final ---
  const pernas: Array<{ km: number; min: number }> = [];
  for (let i = 0; i < ordem.length - 1; i++) {
    pernas.push({
      km: matriz.distancia[ordem[i]][ordem[i + 1]],
      min: matriz.duracao[ordem[i]][ordem[i + 1]],
    });
  }
  if (retorna && ordem.length > 1) {
    pernas.push({
      km: matriz.distancia[ordem[ordem.length - 1]][ordem[0]],
      min: matriz.duracao[ordem[ordem.length - 1]][ordem[0]],
    });
  }

  const duracaoDeslocamento = pernas.reduce((s, p) => s + p.min, 0);
  const resultado = calcularCusto(pernas, veiculo, duracaoDeslocamento);

  // --- comparativo com a ordem em que foram adicionadas ---
  const pernasOriginais: Array<{ km: number }> = [];
  for (let i = 0; i < ordemOriginal.length - 1; i++) {
    pernasOriginais.push({ km: matriz.distancia[ordemOriginal[i]][ordemOriginal[i + 1]] });
  }
  if (retorna && ordemOriginal.length > 1) {
    pernasOriginais.push({
      km: matriz.distancia[ordemOriginal[ordemOriginal.length - 1]][ordemOriginal[0]],
    });
  }
  const kmOriginal = pernasOriginais.reduce((s, p) => s + p.km, 0);
  const kmEconomizados = Math.max(0, kmOriginal - resultado.distanciaKm);
  const reaisEconomizados = kmEconomizados * (resultado.custoPorKm || 0);

  // --- horarios previstos ---
  const almocoIni = opcoes.almocoInicio ? minutosDe(opcoes.almocoInicio) : null;
  const almocoMin = opcoes.almocoMinutos ?? 0;
  let almocoUsado = false;

  let relogio = new Date(opcoes.inicio);
  const paradas: ParadaCalculada[] = [];

  for (let i = 1; i < ordem.length; i++) {
    const idx = ordem[i];
    const ponto = pontos[idx];
    const perna = pernas[i - 1];

    relogio = new Date(relogio.getTime() + perna.min * 60_000);

    // encaixa o almoco quando a chegada cai dentro da janela
    if (almocoIni !== null && !almocoUsado) {
      const minutosDoDia = relogio.getHours() * 60 + relogio.getMinutes();
      if (minutosDoDia >= almocoIni) {
        relogio = new Date(relogio.getTime() + almocoMin * 60_000);
        almocoUsado = true;
      }
    }

    const chegada = new Date(relogio);
    const permanencia = ponto.permanenciaMin ?? 40;
    relogio = new Date(relogio.getTime() + permanencia * 60_000);

    paradas.push({
      id: ponto.id,
      clientId: ponto.clientId ?? null,
      label: ponto.label,
      lat: ponto.lat,
      lng: ponto.lng,
      ordem: i,
      distanciaAnteriorKm: perna.km,
      duracaoAnteriorMin: Math.round(perna.min),
      permanenciaMin: permanencia,
      chegadaPrevista: chegada,
      saidaPrevista: new Date(relogio),
      fixo: Boolean(ponto.fixo),
    });
  }

  let horaFim = new Date(relogio);
  if (retorna && pernas.length > 0) {
    horaFim = new Date(horaFim.getTime() + pernas[pernas.length - 1].min * 60_000);
  }

  const limite = opcoes.jornadaFim ? minutosDe(opcoes.jornadaFim) : null;
  const estouraJornada =
    limite !== null && horaFim.getHours() * 60 + horaFim.getMinutes() > limite;

  const polyline = await tracarCaminho(
    retorna ? [...ordem.map((i) => pontos[i]), pontos[ordem[0]]] : ordem.map((i) => pontos[i]),
  );

  return {
    paradas,
    custo: resultado,
    provider: matriz.provider,
    polyline,
    kmEconomizados,
    reaisEconomizados,
    horaFim,
    estouraJornada,
  };
}

// ==================================================================
// Navegacao externa
// ==================================================================

/** Abre a rota inteira no Google Maps (ate 9 waypoints, limite deles). */
export function linkGoogleMaps(pontos: Array<{ lat: number; lng: number }>): string {
  if (pontos.length === 0) return "https://www.google.com/maps";
  const origem = `${pontos[0].lat},${pontos[0].lng}`;
  const destino = `${pontos[pontos.length - 1].lat},${pontos[pontos.length - 1].lng}`;
  const meio = pontos
    .slice(1, -1)
    .slice(0, 9)
    .map((p) => `${p.lat},${p.lng}`)
    .join("|");
  const waypoints = meio ? `&waypoints=${encodeURIComponent(meio)}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}${waypoints}&travelmode=driving`;
}

export function linkWaze(ponto: { lat: number; lng: number }): string {
  return `https://waze.com/ul?ll=${ponto.lat},${ponto.lng}&navigate=yes`;
}
