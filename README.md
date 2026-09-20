# Representei

**O talão digital do representante comercial.** Agenda e roteirizador com custo real de
combustível, carteira de clientes com curva ABC, cadastro de representadas com plano de
comissão, lançamento de pedidos com cálculo automático e controle do que cada indústria
ainda te deve.

Mobile-first, instalável como app (PWA) e com notificação push — porque quem usa está na
estrada, não na mesa.

---

## Começando

### 1. Banco de dados

O projeto usa **PostgreSQL**. Você tem três caminhos:

```bash
# a) Postgres portátil, sem instalar nada (recomendado no Windows sem Docker)
npm run db:local        # baixa na primeira vez e sobe na porta 5433

# b) Docker
docker compose up -d

# c) Railway / Neon / Supabase
# copie a DATABASE_URL do painel para o .env
```

### 2. Configuração

```bash
cp .env.example .env
```

Abra o `.env` e confira:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres |
| `AUTH_SECRET` | Assina o cookie de sessão — gere algo longo e aleatório |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Notificação push (`npm run vapid` gera) |
| `GOOGLE_MAPS_API_KEY` | Opcional. Sem ela o roteirizador usa OSRM, que é grátis |
| `CRON_SECRET` | Protege a rotina de avisos |

### 3. Subir

```bash
npm install
npm run setup     # cria as tabelas e popula a demonstração
npm run dev
```

Entre com **rep@representei.app** / **representei**.

A base de demonstração vem com 18 clientes espalhados por São Paulo, 3 representadas com
planos de comissão bem diferentes entre si, cinco meses de pedidos, as comissões já
parceladas e a agenda da semana montada.

---

## O que tem dentro

### Meu dia
Abre no que importa: a rota de hoje com quilometragem e custo, os compromissos com botão de
check-in, o que está atrasado na representada, a previsão de caixa dos próximos seis meses e
os clientes que estão sumindo.

### Agenda
Semana em tira, compromissos por dia, check-in com prova de localização (guarda a distância
entre você e o endereço cadastrado) e encerramento de visita com resultado — saiu pedido,
ficou orçamento, cliente não estava.

Tem também **sugestão automática da semana**: o sistema ordena a carteira por quem está mais
atrasado em relação à frequência combinada, agrupa por região para o dia não virar
zigue-zague e propõe os horários. Você desmarca quem não quiser e confirma.

### Rotas
O coração do app. Você escolhe as paradas (ou pede para o sistema sugerir) e ele calcula
**os três modos de uma vez**:

- **Mais rápido** — minimiza tempo
- **Mais barato** — minimiza quilômetro
- **Equilibrado** — minimiza o custo real, somando combustível e o valor da sua hora

Para cada um mostra distância, duração, litros, custo de combustível, manutenção, pedágio e
quanto a ordenação economizou em relação à ordem em que você escolheu os clientes.

O consumo sai do veículo cadastrado, com distinção entre trecho urbano e estrada. Se o carro
for flex, o app compara os preços e avisa se compensa abastecer com etanol naquele dia.

Ordenação por vizinho mais próximo com refino 2-opt. Distâncias via Google Directions
(se houver chave), OSRM (grátis) ou cálculo geodésico com fator de malha urbana quando a rede
cai — nunca fica sem resposta.

### Clientes
Cadastro que se preenche sozinho: digite o CNPJ e o app puxa razão social, nome fantasia,
endereço, CNAE, porte, situação cadastral e o quadro societário da Receita (BrasilAPI, com
ReceitaWS de reserva). CEP também é automático, e o endereço vira coordenada para entrar na
rota.

- **Curva ABC automática** por Pareto de faturamento, ajustando a frequência de visita
- **Risco de perder o cliente** — quem passou do prazo de visita, quem parou de comprar
- **ROI por cliente** — quanto ele deixa de comissão depois de descontar o que custa chegar até lá
- Regiões coloridas, etiquetas, histórico completo e atalhos de WhatsApp com mensagem pronta

### Representadas e planos de comissão
Cadastro completo da indústria e, principalmente, o **acerto**:

| Campo | Opções |
|---|---|
| Base de cálculo | Valor bruto, líquido, só o que o cliente pagou, ou margem |
| Percentual | Fixo, progressivo por faixa de volume, ou por linha de produto |
| Gatilho | Emissão do pedido, faturamento (NF), entrega, pagamento do cliente, data fixa |
| Periodicidade | Por pedido, semanal, quinzenal, mensal, bimestral |
| Recebimento | PIX, TED, boleto, depósito, nota de serviço |
| Descontos | Imposto retido, devolução, inadimplência |
| Bônus | Meta do período com prêmio fixo ou percentual |

