-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Combustivel" AS ENUM ('GASOLINA', 'ETANOL', 'DIESEL', 'GNV', 'ELETRICO');

-- CreateEnum
CREATE TYPE "StatusRepresentada" AS ENUM ('ATIVA', 'PAUSADA', 'ENCERRADA', 'PROSPECCAO');

-- CreateEnum
CREATE TYPE "BaseCalculo" AS ENUM ('VALOR_BRUTO', 'VALOR_LIQUIDO', 'VALOR_RECEBIDO', 'MARGEM');

-- CreateEnum
CREATE TYPE "GatilhoComissao" AS ENUM ('EMISSAO_PEDIDO', 'EMISSAO_NF', 'ENTREGA', 'PAGAMENTO_CLIENTE', 'DATA_FIXA');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('POR_PEDIDO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL');

-- CreateEnum
CREATE TYPE "FormaRecebimento" AS ENUM ('PIX', 'TED', 'BOLETO', 'DEPOSITO', 'NOTA_SERVICO', 'DINHEIRO');

-- CreateEnum
CREATE TYPE "TipoFaixa" AS ENUM ('UNICO', 'PROGRESSIVO', 'POR_LINHA');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('PJ', 'PF');

-- CreateEnum
CREATE TYPE "Curva" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('PROSPECT', 'ATIVO', 'INATIVO', 'EM_RISCO', 'BLOQUEADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoCompromisso" AS ENUM ('VISITA', 'PROSPECCAO', 'COBRANCA', 'ENTREGA', 'REUNIAO', 'TREINAMENTO', 'POS_VENDA', 'PESSOAL');

-- CreateEnum
CREATE TYPE "StatusCompromisso" AS ENUM ('PLANEJADO', 'CONFIRMADO', 'EM_ROTA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'REAGENDADO', 'NAO_ATENDIDO');

-- CreateEnum
CREATE TYPE "ResultadoVisita" AS ENUM ('PEDIDO', 'ORCAMENTO', 'SEM_PEDIDO', 'CLIENTE_AUSENTE', 'AGENDOU_RETORNO', 'RECLAMACAO');

-- CreateEnum
CREATE TYPE "ModoRota" AS ENUM ('RAPIDO', 'ECONOMICO', 'EQUILIBRADO');

-- CreateEnum
CREATE TYPE "StatusRota" AS ENUM ('RASCUNHO', 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusParada" AS ENUM ('PENDENTE', 'EM_ROTA', 'VISITADO', 'PULADO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'FATURADO', 'ENTREGUE', 'CANCELADO', 'DEVOLVIDO');

-- CreateEnum
CREATE TYPE "OrigemPedido" AS ENUM ('MANUAL', 'PDF', 'PLANILHA', 'API');

-- CreateEnum
CREATE TYPE "TipoFrete" AS ENUM ('CIF', 'FOB', 'SEM_FRETE');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('PREVISTA', 'A_RECEBER', 'VENCIDA', 'PARCIAL', 'RECEBIDA', 'GLOSADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ROTA_DO_DIA', 'VISITA_PROXIMA', 'CLIENTE_EM_RISCO', 'COMISSAO_A_VENCER', 'COMISSAO_VENCIDA', 'COMISSAO_RECEBIDA', 'PEDIDO_FATURADO', 'META', 'ANIVERSARIO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "StatusImportacao" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'ERRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "cpfCnpj" TEXT,
    "avatarUrl" TEXT,
    "baseLabel" TEXT DEFAULT 'Minha base',
    "baseCep" TEXT,
    "baseRua" TEXT,
    "baseNum" TEXT,
    "baseBairro" TEXT,
    "baseCidade" TEXT,
    "baseUf" TEXT,
    "baseLat" DOUBLE PRECISION,
    "baseLng" DOUBLE PRECISION,
    "metaMensal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "metaVisitasDia" INTEGER NOT NULL DEFAULT 8,
    "jornadaInicio" TEXT NOT NULL DEFAULT '08:00',
    "jornadaFim" TEXT NOT NULL DEFAULT '18:00',
    "almocoInicio" TEXT NOT NULL DEFAULT '12:00',
    "almocoMinutos" INTEGER NOT NULL DEFAULT 60,
    "tema" TEXT NOT NULL DEFAULT 'papel',
    "onboardingFeito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apelido" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "placa" TEXT,
    "cor" TEXT,
    "combustivel" "Combustivel" NOT NULL DEFAULT 'GASOLINA',
    "flex" BOOLEAN NOT NULL DEFAULT false,
    "consumoCidade" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "consumoEstrada" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "precoGasolina" DECIMAL(8,3) NOT NULL DEFAULT 6.09,
    "precoEtanol" DECIMAL(8,3) NOT NULL DEFAULT 4.29,
    "precoDiesel" DECIMAL(8,3) NOT NULL DEFAULT 6.19,
    "precoKwh" DECIMAL(8,3) NOT NULL DEFAULT 0.95,
    "custoManutencaoKm" DECIMAL(8,3) NOT NULL DEFAULT 0.35,
    "pedagioMedioDia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hodometro" INTEGER,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "litros" DOUBLE PRECISION NOT NULL,
    "valorLitro" DECIMAL(8,3) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "hodometro" INTEGER,
    "posto" TEXT,
    "tanqueCheio" BOOLEAN NOT NULL DEFAULT true,
    "combustivel" "Combustivel" NOT NULL DEFAULT 'GASOLINA',

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representadas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "segmento" TEXT,
    "site" TEXT,
    "logoUrl" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#1B3BD8',
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "contatoNome" TEXT,
    "contatoCargo" TEXT,
    "contatoEmail" TEXT,
    "contatoFone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "status" "StatusRepresentada" NOT NULL DEFAULT 'ATIVA',
    "contratoInicio" TIMESTAMP(3),
    "contratoFim" TIMESTAMP(3),
    "exclusividade" BOOLEAN NOT NULL DEFAULT false,
    "territorio" TEXT,
    "prazoEntregaDias" INTEGER,
    "pedidoMinimo" DECIMAL(12,2),
    "metaMensal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "representadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_comissao" (
    "id" TEXT NOT NULL,
    "representadaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Plano padrao',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "baseCalculo" "BaseCalculo" NOT NULL DEFAULT 'VALOR_LIQUIDO',
    "tipoFaixa" "TipoFaixa" NOT NULL DEFAULT 'UNICO',
    "percentualPadrao" DECIMAL(6,3) NOT NULL DEFAULT 5,
    "gatilho" "GatilhoComissao" NOT NULL DEFAULT 'PAGAMENTO_CLIENTE',
    "prazoDias" INTEGER NOT NULL DEFAULT 30,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "diaPagamento" INTEGER,
    "formaRecebimento" "FormaRecebimento" NOT NULL DEFAULT 'PIX',
    "emiteNotaServico" BOOLEAN NOT NULL DEFAULT false,
    "impostoPercentual" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "descontaDevolucao" BOOLEAN NOT NULL DEFAULT true,
    "descontaInadimplencia" BOOLEAN NOT NULL DEFAULT true,
    "antecipavel" BOOLEAN NOT NULL DEFAULT false,
    "bonusMeta" DECIMAL(14,2),
    "bonusPercentual" DECIMAL(6,3),
    "metaPeriodo" DECIMAL(14,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faixas_comissao" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "rotulo" TEXT,
    "deValor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ateValor" DECIMAL(14,2),
    "percentual" DECIMAL(6,3) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faixas_comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regioes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#E0623A',
    "uf" TEXT,
    "cidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diaSemana" INTEGER,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'PJ',
    "cnpj" TEXT,
    "cpf" TEXT,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "inscricaoEstadual" TEXT,
    "inscricaoMunicipal" TEXT,
    "situacaoCadastral" TEXT,
    "cnaePrincipal" TEXT,
    "cnaeDescricao" TEXT,
    "porte" TEXT,
    "naturezaJuridica" TEXT,
    "dataAbertura" TIMESTAMP(3),
    "capitalSocial" DECIMAL(16,2),
    "socios" JSONB,
    "enriquecidoEm" TIMESTAMP(3),
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "site" TEXT,
    "contatoNome" TEXT,
    "contatoCargo" TEXT,
    "contatoEmail" TEXT,
    "contatoFone" TEXT,
    "contatoNascimento" TIMESTAMP(3),
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "pais" TEXT DEFAULT 'BR',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geocodadoEm" TIMESTAMP(3),
    "pontoReferencia" TEXT,
    "regionId" TEXT,
    "curva" "Curva" NOT NULL DEFAULT 'C',
    "curvaAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusCliente" NOT NULL DEFAULT 'PROSPECT',
    "potencialMensal" DECIMAL(14,2),
    "frequenciaVisitaDias" INTEGER NOT NULL DEFAULT 30,
    "tempoVisitaMin" INTEGER NOT NULL DEFAULT 40,
    "diasAtendimento" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "horaAbre" TEXT DEFAULT '08:00',
    "horaFecha" TEXT DEFAULT '18:00',
    "horarioAlmoco" TEXT,
    "limiteCredito" DECIMAL(14,2),
    "condicaoPagamento" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "origem" TEXT,
    "observacoes" TEXT,
    "ultimaVisitaEm" TIMESTAMP(3),
    "ultimoPedidoEm" TIMESTAMP(3),
    "proximaVisitaEm" TIMESTAMP(3),
    "totalComprado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "qtdPedidos" INTEGER NOT NULL DEFAULT 0,
    "ticketMedio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_representadas" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "representadaId" TEXT NOT NULL,
    "codigoNoFornecedor" TEXT,
    "desde" TIMESTAMP(3),
    "observacoes" TEXT,

    CONSTRAINT "clientes_representadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "representadaId" TEXT,
    "tipo" "TipoCompromisso" NOT NULL DEFAULT 'VISITA',
    "status" "StatusCompromisso" NOT NULL DEFAULT 'PLANEJADO',
    "resultado" "ResultadoVisita",
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "checkinEm" TIMESTAMP(3),
    "checkinLat" DOUBLE PRECISION,
    "checkinLng" DOUBLE PRECISION,
    "checkinDistanciaM" INTEGER,
    "checkoutEm" TIMESTAMP(3),
    "notas" TEXT,
    "lembreteMin" INTEGER DEFAULT 30,
    "lembreteEnviadoEm" TIMESTAMP(3),
    "geradoAuto" BOOLEAN NOT NULL DEFAULT false,
    "routeStopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT,
    "modo" "ModoRota" NOT NULL DEFAULT 'EQUILIBRADO',
    "status" "StatusRota" NOT NULL DEFAULT 'RASCUNHO',
    "origemLabel" TEXT,
    "origemLat" DOUBLE PRECISION,
    "origemLng" DOUBLE PRECISION,
    "retornaBase" BOOLEAN NOT NULL DEFAULT true,
    "distanciaKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duracaoMin" INTEGER NOT NULL DEFAULT 0,
    "consumoLitros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoCombustivel" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoManutencao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoPedagio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "kmEconomizados" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reaisEconomizados" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'osrm',
    "polyline" TEXT,
    "iniciadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paradas" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "clientId" TEXT,
    "ordem" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" "StatusParada" NOT NULL DEFAULT 'PENDENTE',
    "distanciaAnteriorKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duracaoAnteriorMin" INTEGER NOT NULL DEFAULT 0,
    "chegadaPrevista" TIMESTAMP(3),
    "saidaPrevista" TIMESTAMP(3),
    "permanenciaMin" INTEGER NOT NULL DEFAULT 40,
    "fixo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "paradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "representadaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "precoTabela" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "ncm" TEXT,
    "linha" TEXT,
    "comissaoPercentual" DECIMAL(6,3),
    "descontoMax" DECIMAL(6,3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "representadaId" TEXT NOT NULL,
    "planId" TEXT,
    "numero" TEXT NOT NULL,
    "numeroFornecedor" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusPedido" NOT NULL DEFAULT 'ENVIADO',
    "origem" "OrigemPedido" NOT NULL DEFAULT 'MANUAL',
    "valorBruto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "descontoValor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "descontoPercentual" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "valorFrete" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorImpostos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorLiquido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tipoFrete" "TipoFrete" NOT NULL DEFAULT 'CIF',
    "condicaoPagamento" TEXT DEFAULT '30/60/90',
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "prazoMedioDias" INTEGER NOT NULL DEFAULT 30,
    "primeiroVencimento" TIMESTAMP(3),
    "comissaoBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comissaoPercentual" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "comissaoValor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comissaoManual" BOOLEAN NOT NULL DEFAULT false,
    "notaFiscalNumero" TEXT,
    "notaFiscalSerie" TEXT,
    "notaFiscalData" TIMESTAMP(3),
    "notaFiscalChave" TEXT,
    "notaFiscalValor" DECIMAL(14,2),
    "arquivoNome" TEXT,
    "arquivoUrl" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "quantidade" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "precoUnitario" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "descontoPercentual" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comissaoPercentual" DECIMAL(6,3),
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "representadaId" TEXT NOT NULL,
    "planId" TEXT,
    "descricao" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorPrevisto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorRecebido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorImposto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorLiquido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "recebidoEm" TIMESTAMP(3),
    "status" "StatusComissao" NOT NULL DEFAULT 'PREVISTA',
    "formaRecebimento" "FormaRecebimento",
    "notaServicoNumero" TEXT,
    "comprovanteNome" TEXT,
    "comprovanteUrl" TEXT,
    "motivoGlosa" TEXT,
    "observacoes" TEXT,
    "lembrete3d" BOOLEAN NOT NULL DEFAULT false,
    "lembreteDia" BOOLEAN NOT NULL DEFAULT false,
    "lembreteAtraso" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baixas_comissao" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forma" "FormaRecebimento" NOT NULL DEFAULT 'PIX',
    "comprovanteNome" TEXT,
    "comprovanteUrl" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baixas_comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "representadaId" TEXT,
    "orderId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL DEFAULT 'SISTEMA',
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "url" TEXT,
    "icone" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "enviadaPush" BOOLEAN NOT NULL DEFAULT false,
    "agendadaPara" TIMESTAMP(3),
    "chaveUnica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "status" "StatusImportacao" NOT NULL DEFAULT 'PENDENTE',
    "totalLinhas" INTEGER NOT NULL DEFAULT 0,
    "importados" INTEGER NOT NULL DEFAULT 0,
    "atualizados" INTEGER NOT NULL DEFAULT 0,
    "ignorados" INTEGER NOT NULL DEFAULT 0,
    "erros" JSONB,
    "preview" JSONB,
    "mapeamento" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "veiculos_userId_idx" ON "veiculos"("userId");

-- CreateIndex
CREATE INDEX "abastecimentos_vehicleId_data_idx" ON "abastecimentos"("vehicleId", "data");

-- CreateIndex
CREATE INDEX "representadas_userId_idx" ON "representadas"("userId");

-- CreateIndex
CREATE INDEX "planos_comissao_representadaId_idx" ON "planos_comissao"("representadaId");

-- CreateIndex
CREATE INDEX "faixas_comissao_planId_idx" ON "faixas_comissao"("planId");

-- CreateIndex
CREATE INDEX "regioes_userId_idx" ON "regioes"("userId");

-- CreateIndex
CREATE INDEX "clientes_userId_status_idx" ON "clientes"("userId", "status");

-- CreateIndex
CREATE INDEX "clientes_userId_regionId_idx" ON "clientes"("userId", "regionId");

-- CreateIndex
CREATE INDEX "clientes_cnpj_idx" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_representadas_clientId_representadaId_key" ON "clientes_representadas"("clientId", "representadaId");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_routeStopId_key" ON "agenda"("routeStopId");

-- CreateIndex
CREATE INDEX "agenda_userId_inicio_idx" ON "agenda"("userId", "inicio");

-- CreateIndex
CREATE INDEX "agenda_clientId_idx" ON "agenda"("clientId");

-- CreateIndex
CREATE INDEX "rotas_userId_data_idx" ON "rotas"("userId", "data");

-- CreateIndex
CREATE INDEX "paradas_routeId_ordem_idx" ON "paradas"("routeId", "ordem");

-- CreateIndex
CREATE INDEX "produtos_representadaId_idx" ON "produtos"("representadaId");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_representadaId_codigo_key" ON "produtos"("representadaId", "codigo");

-- CreateIndex
CREATE INDEX "pedidos_userId_data_idx" ON "pedidos"("userId", "data");

-- CreateIndex
CREATE INDEX "pedidos_clientId_idx" ON "pedidos"("clientId");

-- CreateIndex
CREATE INDEX "pedidos_representadaId_idx" ON "pedidos"("representadaId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_userId_numero_key" ON "pedidos"("userId", "numero");

-- CreateIndex
CREATE INDEX "itens_pedido_orderId_idx" ON "itens_pedido"("orderId");

-- CreateIndex
CREATE INDEX "comissoes_userId_status_vencimento_idx" ON "comissoes"("userId", "status", "vencimento");

-- CreateIndex
CREATE INDEX "comissoes_representadaId_idx" ON "comissoes"("representadaId");

-- CreateIndex
CREATE INDEX "baixas_comissao_commissionId_idx" ON "baixas_comissao"("commissionId");

-- CreateIndex
CREATE INDEX "atividades_userId_createdAt_idx" ON "atividades"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "atividades_clientId_createdAt_idx" ON "atividades"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_chaveUnica_key" ON "notificacoes"("chaveUnica");

-- CreateIndex
CREATE INDEX "notificacoes_userId_createdAt_idx" ON "notificacoes"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "importacoes_userId_createdAt_idx" ON "importacoes"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representadas" ADD CONSTRAINT "representadas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_comissao" ADD CONSTRAINT "planos_comissao_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faixas_comissao" ADD CONSTRAINT "faixas_comissao_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planos_comissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regioes" ADD CONSTRAINT "regioes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regioes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_representadas" ADD CONSTRAINT "clientes_representadas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_representadas" ADD CONSTRAINT "clientes_representadas_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "paradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradas" ADD CONSTRAINT "paradas_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "rotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradas" ADD CONSTRAINT "paradas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planos_comissao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_productId_fkey" FOREIGN KEY ("productId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planos_comissao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baixas_comissao" ADD CONSTRAINT "baixas_comissao_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "comissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_representadaId_fkey" FOREIGN KEY ("representadaId") REFERENCES "representadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

