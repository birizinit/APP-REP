/**
 * Consultas externas: CNPJ, CEP e geocodificacao.
 * Tudo com fallback e timeout — em campo a rede cai.
 */

import { soDigitos, validarCnpj } from "@/lib/format";

const TIMEOUT = 9000;

async function buscar(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "Representei/0.1",
        ...(init?.headers ?? {}),
      },
      next: { revalidate: 60 * 60 * 24 },
    });
  } finally {
    clearTimeout(t);
  }
}

// ==================================================================
// CNPJ
// ==================================================================

export interface FichaCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  naturezaJuridica: string | null;
  porte: string | null;
  cnaePrincipal: string | null;
  cnaeDescricao: string | null;
  dataAbertura: string | null;
  capitalSocial: number | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  socios: Array<{ nome: string; qualificacao: string | null }>;
  fonte: string;
}

function textoOuNulo(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 && s !== "null" ? s : null;
}

/** Consulta a ficha do CNPJ na BrasilAPI, com ReceitaWS de reserva. */
export async function consultarCnpj(entrada: string): Promise<FichaCnpj> {
  const cnpj = soDigitos(entrada);

  if (cnpj.length !== 14) throw new Error("CNPJ precisa ter 14 dígitos.");
  if (!validarCnpj(cnpj)) throw new Error("CNPJ inválido — confira os dígitos.");

  try {
    const r = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (r.ok) return daBrasilApi(await r.json(), cnpj);
    if (r.status === 404) throw new Error("CNPJ não encontrado na Receita Federal.");
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes("não encontrado")) throw erro;
  }

  // Reserva: ReceitaWS (limite de 3 consultas/minuto)
  try {
    const r = await buscar(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
    if (r.ok) {
      const j = await r.json();
      if (j.status !== "ERROR") return daReceitaWs(j, cnpj);
    }
  } catch {
    // segue para o erro final
  }

  throw new Error("Não consegui consultar o CNPJ agora. Tente de novo em instantes.");
}

function daBrasilApi(j: Record<string, unknown>, cnpj: string): FichaCnpj {
  const qsa = Array.isArray(j.qsa) ? (j.qsa as Record<string, unknown>[]) : [];
  return {
    cnpj,
    razaoSocial: textoOuNulo(j.razao_social) ?? "",
    nomeFantasia: textoOuNulo(j.nome_fantasia),
    situacaoCadastral: textoOuNulo(j.descricao_situacao_cadastral),
    naturezaJuridica: textoOuNulo(j.natureza_juridica),
    porte: textoOuNulo(j.porte),
    cnaePrincipal: textoOuNulo(j.cnae_fiscal),
    cnaeDescricao: textoOuNulo(j.cnae_fiscal_descricao),
    dataAbertura: textoOuNulo(j.data_inicio_atividade),
    capitalSocial: typeof j.capital_social === "number" ? j.capital_social : null,
    email: textoOuNulo(j.email)?.toLowerCase() ?? null,
    telefone: textoOuNulo(j.ddd_telefone_1)?.replace(/\D/g, "") ?? null,
    cep: textoOuNulo(j.cep)?.replace(/\D/g, "") ?? null,
    logradouro: [textoOuNulo(j.descricao_tipo_de_logradouro), textoOuNulo(j.logradouro)]
      .filter(Boolean)
      .join(" ") || null,
    numero: textoOuNulo(j.numero),
    complemento: textoOuNulo(j.complemento),
    bairro: textoOuNulo(j.bairro),
    cidade: textoOuNulo(j.municipio),
    uf: textoOuNulo(j.uf),
    socios: qsa.map((s) => ({
      nome: textoOuNulo(s.nome_socio) ?? "",
      qualificacao: textoOuNulo(s.qualificacao_socio),
    })),
    fonte: "BrasilAPI",
  };
}

