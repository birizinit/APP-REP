"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Combustivel } from "@prisma/client";

import { exigirUsuario, hashSenha, conferirSenha } from "@/lib/auth";
import { consultarCep, geocodificar } from "@/lib/consultas";
import { num, soDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function texto(dados: FormData, campo: string): string | null {
  const valor = String(dados.get(campo) ?? "").trim();
  return valor.length > 0 ? valor : null;
}

// ==================================================================
// Perfil e base
// ==================================================================

export async function salvarPerfil(dados: FormData) {
  const user = await exigirUsuario();

  const nome = String(dados.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe seu nome." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nome,
      telefone: soDigitos(String(dados.get("telefone") ?? "")) || null,
      whatsapp: soDigitos(String(dados.get("whatsapp") ?? "")) || null,
      cpfCnpj: soDigitos(String(dados.get("cpfCnpj") ?? "")) || null,
      metaMensal: new Prisma.Decimal(num(dados.get("metaMensal")).toFixed(2)),
      metaVisitasDia: Number(dados.get("metaVisitasDia")) || 8,
      jornadaInicio: String(dados.get("jornadaInicio") ?? "08:00"),
      jornadaFim: String(dados.get("jornadaFim") ?? "18:00"),
      almocoInicio: String(dados.get("almocoInicio") ?? "12:00"),
      almocoMinutos: Number(dados.get("almocoMinutos")) || 60,
    },
  });

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { ok: true };
}

/** A base é de onde a rota sai e para onde volta. Sem ela não há roteiro. */
export async function salvarBase(dados: FormData) {
  const user = await exigirUsuario();

  const cep = soDigitos(String(dados.get("baseCep") ?? ""));
  const campos = {
    baseLabel: texto(dados, "baseLabel") ?? "Minha base",
    baseCep: cep || null,
    baseRua: texto(dados, "baseRua"),
    baseNum: texto(dados, "baseNum"),
    baseBairro: texto(dados, "baseBairro"),
    baseCidade: texto(dados, "baseCidade"),
    baseUf: texto(dados, "baseUf")?.toUpperCase() ?? null,
  };

  let lat = dados.get("baseLat") ? Number(dados.get("baseLat")) : null;
  let lng = dados.get("baseLng") ? Number(dados.get("baseLng")) : null;

  if (!lat || !lng) {
    const coord = await geocodificar({
      logradouro: campos.baseRua,
      numero: campos.baseNum,
      bairro: campos.baseBairro,
      cidade: campos.baseCidade,
      uf: campos.baseUf,
      cep: campos.baseCep,
    });
    if (coord) {
      lat = coord.lat;
      lng = coord.lng;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...campos, baseLat: lat, baseLng: lng },
  });

  revalidatePath("/ajustes");
  revalidatePath("/rotas");
  return { ok: true, localizado: Boolean(lat && lng) };
}

export async function buscarCepBase(cep: string) {
  await exigirUsuario();
  try {
    return { ok: true as const, ficha: await consultarCep(cep) };
  } catch (erro) {
    return { ok: false as const, erro: (erro as Error).message };
  }
}

export async function trocarSenha(dados: FormData) {
  const user = await exigirUsuario();

  const atual = String(dados.get("senhaAtual") ?? "");
  const nova = String(dados.get("senhaNova") ?? "");

  if (nova.length < 6) return { erro: "A nova senha precisa de pelo menos 6 caracteres." };
  if (!(await conferirSenha(atual, user.senhaHash))) return { erro: "Senha atual não confere." };

  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: await hashSenha(nova) },
  });

  return { ok: true };
}

// ==================================================================
// Veiculos
// ==================================================================

export async function salvarVeiculo(dados: FormData) {
  const user = await exigirUsuario();
  const id = String(dados.get("id") ?? "") || null;

  const apelido = String(dados.get("apelido") ?? "").trim();
  if (!apelido) return { erro: "Dê um apelido ao veículo (ex.: Corolla do trabalho)." };

  const campos = {
    apelido,
    marca: texto(dados, "marca"),
    modelo: texto(dados, "modelo"),
    ano: dados.get("ano") ? Number(dados.get("ano")) : null,
    placa: texto(dados, "placa")?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? null,
    cor: texto(dados, "cor"),
    combustivel: (String(dados.get("combustivel") ?? "GASOLINA") as Combustivel) || "GASOLINA",
    flex: dados.get("flex") === "on",
    consumoCidade: num(dados.get("consumoCidade"), 10),
    consumoEstrada: num(dados.get("consumoEstrada"), 13),
    precoGasolina: new Prisma.Decimal(num(dados.get("precoGasolina"), 6.09).toFixed(3)),
    precoEtanol: new Prisma.Decimal(num(dados.get("precoEtanol"), 4.29).toFixed(3)),
    precoDiesel: new Prisma.Decimal(num(dados.get("precoDiesel"), 6.19).toFixed(3)),
    custoManutencaoKm: new Prisma.Decimal(num(dados.get("custoManutencaoKm"), 0.35).toFixed(3)),
    pedagioMedioDia: new Prisma.Decimal(num(dados.get("pedagioMedioDia")).toFixed(2)),
    hodometro: dados.get("hodometro") ? Number(dados.get("hodometro")) : null,
    padrao: dados.get("padrao") === "on",
    ativo: dados.get("ativo") !== "off",
  };

  const veiculo = id
    ? await prisma.vehicle.update({ where: { id }, data: campos })
    : await prisma.vehicle.create({ data: { ...campos, userId: user.id } });

  if (campos.padrao) {
    await prisma.vehicle.updateMany({
      where: { userId: user.id, NOT: { id: veiculo.id } },
      data: { padrao: false },
    });
  }

  revalidatePath("/ajustes");
  revalidatePath("/rotas");
  return { ok: true, id: veiculo.id };
}

