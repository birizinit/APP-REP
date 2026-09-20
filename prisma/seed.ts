/**
 * Semente de demonstracao.
 *
 * Monta uma carteira de representante realista no interior e na regiao
 * metropolitana de Sao Paulo: 3 representadas com planos de comissao
 * bem diferentes entre si, 18 clientes em varios estagios, 5 meses de
 * pedidos, comissoes ja parceladas pelo motor e a agenda da semana.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { calcularComissao, gerarParcelas, statusDaComissao, type Plano } from "../src/lib/comissao";

const prisma = new PrismaClient();

const EMAIL = "rep@representei.app";
const SENHA = "representei";

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

function dias(qtd: number, base = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + qtd);
  d.setHours(12, 0, 0, 0);
  return d;
}

function as(data: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(data);
  d.setHours(h, m, 0, 0);
  return d;
}

function jitter(valor: number, raio = 0.02): number {
  return valor + (Math.random() - 0.5) * raio;
}

function escolher<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function dec(valor: number): Prisma.Decimal {
  return new Prisma.Decimal(valor.toFixed(2));
}

// ------------------------------------------------------------------

const CIDADES = {
  saoPaulo: { cidade: "São Paulo", uf: "SP", lat: -23.5505, lng: -46.6333 },
  guarulhos: { cidade: "Guarulhos", uf: "SP", lat: -23.4538, lng: -46.5333 },
  osasco: { cidade: "Osasco", uf: "SP", lat: -23.5329, lng: -46.7916 },
  santoAndre: { cidade: "Santo André", uf: "SP", lat: -23.6639, lng: -46.5383 },
  saoBernardo: { cidade: "São Bernardo do Campo", uf: "SP", lat: -23.6914, lng: -46.5646 },
  diadema: { cidade: "Diadema", uf: "SP", lat: -23.6861, lng: -46.6228 },
  barueri: { cidade: "Barueri", uf: "SP", lat: -23.5107, lng: -46.8763 },
  campinas: { cidade: "Campinas", uf: "SP", lat: -22.9099, lng: -47.0626 },
  jundiai: { cidade: "Jundiaí", uf: "SP", lat: -23.1857, lng: -46.8978 },
  indaiatuba: { cidade: "Indaiatuba", uf: "SP", lat: -23.0816, lng: -47.2103 },
  americana: { cidade: "Americana", uf: "SP", lat: -22.7398, lng: -47.3314 },
  limeira: { cidade: "Limeira", uf: "SP", lat: -22.5647, lng: -47.4017 },
  piracicaba: { cidade: "Piracicaba", uf: "SP", lat: -22.7253, lng: -47.6492 },
  sorocaba: { cidade: "Sorocaba", uf: "SP", lat: -23.5015, lng: -47.4526 },
  itu: { cidade: "Itu", uf: "SP", lat: -23.2644, lng: -47.2992 },
  saoJose: { cidade: "São José dos Campos", uf: "SP", lat: -23.1896, lng: -45.8841 },
  taubate: { cidade: "Taubaté", uf: "SP", lat: -23.0265, lng: -45.5551 },
  mogi: { cidade: "Mogi das Cruzes", uf: "SP", lat: -23.5228, lng: -46.1883 },
};

async function main() {
  console.log("\n  Limpando base...");
  await prisma.$transaction([
    prisma.commissionPayment.deleteMany(),
    prisma.commission.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.agendaEvent.deleteMany(),
    prisma.routeStop.deleteMany(),
    prisma.route.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.importJob.deleteMany(),
    prisma.clientRepresentada.deleteMany(),
    prisma.client.deleteMany(),
    prisma.product.deleteMany(),
    prisma.commissionTier.deleteMany(),
    prisma.commissionPlan.deleteMany(),
    prisma.representada.deleteMany(),
    prisma.refuel.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.region.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ================================================================
  // Usuario
  // ================================================================
  console.log("  Criando representante...");
  const user = await prisma.user.create({
    data: {
      nome: "Gabriel Ferro",
      email: EMAIL,
      senhaHash: await bcrypt.hash(SENHA, 11),
      telefone: "11987654321",
      whatsapp: "11987654321",
      baseLabel: "Escritório · Santana",
      baseCep: "02011000",
      baseRua: "Rua Voluntários da Pátria",
      baseNum: "1200",
      baseBairro: "Santana",
      baseCidade: "São Paulo",
      baseUf: "SP",
      baseLat: -23.5015,
      baseLng: -46.6258,
      metaMensal: dec(98000),
      metaVisitasDia: 7,
      jornadaInicio: "08:00",
      jornadaFim: "18:00",
      almocoInicio: "12:00",
      almocoMinutos: 60,
      onboardingFeito: true,
    },
  });

  // ================================================================
  // Veiculo
  // ================================================================
  const veiculo = await prisma.vehicle.create({
    data: {
      userId: user.id,
      apelido: "Corolla do trabalho",
      marca: "Toyota",
      modelo: "Corolla XEi 2.0",
      ano: 2022,
      placa: "FGH2B34",
      cor: "Prata",
      combustivel: "GASOLINA",
      flex: true,
      consumoCidade: 9.8,
      consumoEstrada: 13.6,
      precoGasolina: dec(6.19),
      precoEtanol: dec(4.39),
      precoDiesel: dec(6.29),
      custoManutencaoKm: dec(0.42),
      pedagioMedioDia: dec(18.4),
      hodometro: 64230,
      padrao: true,
    },
  });

  await prisma.refuel.createMany({
    data: [
      { vehicleId: veiculo.id, data: dias(-24), litros: 42.3, valorLitro: dec(6.09), valorTotal: dec(257.6), hodometro: 63450, posto: "Ipiranga Marginal" },
      { vehicleId: veiculo.id, data: dias(-12), litros: 45.1, valorLitro: dec(6.19), valorTotal: dec(279.17), hodometro: 63890, posto: "Shell Anhanguera" },
      { vehicleId: veiculo.id, data: dias(-3), litros: 39.8, valorLitro: dec(6.24), valorTotal: dec(248.35), hodometro: 64180, posto: "Posto Graal Jundiaí" },
    ],
  });

  // ================================================================
  // Regioes
  // ================================================================
  console.log("  Criando regiões...");
  const regioes = await Promise.all([
    prisma.region.create({
      data: { userId: user.id, nome: "Capital e ABC", cor: "#1B34C4", uf: "SP", diaSemana: 1, cidades: ["São Paulo", "Santo André", "São Bernardo do Campo", "Diadema"] },
    }),
    prisma.region.create({
      data: { userId: user.id, nome: "Campinas e região", cor: "#12775A", uf: "SP", diaSemana: 2, cidades: ["Campinas", "Indaiatuba", "Americana", "Limeira"] },
    }),
    prisma.region.create({
      data: { userId: user.id, nome: "Sorocaba / Itu", cor: "#CF7C11", uf: "SP", diaSemana: 3, cidades: ["Sorocaba", "Itu", "Piracicaba"] },
    }),
    prisma.region.create({
      data: { userId: user.id, nome: "Vale do Paraíba", cor: "#C62439", uf: "SP", diaSemana: 4, cidades: ["São José dos Campos", "Taubaté", "Mogi das Cruzes"] },
    }),
    prisma.region.create({
      data: { userId: user.id, nome: "Oeste (Osasco/Barueri)", cor: "#7A3FB8", uf: "SP", diaSemana: 5, cidades: ["Osasco", "Barueri", "Jundiaí", "Guarulhos"] },
    }),
  ]);
  const [capital, campinas, sorocaba, vale, oeste] = regioes;

  // ================================================================
  // Representadas + planos de comissao
  // ================================================================
  console.log("  Criando representadas e planos...");

  const polimold = await prisma.representada.create({
    data: {
      userId: user.id,
      razaoSocial: "Polimold Indústria de Plásticos Ltda",
      nomeFantasia: "Polimold",
      cnpj: "61189288000189",
      segmento: "Embalagens plásticas rígidas",
      site: "https://polimold.exemplo.com.br",
      cor: "#1B34C4",
      email: "comercial@polimold.exemplo.com.br",
      telefone: "1134567890",
      whatsapp: "11991234567",
      contatoNome: "Marcos Tavares",
      contatoCargo: "Gerente Comercial",
      contatoEmail: "marcos@polimold.exemplo.com.br",
      contatoFone: "11991234567",
      cidade: "São Paulo",
      uf: "SP",
      bairro: "Vila Leopoldina",
      logradouro: "Av. Imperatriz Leopoldina",
      numero: "980",
      status: "ATIVA",
      contratoInicio: dias(-820),
      exclusividade: true,
      territorio: "Interior de SP e Grande SP",
      prazoEntregaDias: 12,
      pedidoMinimo: dec(2500),
      metaMensal: dec(58000),
      observacoes: "Faixa progressiva por acumulado do mês. Pagam via PIX todo dia 10.",
    },
  });

  const planoPolimold = await prisma.commissionPlan.create({
    data: {
      representadaId: polimold.id,
      nome: "Progressivo 2025",
      padrao: true,
      baseCalculo: "VALOR_LIQUIDO",
      tipoFaixa: "PROGRESSIVO",
      percentualPadrao: dec(3.5),
      gatilho: "PAGAMENTO_CLIENTE",
      prazoDias: 5,
      periodicidade: "MENSAL",
      diaPagamento: 10,
      formaRecebimento: "PIX",
      emiteNotaServico: false,
      impostoPercentual: dec(0),
      descontaInadimplencia: true,
      metaPeriodo: dec(58000),
      bonusPercentual: dec(0.5),
      observacoes: "Acima de R$ 58 mil no mês entra 0,5% de bônus sobre o pedido.",
      faixas: {
        create: [
          { rotulo: "Até 30 mil", deValor: dec(0), ateValor: dec(30000), percentual: dec(3.5), ordem: 0 },
          { rotulo: "30 a 60 mil", deValor: dec(30000), ateValor: dec(60000), percentual: dec(4.2), ordem: 1 },
          { rotulo: "60 a 100 mil", deValor: dec(60000), ateValor: dec(100000), percentual: dec(5), ordem: 2 },
          { rotulo: "Acima de 100 mil", deValor: dec(100000), ateValor: null, percentual: dec(6), ordem: 3 },
        ],
      },
    },
    include: { faixas: true },
  });

  const kaiser = await prisma.representada.create({
    data: {
      userId: user.id,
      razaoSocial: "Kaiser Ferramentas Industriais S.A.",
      nomeFantasia: "Kaiser Tools",
      cnpj: "47960950000121",
      segmento: "Ferramentaria e abrasivos",
      cor: "#12775A",
      email: "vendas@kaiser.exemplo.com.br",
      telefone: "1933445566",
      whatsapp: "19998887766",
      contatoNome: "Renata Lombardi",
      contatoCargo: "Coordenadora de Representantes",
      contatoEmail: "renata@kaiser.exemplo.com.br",
      cidade: "Campinas",
      uf: "SP",
      bairro: "Distrito Industrial",
      status: "ATIVA",
      contratoInicio: dias(-540),
      exclusividade: false,
      territorio: "SP interior",
      prazoEntregaDias: 8,
      pedidoMinimo: dec(1200),
      metaMensal: dec(22000),
      observacoes: "Paga no faturamento + 30 dias. Exige nota de serviço, ISS 5% retido.",
    },
  });

  const planoKaiser = await prisma.commissionPlan.create({
    data: {
      representadaId: kaiser.id,
      nome: "Padrão faturamento",
      padrao: true,
      baseCalculo: "VALOR_LIQUIDO",
      tipoFaixa: "UNICO",
      percentualPadrao: dec(4.8),
      gatilho: "EMISSAO_NF",
      prazoDias: 30,
      periodicidade: "MENSAL",
      diaPagamento: 25,
      formaRecebimento: "NOTA_SERVICO",
      emiteNotaServico: true,
      impostoPercentual: dec(5),
      descontaDevolucao: true,
      observacoes: "ISS de 5% retido na fonte. Emitir NFS-e até o dia 20.",
    },
    include: { faixas: true },
  });

  const valeVerde = await prisma.representada.create({
    data: {
      userId: user.id,
      razaoSocial: "Vale Verde Embalagens Flexíveis Ltda",
      nomeFantasia: "Vale Verde",
      cnpj: "05570714000159",
      segmento: "Filmes e embalagens flexíveis",
      cor: "#CF7C11",
      email: "representantes@valeverde.exemplo.com.br",
      telefone: "1236778899",
      whatsapp: "12997654321",
      contatoNome: "Anderson Prado",
      contatoCargo: "Diretor Comercial",
      cidade: "São José dos Campos",
      uf: "SP",
      status: "ATIVA",
      contratoInicio: dias(-260),
      exclusividade: false,
      territorio: "Vale do Paraíba e Capital",
      prazoEntregaDias: 15,
      metaMensal: dec(26000),
      observacoes: "Percentual varia por linha: filme técnico paga mais que o comum.",
    },
  });

  const planoValeVerde = await prisma.commissionPlan.create({
    data: {
      representadaId: valeVerde.id,
      nome: "Por linha de produto",
      padrao: true,
      baseCalculo: "VALOR_BRUTO",
      tipoFaixa: "POR_LINHA",
      percentualPadrao: dec(3),
      gatilho: "PAGAMENTO_CLIENTE",
      prazoDias: 10,
      periodicidade: "QUINZENAL",
      formaRecebimento: "TED",
      impostoPercentual: dec(0),
      observacoes: "Filme técnico 6%, linha comum 3%, promocional 2%.",
    },
    include: { faixas: true },
  });

  const multiplast = await prisma.representada.create({
    data: {
      userId: user.id,
      razaoSocial: "Multiplast Componentes Ltda",
      nomeFantasia: "Multiplast",
      cnpj: "33041260065290",
      segmento: "Injetados técnicos",
      cor: "#7A3FB8",
      status: "PROSPECCAO",
      contatoNome: "Juliana Reis",
      cidade: "Sorocaba",
      uf: "SP",
      observacoes: "Em negociação. Proposta de 5% sobre faturamento enviada.",
    },
  });

  // --- produtos ---
  console.log("  Criando catálogo...");
  await prisma.product.createMany({
    data: [
      { representadaId: polimold.id, codigo: "PM-1200", descricao: "Balde plástico 20L com alça metálica", unidade: "UN", precoTabela: dec(18.9), linha: "Baldes" },
      { representadaId: polimold.id, codigo: "PM-1205", descricao: "Balde plástico 12L", unidade: "UN", precoTabela: dec(12.4), linha: "Baldes" },
      { representadaId: polimold.id, codigo: "PM-3300", descricao: "Bombona 50L boca larga", unidade: "UN", precoTabela: dec(62.5), linha: "Bombonas" },
      { representadaId: polimold.id, codigo: "PM-3310", descricao: "Bombona 200L com tampa rosqueável", unidade: "UN", precoTabela: dec(189), linha: "Bombonas" },
      { representadaId: polimold.id, codigo: "PM-5500", descricao: "Caixa organizadora 45L", unidade: "UN", precoTabela: dec(34.8), linha: "Caixas" },
      { representadaId: polimold.id, codigo: "PM-5510", descricao: "Caixa agrícola vazada 30kg", unidade: "UN", precoTabela: dec(41.2), linha: "Caixas" },

      { representadaId: kaiser.id, codigo: "KT-0110", descricao: "Disco de corte 7\" inox", unidade: "CX", precoTabela: dec(148), linha: "Abrasivos", comissaoPercentual: dec(4.8) },
      { representadaId: kaiser.id, codigo: "KT-0180", descricao: "Disco de desbaste 4.1/2\"", unidade: "CX", precoTabela: dec(96.4), linha: "Abrasivos" },
      { representadaId: kaiser.id, codigo: "KT-2200", descricao: "Broca aço rápido 10mm (jogo 10un)", unidade: "JG", precoTabela: dec(212), linha: "Corte" },
      { representadaId: kaiser.id, codigo: "KT-2260", descricao: "Fresa topo 4 cortes 12mm", unidade: "UN", precoTabela: dec(318), linha: "Corte" },
      { representadaId: kaiser.id, codigo: "KT-7700", descricao: "Luva de proteção nitrílica (par)", unidade: "PAR", precoTabela: dec(14.9), linha: "EPI" },

      { representadaId: valeVerde.id, codigo: "VV-FT90", descricao: "Filme técnico barreira 90µ", unidade: "KG", precoTabela: dec(28.6), linha: "Filme técnico", comissaoPercentual: dec(6) },
      { representadaId: valeVerde.id, codigo: "VV-FT120", descricao: "Filme técnico barreira 120µ", unidade: "KG", precoTabela: dec(33.4), linha: "Filme técnico", comissaoPercentual: dec(6) },
      { representadaId: valeVerde.id, codigo: "VV-CM50", descricao: "Filme stretch comum 50µ", unidade: "KG", precoTabela: dec(16.2), linha: "Linha comum", comissaoPercentual: dec(3) },
      { representadaId: valeVerde.id, codigo: "VV-CM25", descricao: "Saco plástico PEBD 25x35", unidade: "KG", precoTabela: dec(13.8), linha: "Linha comum", comissaoPercentual: dec(3) },
      { representadaId: valeVerde.id, codigo: "VV-PR10", descricao: "Bobina promocional impressa", unidade: "KG", precoTabela: dec(11.4), linha: "Promocional", comissaoPercentual: dec(2) },
    ],
  });

  // ================================================================
  // Clientes
  // ================================================================
  console.log("  Criando carteira de clientes...");

  interface Semente {
    razao: string;
    fantasia: string;
    cnpj: string;
    local: keyof typeof CIDADES;
    regiao: string;
    curva: "A" | "B" | "C" | "D";
    status: "PROSPECT" | "ATIVO" | "INATIVO" | "EM_RISCO";
    freq: number;
    ultimaVisita: number | null;
    ultimoPedido: number | null;
    contato: string;
    tags: string[];
    representadas: string[];
  }

  const sementes: Semente[] = [
    { razao: "Indústria de Alimentos Bandeirante Ltda", fantasia: "Alimentos Bandeirante", cnpj: "24186777000108", local: "campinas", regiao: campinas.id, curva: "A", status: "ATIVO", freq: 15, ultimaVisita: -9, ultimoPedido: -12, contato: "Sandra Peixoto", tags: ["alimentício", "compra recorrente"], representadas: [polimold.id, valeVerde.id] },
    { razao: "Metalúrgica São Jorge S.A.", fantasia: "Metal São Jorge", cnpj: "07526557000100", local: "santoAndre", regiao: capital.id, curva: "A", status: "ATIVO", freq: 15, ultimaVisita: -4, ultimoPedido: -6, contato: "Wagner Belini", tags: ["metalurgia", "grande conta"], representadas: [kaiser.id, polimold.id] },
    { razao: "Distribuidora Ponto Forte Comércio Ltda", fantasia: "Ponto Forte", cnpj: "45543915000181", local: "sorocaba", regiao: sorocaba.id, curva: "A", status: "ATIVO", freq: 20, ultimaVisita: -22, ultimoPedido: -30, contato: "Cleber Andrade", tags: ["revenda"], representadas: [polimold.id, kaiser.id, valeVerde.id] },
    { razao: "Frigorífico Boa Carne Ltda", fantasia: "Boa Carne", cnpj: "60409075000152", local: "piracicaba", regiao: sorocaba.id, curva: "B", status: "ATIVO", freq: 30, ultimaVisita: -18, ultimoPedido: -25, contato: "Marli Trindade", tags: ["frigorífico"], representadas: [valeVerde.id] },
    { razao: "Auto Peças Veloz Comércio Ltda", fantasia: "Veloz Auto Peças", cnpj: "33469117000107", local: "guarulhos", regiao: oeste.id, curva: "B", status: "ATIVO", freq: 30, ultimaVisita: -11, ultimoPedido: -19, contato: "Douglas Kimura", tags: ["automotivo"], representadas: [kaiser.id] },
    { razao: "Construtora Alicerce Norte Ltda", fantasia: "Alicerce Norte", cnpj: "20899234000185", local: "saoJose", regiao: vale.id, curva: "B", status: "ATIVO", freq: 30, ultimaVisita: -27, ultimoPedido: -34, contato: "Eng. Paulo Sartori", tags: ["construção"], representadas: [kaiser.id, polimold.id] },
    { razao: "Laticínios Serra Azul Ltda", fantasia: "Serra Azul", cnpj: "89637490000145", local: "taubate", regiao: vale.id, curva: "B", status: "EM_RISCO", freq: 30, ultimaVisita: -74, ultimoPedido: -96, contato: "Rita Camargo", tags: ["laticínio", "atenção"], representadas: [valeVerde.id, polimold.id] },
    { razao: "Ferramentaria Precisão Total Ltda", fantasia: "Precisão Total", cnpj: "10786904000147", local: "diadema", regiao: capital.id, curva: "B", status: "ATIVO", freq: 21, ultimaVisita: -13, ultimoPedido: -16, contato: "Ivan Kuroda", tags: ["ferramentaria"], representadas: [kaiser.id] },
    { razao: "Supermercados União Comércio de Alimentos Ltda", fantasia: "Super União", cnpj: "48561906000102", local: "limeira", regiao: campinas.id, curva: "C", status: "ATIVO", freq: 45, ultimaVisita: -31, ultimoPedido: -44, contato: "Jaqueline Alves", tags: ["varejo"], representadas: [polimold.id] },
    { razao: "Química Industrial Delta Ltda", fantasia: "Química Delta", cnpj: "70096171000144", local: "americana", regiao: campinas.id, curva: "A", status: "ATIVO", freq: 15, ultimaVisita: -2, ultimoPedido: -8, contato: "Dr. Henrique Sales", tags: ["químico", "bombonas"], representadas: [polimold.id] },
    { razao: "Embalagens Rápidas Distribuição Ltda", fantasia: "Emb. Rápidas", cnpj: "17352958000124", local: "osasco", regiao: oeste.id, curva: "C", status: "ATIVO", freq: 45, ultimaVisita: -38, ultimoPedido: -52, contato: "Fábio Nunes", tags: ["revenda"], representadas: [valeVerde.id] },
    { razao: "Agroindústria Campo Belo Ltda", fantasia: "Campo Belo", cnpj: "07147473000153", local: "indaiatuba", regiao: campinas.id, curva: "C", status: "ATIVO", freq: 60, ultimaVisita: -47, ultimoPedido: -58, contato: "Sérgio Bonfim", tags: ["agro"], representadas: [polimold.id] },
    { razao: "Oficina Mecânica Irmãos Prado ME", fantasia: "Irmãos Prado", cnpj: "22896533000107", local: "mogi", regiao: vale.id, curva: "C", status: "ATIVO", freq: 60, ultimaVisita: -55, ultimoPedido: -71, contato: "Nelson Prado", tags: ["oficina"], representadas: [kaiser.id] },
    { razao: "Plásticos do Vale Comércio Ltda", fantasia: "Plásticos do Vale", cnpj: "92660128000186", local: "saoJose", regiao: vale.id, curva: "C", status: "INATIVO", freq: 60, ultimaVisita: -112, ultimoPedido: -140, contato: "Cristina Vilela", tags: ["reativar"], representadas: [polimold.id] },
    { razao: "Hospital Santa Clara Assistência Médica S.A.", fantasia: "Hosp. Santa Clara", cnpj: "60746948000112", local: "jundiai", regiao: oeste.id, curva: "B", status: "ATIVO", freq: 30, ultimaVisita: -16, ultimoPedido: -21, contato: "Compras — Elaine", tags: ["saúde", "licitação"], representadas: [polimold.id, valeVerde.id] },
    { razao: "Marcenaria Arte e Madeira Ltda", fantasia: "Arte e Madeira", cnpj: "37166654000107", local: "itu", regiao: sorocaba.id, curva: "D", status: "PROSPECT", freq: 30, ultimaVisita: null, ultimoPedido: null, contato: "Toninho Ribeiro", tags: ["prospect", "indicação"], representadas: [kaiser.id] },
    { razao: "Cooperativa Agrícola Vale Fértil", fantasia: "Coop. Vale Fértil", cnpj: "88185738000140", local: "piracicaba", regiao: sorocaba.id, curva: "D", status: "PROSPECT", freq: 30, ultimaVisita: -6, ultimoPedido: null, contato: "Dirceu Martins", tags: ["prospect", "agro"], representadas: [polimold.id] },
    { razao: "Transportadora Rota Certa Logística Ltda", fantasia: "Rota Certa", cnpj: "04902979000144", local: "barueri", regiao: oeste.id, curva: "D", status: "PROSPECT", freq: 45, ultimaVisita: null, ultimoPedido: null, contato: "Silvana Paiva", tags: ["prospect", "logística"], representadas: [kaiser.id, valeVerde.id] },
  ];

  const clientes = [];
  for (const s of sementes) {
    const local = CIDADES[s.local];
    const cliente = await prisma.client.create({
      data: {
        userId: user.id,
        tipoPessoa: "PJ",
        cnpj: s.cnpj,
        razaoSocial: s.razao,
        nomeFantasia: s.fantasia,
        inscricaoEstadual: String(Math.floor(100000000000 + Math.random() * 800000000000)),
        situacaoCadastral: "ATIVA",
        cnaeDescricao: escolher([
          "Fabricação de produtos de material plástico",
          "Comércio atacadista de embalagens",
          "Indústria de transformação",
          "Comércio varejista especializado",
        ]),
        porte: escolher(["DEMAIS", "ME", "EPP"]),
        email: `compras@${s.fantasia.toLowerCase().replace(/[^a-z]/g, "")}.exemplo.com.br`,
        telefone: `1${Math.floor(1 + Math.random() * 8)}3${Math.floor(1000000 + Math.random() * 8999999)}`,
        whatsapp: `1${Math.floor(1 + Math.random() * 8)}9${Math.floor(10000000 + Math.random() * 89999999)}`,
        contatoNome: s.contato,
        contatoCargo: escolher(["Comprador", "Gerente de Compras", "Diretor", "Suprimentos"]),
        cep: String(Math.floor(10000000 + Math.random() * 89999999)),
        logradouro: escolher(["Av. Industrial", "Rua das Indústrias", "Rod. Anhanguera km", "Av. Brasil", "Rua Sete de Setembro"]),
        numero: String(Math.floor(50 + Math.random() * 3000)),
        bairro: escolher(["Distrito Industrial", "Centro", "Jardim Industrial", "Vila Nova", "Parque Empresarial"]),
        cidade: local.cidade,
        uf: local.uf,
        lat: jitter(local.lat),
        lng: jitter(local.lng),
        geocodadoEm: new Date(),
        regionId: s.regiao,
        curva: s.curva,
        status: s.status,
        frequenciaVisitaDias: s.freq,
        tempoVisitaMin: s.curva === "A" ? 55 : s.curva === "B" ? 45 : 35,
        diasAtendimento: [1, 2, 3, 4, 5],
        horaAbre: "08:00",
        horaFecha: "17:30",
        condicaoPagamento: escolher(["28/42/56", "30/60/90", "À vista", "30/60", "21/28/35"]),
        limiteCredito: dec(escolher([20000, 35000, 50000, 80000, 120000])),
        tags: s.tags,
        origem: escolher(["Indicação", "Prospecção ativa", "Feira do setor", "Carteira herdada", "Inbound"]),
        ultimaVisitaEm: s.ultimaVisita === null ? null : dias(s.ultimaVisita),
        ultimoPedidoEm: s.ultimoPedido === null ? null : dias(s.ultimoPedido),
        observacoes:
          s.status === "EM_RISCO"
            ? "Reclamou do prazo de entrega no último pedido. Precisa de atenção."
            : s.status === "PROSPECT"
              ? "Primeiro contato feito. Aguardando abertura de cadastro."
              : null,
        representadas: {
          create: s.representadas.map((rid) => ({
            representadaId: rid,
            codigoNoFornecedor: `C${Math.floor(1000 + Math.random() * 8999)}`,
            desde: dias(-Math.floor(120 + Math.random() * 600)),
          })),
        },
      },
    });
    clientes.push({ ...cliente, sem: s });
  }

  // ================================================================
  // Pedidos + comissoes
  // ================================================================
  console.log("  Gerando pedidos e comissões...");

  const planos: Record<string, { plano: Plano; representadaId: string; planId: string }> = {
    [polimold.id]: {
      representadaId: polimold.id,
      planId: planoPolimold.id,
      plano: {
        baseCalculo: "VALOR_LIQUIDO",
        tipoFaixa: "PROGRESSIVO",
        percentualPadrao: 3.5,
        gatilho: "PAGAMENTO_CLIENTE",
        prazoDias: 5,
        periodicidade: "MENSAL",
        diaPagamento: 10,
        impostoPercentual: 0,
        metaPeriodo: 58000,
        bonusPercentual: 0.5,
        faixas: planoPolimold.faixas.map((f) => ({
          deValor: Number(f.deValor),
          ateValor: f.ateValor === null ? null : Number(f.ateValor),
          percentual: Number(f.percentual),
          rotulo: f.rotulo,
        })),
      },
    },
    [kaiser.id]: {
      representadaId: kaiser.id,
      planId: planoKaiser.id,
      plano: {
        baseCalculo: "VALOR_LIQUIDO",
        tipoFaixa: "UNICO",
        percentualPadrao: 4.8,
        gatilho: "EMISSAO_NF",
        prazoDias: 30,
        periodicidade: "MENSAL",
        diaPagamento: 25,
        impostoPercentual: 5,
      },
    },
    [valeVerde.id]: {
      representadaId: valeVerde.id,
      planId: planoValeVerde.id,
      plano: {
        baseCalculo: "VALOR_BRUTO",
        tipoFaixa: "POR_LINHA",
        percentualPadrao: 3,
        gatilho: "PAGAMENTO_CLIENTE",
        prazoDias: 10,
        periodicidade: "QUINZENAL",
        impostoPercentual: 0,
      },
    },
  };

  const catalogo = await prisma.product.findMany();
  let contador = 1;
  const acumuladoPorMes = new Map<string, number>();

  const ativos = clientes.filter((c) => c.sem.ultimoPedido !== null);

  for (const cliente of ativos) {
    const vinculadas = cliente.sem.representadas;
    const qtdPedidos =
      cliente.sem.curva === "A" ? 6 : cliente.sem.curva === "B" ? 4 : 2;

    for (let i = 0; i < qtdPedidos; i++) {
      const representadaId = escolher(vinculadas);
      const config = planos[representadaId];
      if (!config) continue;

      const diasAtras = cliente.sem.ultimoPedido! - i * Math.floor(22 + Math.random() * 20);
      if (diasAtras < -160) continue;
      const dataPedido = dias(diasAtras);

      const produtos = catalogo.filter((p) => p.representadaId === representadaId);
      if (produtos.length === 0) continue;

      const qtdItens = Math.floor(2 + Math.random() * 4);
      const itens: Prisma.OrderItemUncheckedCreateWithoutPedidoInput[] = [];
      let bruto = 0;

      for (let k = 0; k < qtdItens; k++) {
        const produto = escolher(produtos);
        if (itens.some((it) => it.productId === produto.id)) continue;
        // A quantidade sai do valor que se quer no item, senao um produto
        // de R$ 300 e outro de R$ 12 gerariam pedidos de ordem bem diferente.
        const alvoItem =
          cliente.sem.curva === "A"
            ? 3800 + Math.random() * 4200
            : cliente.sem.curva === "B"
              ? 1800 + Math.random() * 2200
              : 700 + Math.random() * 1200;
        const precoUnitario = Number(produto.precoTabela) * (0.92 + Math.random() * 0.1);
        const quantidade = Math.max(1, Math.round(alvoItem / precoUnitario));
        const total = quantidade * precoUnitario;
        bruto += total;
        itens.push({
          productId: produto.id,
          codigo: produto.codigo,
          descricao: produto.descricao,
          unidade: produto.unidade,
          quantidade: dec(quantidade),
          precoUnitario: new Prisma.Decimal(precoUnitario.toFixed(4)),
          total: dec(total),
          comissaoPercentual: produto.comissaoPercentual,
          ordem: k,
        });
      }
      if (itens.length === 0) continue;

      const descontoPercentual = escolher([0, 0, 0, 2, 3, 5]);
      const descontoValor = (bruto * descontoPercentual) / 100;
      const valorFrete = escolher([0, 0, 180, 340, 520]);
      const valorLiquido = bruto - descontoValor - valorFrete;

      const competencia = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}`;
      const chaveAcumulado = `${representadaId}|${competencia}`;
      const acumulado = acumuladoPorMes.get(chaveAcumulado) ?? 0;

      const statusPedido =
        diasAtras < -45 ? "ENTREGUE" : diasAtras < -20 ? "FATURADO" : escolher(["APROVADO", "FATURADO"] as const);

      const faturado = statusPedido === "FATURADO" || statusPedido === "ENTREGUE";
      const notaFiscalData = faturado ? dias(diasAtras + 4) : null;

      const pedidoParaCalculo = {
        valorBruto: bruto,
        descontoValor,
        valorFrete,
        valorImpostos: 0,
        valorLiquido,
        data: dataPedido,
        notaFiscalData,
        condicaoPagamento: cliente.condicaoPagamento,
        itens: itens.map((it) => ({
          total: Number(it.total),
          comissaoPercentual: it.comissaoPercentual === null ? null : Number(it.comissaoPercentual),
        })),
      };

      const resultado = calcularComissao(pedidoParaCalculo, config.plano, acumulado);
      acumuladoPorMes.set(chaveAcumulado, acumulado + valorLiquido);

      const pedido = await prisma.order.create({
        data: {
          userId: user.id,
          clientId: cliente.id,
          representadaId,
          planId: config.planId,
          numero: `PD-${String(contador++).padStart(4, "0")}`,
          numeroFornecedor: String(Math.floor(30000 + Math.random() * 60000)),
          data: dataPedido,
          status: statusPedido,
          origem: escolher(["MANUAL", "MANUAL", "PDF", "PLANILHA"] as const),
          valorBruto: dec(bruto),
          descontoValor: dec(descontoValor),
          descontoPercentual: dec(descontoPercentual),
          valorFrete: dec(valorFrete),
          valorLiquido: dec(valorLiquido),
          tipoFrete: escolher(["CIF", "FOB"] as const),
          condicaoPagamento: cliente.condicaoPagamento,
          parcelas: (cliente.condicaoPagamento ?? "").split("/").length,
          comissaoBase: dec(resultado.base),
          comissaoPercentual: new Prisma.Decimal(resultado.percentual.toFixed(3)),
          comissaoValor: dec(resultado.valorBruto),
          notaFiscalNumero: faturado ? String(Math.floor(100000 + Math.random() * 800000)) : null,
          notaFiscalSerie: faturado ? "1" : null,
          notaFiscalData,
          notaFiscalValor: faturado ? dec(valorLiquido) : null,
          itens: { create: itens },
        },
      });

      // --- parcelas de comissao ---
      const parcelas = gerarParcelas(pedidoParaCalculo, config.plano, resultado);
      for (const p of parcelas) {
        const venceuHa = Math.round((Date.now() - p.vencimento.getTime()) / 86_400_000);

        // Historico: o que venceu ha bastante tempo geralmente foi pago.
        let valorRecebido = 0;
        let recebidoEm: Date | null = null;
        let status: "PREVISTA" | "A_RECEBER" | "VENCIDA" | "PARCIAL" | "RECEBIDA" | "GLOSADA" = "PREVISTA";

        if (venceuHa > 20) {
          const sorte = Math.random();
          if (sorte < 0.86) {
            valorRecebido = p.valorPrevisto;
            recebidoEm = dias(-venceuHa + Math.floor(Math.random() * 4));
            status = "RECEBIDA";
          } else if (sorte < 0.93) {
            valorRecebido = p.valorPrevisto * 0.6;
            recebidoEm = dias(-venceuHa + 2);
            status = "PARCIAL";
          } else {
            status = "VENCIDA";
          }
        } else if (venceuHa > 0) {
          const sorte = Math.random();
          if (sorte < 0.5) {
            valorRecebido = p.valorPrevisto;
            recebidoEm = dias(-venceuHa + 1);
            status = "RECEBIDA";
          } else {
            status = "VENCIDA";
          }
        } else {
          status = statusDaComissao({
            vencimento: p.vencimento,
            valorPrevisto: p.valorPrevisto,
            valorRecebido: 0,
            status: "PREVISTA",
          }) as typeof status;
        }

        const comissao = await prisma.commission.create({
          data: {
            userId: user.id,
            orderId: pedido.id,
            representadaId,
            planId: config.planId,
            descricao: `${p.descricao} · ${cliente.nomeFantasia}`,
            competencia: p.competencia,
            parcela: p.parcela,
            totalParcelas: p.totalParcelas,
            valorPrevisto: dec(p.valorPrevisto),
            valorRecebido: dec(valorRecebido),
            valorImposto: dec(p.valorImposto),
            valorLiquido: dec(p.valorLiquido),
            vencimento: p.vencimento,
            recebidoEm,
            status,
            formaRecebimento:
              representadaId === kaiser.id ? "NOTA_SERVICO" : representadaId === valeVerde.id ? "TED" : "PIX",
            notaServicoNumero:
              representadaId === kaiser.id && status === "RECEBIDA"
                ? String(Math.floor(2000 + Math.random() * 900))
                : null,
          },
        });

        if (valorRecebido > 0 && recebidoEm) {
          await prisma.commissionPayment.create({
            data: {
              commissionId: comissao.id,
              valor: dec(valorRecebido),
              data: recebidoEm,
              forma: representadaId === kaiser.id ? "NOTA_SERVICO" : representadaId === valeVerde.id ? "TED" : "PIX",
              observacao: status === "PARCIAL" ? "Pagamento parcial — saldo em negociação" : null,
            },
          });
        }
      }

      await prisma.activity.create({
        data: {
          userId: user.id,
          clientId: cliente.id,
          representadaId,
          orderId: pedido.id,
          tipo: "pedido",
          titulo: `Pedido ${pedido.numero} lançado`,
          descricao: `${itens.length} itens · comissão de ${resultado.percentual.toFixed(2)}%`,
          createdAt: dataPedido,
        },
      });
    }
  }

  // --- totais consolidados por cliente ---
  console.log("  Consolidando totais...");
  for (const cliente of clientes) {
    const agregado = await prisma.order.aggregate({
      where: { clientId: cliente.id, status: { notIn: ["CANCELADO", "RASCUNHO"] } },
      _sum: { valorLiquido: true },
      _count: true,
    });
    const total = Number(agregado._sum.valorLiquido ?? 0);
    const qtd = agregado._count;
    await prisma.client.update({
      where: { id: cliente.id },
      data: {
        totalComprado: dec(total),
        qtdPedidos: qtd,
        ticketMedio: dec(qtd > 0 ? total / qtd : 0),
      },
    });
  }

  // ================================================================
  // Agenda da semana
  // ================================================================
  console.log("  Montando agenda...");

  const hoje = new Date();
  const agendaHoje = [
    { cliente: clientes[1], hora: "08:30", dur: 55, tipo: "VISITA" as const, status: "CONCLUIDO" as const, resultado: "PEDIDO" as const },
    { cliente: clientes[7], hora: "10:15", dur: 45, tipo: "VISITA" as const, status: "CONCLUIDO" as const, resultado: "ORCAMENTO" as const },
    { cliente: clientes[4], hora: "11:30", dur: 40, tipo: "VISITA" as const, status: "EM_ATENDIMENTO" as const, resultado: null },
    { cliente: clientes[14], hora: "14:00", dur: 45, tipo: "VISITA" as const, status: "CONFIRMADO" as const, resultado: null },
    { cliente: clientes[6], hora: "15:30", dur: 50, tipo: "COBRANCA" as const, status: "PLANEJADO" as const, resultado: null },
    { cliente: clientes[17], hora: "16:45", dur: 35, tipo: "PROSPECCAO" as const, status: "PLANEJADO" as const, resultado: null },
  ];

  for (const item of agendaHoje) {
    const inicio = as(hoje, item.hora);
    await prisma.agendaEvent.create({
      data: {
        userId: user.id,
        clientId: item.cliente.id,
        tipo: item.tipo,
        status: item.status,
        resultado: item.resultado,
        titulo:
          item.tipo === "COBRANCA"
            ? `Cobrança — ${item.cliente.nomeFantasia}`
            : item.tipo === "PROSPECCAO"
              ? `Prospecção — ${item.cliente.nomeFantasia}`
              : `Visita — ${item.cliente.nomeFantasia}`,
        descricao:
          item.tipo === "COBRANCA"
            ? "Título em atraso e pedido travado no financeiro."
            : "Apresentar linha nova e fechar reposição.",
        local: `${item.cliente.cidade}/${item.cliente.uf}`,
        inicio,
        fim: new Date(inicio.getTime() + item.dur * 60_000),
        checkinEm: item.status === "CONCLUIDO" || item.status === "EM_ATENDIMENTO" ? inicio : null,
        checkinLat: item.status === "CONCLUIDO" ? item.cliente.lat : null,
        checkinLng: item.status === "CONCLUIDO" ? item.cliente.lng : null,
        checkoutEm: item.status === "CONCLUIDO" ? new Date(inicio.getTime() + item.dur * 60_000) : null,
        notas:
          item.resultado === "PEDIDO"
            ? "Fechou reposição de bombonas. Pediu prazo maior no próximo."
            : item.resultado === "ORCAMENTO"
              ? "Levou orçamento de discos de corte para aprovação da diretoria."
              : null,
      },
    });
  }

  const proximos = [
    { cliente: clientes[0], dia: 1, hora: "09:00", tipo: "VISITA" as const },
    { cliente: clientes[9], dia: 1, hora: "11:00", tipo: "VISITA" as const },
    { cliente: clientes[8], dia: 1, hora: "14:30", tipo: "VISITA" as const },
    { cliente: clientes[2], dia: 2, hora: "09:30", tipo: "VISITA" as const },
    { cliente: clientes[3], dia: 2, hora: "13:30", tipo: "VISITA" as const },
    { cliente: clientes[16], dia: 2, hora: "15:30", tipo: "PROSPECCAO" as const },
    { cliente: clientes[5], dia: 3, hora: "09:00", tipo: "VISITA" as const },
    { cliente: clientes[6], dia: 3, hora: "11:30", tipo: "VISITA" as const },
    { cliente: clientes[12], dia: 4, hora: "10:00", tipo: "VISITA" as const },
  ];

  for (const p of proximos) {
    const data = dias(p.dia);
    const inicio = as(data, p.hora);
    await prisma.agendaEvent.create({
      data: {
        userId: user.id,
        clientId: p.cliente.id,
        tipo: p.tipo,
        status: "PLANEJADO",
        titulo: `${p.tipo === "PROSPECCAO" ? "Prospecção" : "Visita"} — ${p.cliente.nomeFantasia}`,
        local: `${p.cliente.cidade}/${p.cliente.uf}`,
        inicio,
        fim: new Date(inicio.getTime() + 45 * 60_000),
        geradoAuto: true,
      },
    });
  }

  // reunião com representada
  await prisma.agendaEvent.create({
    data: {
      userId: user.id,
      representadaId: polimold.id,
      tipo: "REUNIAO",
      status: "CONFIRMADO",
      titulo: "Alinhamento mensal — Polimold",
      descricao: "Fechar previsão do mês e revisar tabela de preços.",
      local: "Online",
      inicio: as(dias(2), "17:00"),
      fim: as(dias(2), "18:00"),
    },
  });

  // ================================================================
  // Rota de hoje
  // ================================================================
  console.log("  Traçando rota de hoje...");

  const paradasHoje = agendaHoje.map((a) => a.cliente);
  const rota = await prisma.route.create({
    data: {
      userId: user.id,
      nome: `Rota de ${hoje.toLocaleDateString("pt-BR")}`,
      data: hoje,
      vehicleId: veiculo.id,
      modo: "EQUILIBRADO",
      status: "EM_ANDAMENTO",
      origemLabel: user.baseLabel,
      origemLat: user.baseLat,
      origemLng: user.baseLng,
      retornaBase: true,
      distanciaKm: 168.4,
      duracaoMin: 214,
      consumoLitros: 15.8,
      custoCombustivel: dec(97.8),
      custoManutencao: dec(70.7),
      custoPedagio: dec(18.4),
      custoTotal: dec(186.9),
      kmEconomizados: 42.6,
      reaisEconomizados: dec(47.3),
      provider: "haversine",
      iniciadaEm: as(hoje, "08:05"),
      paradas: {
        create: paradasHoje.map((c, i) => ({
          clientId: c.id,
          ordem: i + 1,
          label: c.nomeFantasia ?? c.razaoSocial,
          lat: c.lat!,
          lng: c.lng!,
          status: i < 2 ? "VISITADO" : i === 2 ? "EM_ROTA" : "PENDENTE",
          distanciaAnteriorKm: Number((12 + Math.random() * 38).toFixed(1)),
          duracaoAnteriorMin: Math.floor(18 + Math.random() * 40),
          permanenciaMin: 45,
          chegadaPrevista: as(hoje, agendaHoje[i].hora),
        })),
      },
    },
  });

  // ================================================================
  // Atividades e avisos
  // ================================================================
  await prisma.activity.createMany({
    data: [
      { userId: user.id, clientId: clientes[6].id, tipo: "whatsapp", titulo: "WhatsApp enviado", descricao: "Perguntei o motivo da queda nos pedidos. Sem resposta até agora.", createdAt: dias(-9) },
      { userId: user.id, clientId: clientes[1].id, tipo: "visita", titulo: "Visita realizada", descricao: "Apresentei a linha de bombonas 200L.", createdAt: dias(-4) },
      { userId: user.id, clientId: clientes[13].id, tipo: "ligacao", titulo: "Tentativa de reativação", descricao: "Comprador trocou. Preciso mapear o novo.", createdAt: dias(-21) },
      { userId: user.id, representadaId: kaiser.id, tipo: "sistema", titulo: "Tabela de preços atualizada", descricao: "Reajuste de 4,2% na linha de abrasivos.", createdAt: dias(-15) },
    ],
  });

  const vencidas = await prisma.commission.findMany({
    where: { userId: user.id, status: "VENCIDA" },
    include: { representada: true },
    orderBy: { vencimento: "asc" },
    take: 3,
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        tipo: "ROTA_DO_DIA",
        titulo: "Sua rota de hoje está pronta",
        corpo: `${paradasHoje.length} paradas · 168 km · custo estimado de R$ 186,90`,
        url: "/rotas",
        chaveUnica: `rota-${hoje.toISOString().slice(0, 10)}`,
        createdAt: as(hoje, "07:10"),
      },
      ...vencidas.map((c, i) => ({
        userId: user.id,
        tipo: "COMISSAO_VENCIDA" as const,
        titulo: `Comissão vencida — ${c.representada.nomeFantasia}`,
        corpo: `${c.descricao} venceu em ${c.vencimento.toLocaleDateString("pt-BR")}.`,
        url: "/comissoes",
        chaveUnica: `venc-${c.id}`,
        createdAt: dias(-i - 1),
      })),
      {
        userId: user.id,
        tipo: "CLIENTE_EM_RISCO",
        titulo: "Serra Azul está sumindo",
        corpo: "74 dias sem visita e 96 sem pedido. Era cliente B.",
        url: `/clientes/${clientes[6].id}`,
        chaveUnica: `risco-${clientes[6].id}`,
        createdAt: dias(-2),
      },
    ],
  });

  // ================================================================
  const resumo = await prisma.$transaction([
    prisma.client.count(),
    prisma.order.count(),
    prisma.commission.count(),
    prisma.agendaEvent.count(),
  ]);

  console.log(`
  Pronto.

    Clientes ......... ${resumo[0]}
    Pedidos .......... ${resumo[1]}
    Comissões ........ ${resumo[2]}
    Compromissos ..... ${resumo[3]}
    Rota de hoje ..... ${rota.id}

    Entre com:
      e-mail: ${EMAIL}
      senha:  ${SENHA}
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
