/**
 * Tira print de todas as telas com o app rodando, para revisar layout
 * sem abrir o navegador na mao. Usa o Chrome/Edge ja instalado.
 *
 *   npm start           (em outro terminal)
 *   npm run preview
 *   TEMA=estrada npm run preview     -> captura no modo escuro
 */

import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import puppeteer from "puppeteer-core";
import { SignJWT } from "jose";
import { config } from "dotenv";

config();

const CANDIDATOS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const CHROME = CANDIDATOS.find((caminho) => existsSync(caminho));
if (!CHROME) {
  console.error("\n  Nenhum Chrome/Edge encontrado. Defina CHROME_PATH no .env.\n");
  process.exit(1);
}

const BASE = process.env.PREVIEW_URL ?? "http://localhost:3000";
const SAIDA = process.argv[2] ?? resolve(process.cwd(), ".preview");
const ESCURO = process.env.TEMA === "estrada";

mkdirSync(SAIDA, { recursive: true });

const segredo = new TextEncoder().encode(process.env.AUTH_SECRET);

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const user = await prisma.user.findFirst();
await prisma.$disconnect();

if (!user) {
  console.error("\n  Nenhum usuário no banco. Rode `npm run db:seed` antes.\n");
  process.exit(1);
}

const token = await new SignJWT({ sub: user.id })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setIssuer("representei")
  .setExpirationTime("1d")
  .sign(segredo);

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const paginas = [
  { rota: "/entrar", nome: "01-entrar", autenticado: false, largura: 1280, altura: 900 },
  { rota: "/", nome: "02-meudia-mobile", largura: 400, altura: 1500 },
  { rota: "/", nome: "03-meudia-desktop", largura: 1360, altura: 1600 },
  { rota: "/agenda", nome: "04-agenda", largura: 400, altura: 1400 },
  { rota: "/rotas", nome: "05-rotas", largura: 1360, altura: 1200 },
  { rota: "/rotas?novo=1", nome: "06-montador", largura: 1360, altura: 1300 },
  { rota: "/clientes", nome: "07-clientes", largura: 1360, altura: 1300 },
  { rota: "/comissoes", nome: "08-comissoes", largura: 1360, altura: 1400 },
  { rota: "/representadas", nome: "09-representadas", largura: 1360, altura: 1200 },
  { rota: "/pedidos/novo", nome: "10-novo-pedido", largura: 1360, altura: 1300 },
  { rota: "/importar", nome: "11-importar", largura: 1360, altura: 1100 },
  { rota: "/ajustes", nome: "12-ajustes", largura: 1360, altura: 1400 },
];

const problemas = [];

for (const p of paginas) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: p.largura, height: p.altura, deviceScaleFactor: 1 });
  await pagina.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: ESCURO ? "dark" : "light" },
  ]);

  pagina.on("console", (m) => {
    if (m.type() === "error") problemas.push(`[${p.nome}] console: ${m.text().slice(0, 200)}`);
  });
  pagina.on("pageerror", (e) => problemas.push(`[${p.nome}] erro: ${String(e).slice(0, 200)}`));

  if (p.autenticado !== false) {
    await pagina.setCookie({
      name: "representei_sessao",
      value: token,
      domain: new URL(BASE).hostname,
      path: "/",
      httpOnly: true,
    });
  }

  const resposta = await pagina.goto(`${BASE}${p.rota}`, {
    waitUntil: "networkidle2",
    timeout: 45000,
  });

  if (!resposta || resposta.status() >= 400) {
    problemas.push(`[${p.nome}] HTTP ${resposta?.status()}`);
  }

  await new Promise((r) => setTimeout(r, 1400));
  await pagina.screenshot({ path: resolve(SAIDA, `${p.nome}.png`), fullPage: false });
  console.log(`  ${p.nome} — ${resposta?.status()}`);
  await pagina.close();
}

await navegador.close();

if (problemas.length > 0) {
  console.log("\n  PROBLEMAS:");
  for (const p of [...new Set(problemas)]) console.log(`   - ${p}`);
  process.exitCode = 1;
} else {
  console.log(`\n  Sem erros de console. Prints em ${SAIDA}\n`);
}