export async function excluirVeiculo(id: string) {
  const user = await exigirUsuario();
  await prisma.vehicle.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/ajustes");
  return { ok: true };
}

/**
 * Registra abastecimento e recalcula o consumo real entre dois
 * tanques cheios — melhor que confiar no número do fabricante.
 */
export async function registrarAbastecimento(dados: FormData) {
  const user = await exigirUsuario();

  const vehicleId = String(dados.get("vehicleId") ?? "");
  const veiculo = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: user.id } });
  if (!veiculo) return { erro: "Veículo não encontrado." };

  const litros = num(dados.get("litros"));
  const valorLitro = num(dados.get("valorLitro"));
  const hodometro = dados.get("hodometro") ? Number(dados.get("hodometro")) : null;
  const tanqueCheio = dados.get("tanqueCheio") !== "off";

  if (litros <= 0) return { erro: "Informe quantos litros." };

  await prisma.refuel.create({
    data: {
      vehicleId,
      litros,
      valorLitro: new Prisma.Decimal(valorLitro.toFixed(3)),
      valorTotal: new Prisma.Decimal((litros * valorLitro).toFixed(2)),
      hodometro,
      posto: texto(dados, "posto"),
      tanqueCheio,
      combustivel: (String(dados.get("combustivel") ?? veiculo.combustivel) as Combustivel),
      data: dados.get("data") ? new Date(String(dados.get("data"))) : new Date(),
    },
  });

  // consumo real: km rodados desde o último tanque cheio / litros deste
  let consumoReal: number | null = null;
  if (tanqueCheio && hodometro) {
    const anterior = await prisma.refuel.findFirst({
      where: { vehicleId, tanqueCheio: true, hodometro: { not: null, lt: hodometro } },
      orderBy: { hodometro: "desc" },
    });
    if (anterior?.hodometro) {
      const rodados = hodometro - anterior.hodometro;
      if (rodados > 30 && litros > 0) {
        consumoReal = rodados / litros;
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            hodometro,
            consumoCidade: Number((consumoReal * 0.92).toFixed(2)),
            consumoEstrada: Number((consumoReal * 1.22).toFixed(2)),
            ...(veiculo.combustivel === "GASOLINA" || veiculo.flex
              ? { precoGasolina: new Prisma.Decimal(valorLitro.toFixed(3)) }
              : {}),
          },
        });
      }
    }
  }

  if (hodometro && consumoReal === null) {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { hodometro } });
  }

  revalidatePath("/ajustes");
  return { ok: true, consumoReal };
}

// ==================================================================
// Regioes
// ==================================================================

export async function salvarRegiao(dados: FormData) {
  const user = await exigirUsuario();
  const id = String(dados.get("id") ?? "") || null;

  const nome = String(dados.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome à região." };

  const campos = {
    nome,
    cor: texto(dados, "cor") ?? "#E0623A",
    uf: texto(dados, "uf")?.toUpperCase() ?? null,
    diaSemana: dados.get("diaSemana") ? Number(dados.get("diaSemana")) : null,
    cidades: String(dados.get("cidades") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    observacoes: texto(dados, "observacoes"),
  };

  if (id) await prisma.region.updateMany({ where: { id, userId: user.id }, data: campos });
  else await prisma.region.create({ data: { ...campos, userId: user.id } });

  revalidatePath("/ajustes");
  revalidatePath("/clientes");
  return { ok: true };
}

export async function excluirRegiao(id: string) {
  const user = await exigirUsuario();
  await prisma.region.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/ajustes");
  revalidatePath("/clientes");
  return { ok: true };
}

/** Encaixa cada cliente sem região na região que lista a cidade dele. */
export async function distribuirRegioes() {
  const user = await exigirUsuario();

  const [regioes, clientes] = await Promise.all([
    prisma.region.findMany({ where: { userId: user.id } }),
    prisma.client.findMany({
      where: { userId: user.id, regionId: null, cidade: { not: null } },
      select: { id: true, cidade: true, uf: true },
    }),
  ]);

  const normalizar = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  let encaixados = 0;
  for (const c of clientes) {
    const alvo = regioes.find((r) =>
      r.cidades.some((cidade) => normalizar(cidade) === normalizar(c.cidade ?? "")),
    );
    if (!alvo) continue;
    await prisma.client.update({ where: { id: c.id }, data: { regionId: alvo.id } });
    encaixados++;
  }

  revalidatePath("/clientes");
  revalidatePath("/ajustes");
  return { total: clientes.length, encaixados };
}

// ==================================================================
// Notificacoes
// ==================================================================

export async function marcarAvisosLidos() {
  const user = await exigirUsuario();
  await prisma.notification.updateMany({
    where: { userId: user.id, lida: false },
    data: { lida: true },
  });
  revalidatePath("/avisos");
  revalidatePath("/");
  return { ok: true };
}

export async function excluirAviso(id: string) {
  const user = await exigirUsuario();
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/avisos");
  return { ok: true };
}