O editor mostra uma **simulação ao vivo**: "num pedido de R$ 10.000 em 30/60/90 você ganha
R$ X e recebe nestas datas".

### Pedidos
Lançamento manual com busca no catálogo, ou importação. Enquanto você digita, o painel
lateral mostra a comissão, as parcelas com data de vencimento e **quanto cada 1% de desconto
tira do seu bolso**.

Ao salvar, as comissões nascem parceladas conforme o plano. Quando o gatilho é o pagamento do
cliente, um pedido 30/60/90 vira três comissões, cada uma vencendo junto com a parcela dele.

### Comissões a receber
Tudo que cada representada deve, com status calculado pelo vencimento: prevista, a receber,
vencida, parcial, recebida, glosada. Baixa total ou parcial com forma de recebimento e número
da nota de serviço. Glosa quando a fábrica corta a comissão, com motivo registrado.

O botão **"passar a régua"** recalcula os status e dispara os avisos pendentes.

### Importação
- **Planilha** (.xlsx / .csv) de clientes ou pedidos — o app adivinha o mapeamento das colunas
  e mostra a prévia para você conferir antes de gravar
- **PDF de pedido** da fábrica — extrai CNPJ, número, data, condição de pagamento e os itens,
  com um indicador de confiança, já que cada indústria tem um layout

### Notificações push
Service worker próprio. Avisa sobre a rota do dia, 30 minutos antes de cada visita, três dias
antes de a comissão vencer, no dia do atraso e quando um cliente bom some da carteira.

Para automatizar, aponte um cron para a rotina:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-APP/api/cron/avisos
```

De hora em hora é suficiente. Cada aviso tem chave única, então rodar várias vezes não
duplica notificação.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run setup` | Cria as tabelas e popula a demonstração |
| `npm run db:local` | Postgres portátil na porta 5433 |
| `npm run db:studio` | Interface visual do banco |
| `npm run db:seed` | Repovoa a demonstração |
| `npm run vapid` | Gera as chaves de notificação push |
| `npm run icones` | Regera os ícones do PWA |
| `npm run preview` | Tira print de todas as telas (precisa do app rodando) |
| `npm run typecheck` | Confere os tipos |

---

## Como está organizado

```
prisma/schema.prisma      modelo de dados completo
prisma/seed.ts            demonstração

src/lib/
  comissao.ts             motor de comissão: base, faixas, gatilhos, parcelas
  rotas.ts                roteirizador: matriz, 2-opt, custo, combustível
  analise.ts              curva ABC, risco, fila de visita, ROI, fluxo de caixa
  consultas.ts            CNPJ, CEP e geocodificação
  importacao.ts           leitura de planilha e PDF
  format.ts               formatação brasileira
  push.ts                 notificações

src/app/actions/          server actions (tudo que grava passa por aqui)
src/app/(app)/            telas autenticadas
src/components/           ícones, ilustrações e componentes do sistema visual
```

O motor de comissão e o roteirizador são funções puras — recebem dados, devolvem resultado.
Isso deixa o cálculo previsível e permite usar exatamente o mesmo código no servidor (ao
salvar o pedido) e no navegador (na simulação ao vivo).

---

## Identidade visual

O sistema se chama **Talão** e é uma releitura do bloco de pedido carbonado:

- **Papel** — bone quente, textura de grão, pauta de livro-caixa
- **Tinta** — azul de caneta esferográfica
- **Canhoto** — os cartões têm borda picotada, como via destacável
- **Carimbo** — PAGO, VENCIDO, FEITA aparecem carimbados, levemente tortos
- **Vias carbonadas** — rosa, amarela, azul e verde viram a semântica de status
- **Modo Estrada** — tema escuro para dirigir à noite

A paleta dos gráficos foi validada para contraste e daltonismo nos dois temas; como o par
azul/vermelho fica no piso em tritanopia, toda série carrega legenda e rótulo direto — nunca
só a cor.

Tipografia: Bricolage Grotesque (títulos), Instrument Sans (interface), DM Mono (dinheiro,
placas, códigos).

---

## Publicar no Railway

1. Crie o projeto e adicione um Postgres
2. Conecte este repositório
3. Variáveis: `DATABASE_URL` (o Railway preenche), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`,
   as chaves VAPID e `CRON_SECRET`
4. Build: `npm run build` · Start: `npm start`
5. Depois do primeiro deploy, rode `npx prisma db push` apontando para o banco de produção

O push exige HTTPS, o que o Railway já entrega. No iPhone é preciso adicionar o app à tela de
início antes de ativar as notificações.
