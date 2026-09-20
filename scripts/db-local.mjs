/**
 * Postgres local sem instalar nada.
 *
 * Baixa um Postgres portatil na primeira execucao e sobe na porta 5433,
 * com as credenciais que ja estao no .env.example. Util no Windows sem
 * Docker. Em producao (Railway) isso nao e usado.
 *
 *   npm run db:local          sobe e fica rodando
 *   npm run db:local -- stop  derruba e sai
 */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import EmbeddedPostgres from "embedded-postgres";

const PASTA = resolve(process.cwd(), ".pgdata");
const PORTA = 5433;
const USUARIO = "representei";
const SENHA = "representei";
const BANCO = "representei";

const comando = process.argv[2];

const pg = new EmbeddedPostgres({
  databaseDir: PASTA,
  user: USUARIO,
  password: SENHA,
  port: PORTA,
  persistent: true,
  onLog: () => {},
  onError: (mensagem) => {
    const texto = String(mensagem);
    if (/FATAL|PANIC/.test(texto)) console.error("  [pg]", texto.trim());
  },
});

async function subir() {
  const primeiraVez = !existsSync(PASTA);

  if (primeiraVez) {
    console.log("\n  Primeira execução: baixando o Postgres portátil (uma vez só)...");
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(BANCO);
    console.log(`  Banco "${BANCO}" criado.`);
  } catch {
    // ja existia
  }

  console.log(`
  Postgres no ar.

    DATABASE_URL="postgresql://${USUARIO}:${SENHA}@localhost:${PORTA}/${BANCO}?schema=public"

  Em outro terminal:
    npm run db:push
    npm run db:seed
    npm run dev

  Ctrl+C encerra.
`);

  const encerrar = async () => {
    console.log("\n  Parando o Postgres...");
    try {
      await pg.stop();
    } catch {
      /* ja parou */
    }
    process.exit(0);
  };

  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);

  // mantem o processo vivo
  setInterval(() => {}, 1 << 30);
}

async function derrubar() {
  try {
    await pg.stop();
    console.log("  Postgres parado.");
  } catch {
    console.log("  Já estava parado.");
  }
}

async function limpar() {
  await derrubar();
  if (existsSync(PASTA)) {
    rmSync(PASTA, { recursive: true, force: true });
    console.log("  Dados locais apagados.");
  }
}

if (comando === "stop") await derrubar();
else if (comando === "clean") await limpar();
else await subir();