function daReceitaWs(j: Record<string, unknown>, cnpj: string): FichaCnpj {
  const qsa = Array.isArray(j.qsa) ? (j.qsa as Record<string, unknown>[]) : [];
  const atividade = Array.isArray(j.atividade_principal)
    ? (j.atividade_principal[0] as Record<string, unknown> | undefined)
    : undefined;
  const [dia, mes, ano] = (textoOuNulo(j.abertura) ?? "").split("/");
  return {
    cnpj,
    razaoSocial: textoOuNulo(j.nome) ?? "",
    nomeFantasia: textoOuNulo(j.fantasia),
    situacaoCadastral: textoOuNulo(j.situacao),
    naturezaJuridica: textoOuNulo(j.natureza_juridica),
    porte: textoOuNulo(j.porte),
    cnaePrincipal: textoOuNulo(atividade?.code)?.replace(/\D/g, "") ?? null,
    cnaeDescricao: textoOuNulo(atividade?.text),
    dataAbertura: ano ? `${ano}-${mes}-${dia}` : null,
    capitalSocial: j.capital_social ? Number(String(j.capital_social).replace(/\D/g, "")) / 100 : null,
    email: textoOuNulo(j.email)?.toLowerCase() ?? null,
    telefone: textoOuNulo(j.telefone)?.replace(/\D/g, "") ?? null,
    cep: textoOuNulo(j.cep)?.replace(/\D/g, "") ?? null,
    logradouro: textoOuNulo(j.logradouro),
    numero: textoOuNulo(j.numero),
    complemento: textoOuNulo(j.complemento),
    bairro: textoOuNulo(j.bairro),
    cidade: textoOuNulo(j.municipio),
    uf: textoOuNulo(j.uf),
    socios: qsa.map((s) => ({
      nome: textoOuNulo(s.nome) ?? "",
      qualificacao: textoOuNulo(s.qual),
    })),
    fonte: "ReceitaWS",
  };
}

// ==================================================================
// CEP
// ==================================================================

export interface FichaCep {
  cep: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
}

export async function consultarCep(entrada: string): Promise<FichaCep> {
  const cep = soDigitos(entrada);
  if (cep.length !== 8) throw new Error("CEP precisa ter 8 dígitos.");

  try {
    const r = await buscar(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (r.ok) {
      const j = await r.json();
      const coords = j?.location?.coordinates ?? {};
      return {
        cep,
        logradouro: textoOuNulo(j.street),
        bairro: textoOuNulo(j.neighborhood),
        cidade: textoOuNulo(j.city),
        uf: textoOuNulo(j.state),
        lat: coords.latitude ? Number(coords.latitude) : null,
        lng: coords.longitude ? Number(coords.longitude) : null,
      };
    }
  } catch {
    // tenta o ViaCEP
  }

  const r = await buscar(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) throw new Error("Não consegui consultar o CEP agora.");
  const j = await r.json();
  if (j.erro) throw new Error("CEP não encontrado.");
  return {
    cep,
    logradouro: textoOuNulo(j.logradouro),
    bairro: textoOuNulo(j.bairro),
    cidade: textoOuNulo(j.localidade),
    uf: textoOuNulo(j.uf),
    lat: null,
    lng: null,
  };
}

// ==================================================================
// Geocodificacao
// ==================================================================

export interface Coordenada {
  lat: number;
  lng: number;
  precisao: "exata" | "aproximada" | "cidade";
  rotulo?: string;
}

/**
 * Transforma endereco em coordenada. Usa Google se houver chave,
 * senao Nominatim (OpenStreetMap). Devolve null se nao achar.
 */
export async function geocodificar(partes: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}): Promise<Coordenada | null> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  const enderecoTexto = [
    [partes.logradouro, partes.numero].filter(Boolean).join(", "),
    partes.bairro,
    partes.cidade,
    partes.uf,
    partes.cep ? soDigitos(partes.cep) : null,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

  if (!partes.cidade && !partes.cep && !partes.logradouro) return null;

  if (chave) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        enderecoTexto,
      )}&region=br&key=${chave}`;
      const r = await buscar(url);
      const j = await r.json();
      const achado = j?.results?.[0];
      if (achado?.geometry?.location) {
        const tipo = achado.geometry.location_type;
        return {
          lat: achado.geometry.location.lat,
          lng: achado.geometry.location.lng,
          precisao: tipo === "ROOFTOP" ? "exata" : "aproximada",
          rotulo: achado.formatted_address,
        };
      }
    } catch {
      // cai para o Nominatim
    }
  }

  const base = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
  try {
    const url = `${base}/search?format=jsonv2&countrycodes=br&limit=1&q=${encodeURIComponent(enderecoTexto)}`;
    const r = await buscar(url);
    if (!r.ok) return null;
    const j = await r.json();
    const achado = Array.isArray(j) ? j[0] : null;
    if (!achado) return null;
    return {
      lat: Number(achado.lat),
      lng: Number(achado.lon),
      precisao: achado.category === "building" || achado.addresstype === "house" ? "exata" : "aproximada",
      rotulo: achado.display_name,
    };
  } catch {
    return null;
  }
}
