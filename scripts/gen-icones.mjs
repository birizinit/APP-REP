/**
 * Gera os icones PNG do PWA sem depender de biblioteca de imagem.
 * Desenha a marca (o talao com a via destacada) num buffer RGBA e
 * codifica o PNG na mao com o zlib do proprio Node.
 *
 *   node scripts/gen-icones.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const AZUL = [27, 52, 196, 255]; // caneta
const PAPEL = [251, 248, 241, 255];
const VERDE = [18, 119, 90, 255];

// ------------------------------------------------------------------
// PNG
// ------------------------------------------------------------------

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const nome = Buffer.from(tipo, "ascii");
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])));
  return Buffer.concat([tamanho, nome, dados, crc]);
}

function codificarPng(largura, altura, rgba) {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // cada linha ganha um byte de filtro (0 = nenhum)
  const bruto = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const destino = y * (largura * 4 + 1);
    bruto[destino] = 0;
    rgba.copy(bruto, destino + 1, y * largura * 4, (y + 1) * largura * 4);
  }

  return Buffer.concat([
    assinatura,
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(bruto, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------
// Desenho
// ------------------------------------------------------------------

function criarTela(tamanho) {
  const dados = Buffer.alloc(tamanho * tamanho * 4, 0);
  return {
    tamanho,
    dados,
    pixel(x, y, cor, alfa = 1) {
      if (x < 0 || y < 0 || x >= tamanho || y >= tamanho) return;
      const i = (y * tamanho + x) * 4;
      const a = alfa * (cor[3] / 255);
      dados[i] = Math.round(dados[i] * (1 - a) + cor[0] * a);
      dados[i + 1] = Math.round(dados[i + 1] * (1 - a) + cor[1] * a);
      dados[i + 2] = Math.round(dados[i + 2] * (1 - a) + cor[2] * a);
      dados[i + 3] = Math.max(dados[i + 3], Math.round(255 * a));
    },
  };
}

/** Retangulo com cantos arredondados e borda suavizada. */
function retanguloArredondado(tela, x0, y0, largura, altura, raio, cor) {
  const x1 = x0 + largura;
  const y1 = y0 + altura;

  for (let y = Math.floor(y0) - 1; y <= Math.ceil(y1) + 1; y++) {
    for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      // distancia ate a borda do retangulo arredondado
      const dx = Math.max(x0 + raio - px, 0, px - (x1 - raio));
      const dy = Math.max(y0 + raio - py, 0, py - (y1 - raio));
      const distancia = Math.sqrt(dx * dx + dy * dy);

      const dentro = px >= x0 && px <= x1 && py >= y0 && py <= y1;
      if (!dentro) continue;

      const alfa = Math.max(0, Math.min(1, raio - distancia + 0.5));
      if (alfa > 0) tela.pixel(x, y, cor, alfa);
    }
  }
}

function circulo(tela, cx, cy, raio, cor) {
  for (let y = Math.floor(cy - raio) - 1; y <= Math.ceil(cy + raio) + 1; y++) {
    for (let x = Math.floor(cx - raio) - 1; x <= Math.ceil(cx + raio) + 1; x++) {
      const d = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2);
      const alfa = Math.max(0, Math.min(1, raio - d + 0.5));
      if (alfa > 0) tela.pixel(x, y, cor, alfa);
    }
  }
}

/** A marca: talao azul, linhas de pauta e o canhoto picotado embaixo. */
function desenharMarca(tamanho, { fundoTransparente = false } = {}) {
  const tela = criarTela(tamanho);
  const u = tamanho / 100; // unidade relativa

  if (!fundoTransparente) {
    retanguloArredondado(tela, 0, 0, tamanho, tamanho, 22 * u, AZUL);
  }

  // corpo do talao
  const larguraTalao = 52 * u;
  const alturaTalao = 62 * u;
  const x = (tamanho - larguraTalao) / 2;
  const y = 16 * u;

  retanguloArredondado(tela, x, y, larguraTalao, alturaTalao, 6 * u, PAPEL);

  // linhas escritas
  const margem = 10 * u;
  for (let i = 0; i < 3; i++) {
    const larguraLinha = i === 2 ? larguraTalao - margem * 2 - 14 * u : larguraTalao - margem * 2;
    retanguloArredondado(
      tela,
      x + margem,
      y + 13 * u + i * 11 * u,
      larguraLinha,
      4.5 * u,
      2.2 * u,
      AZUL,
    );
  }

  // picote: recorta o pe do talao com meias-luas da cor do fundo
  const corRecorte = fundoTransparente ? [0, 0, 0, 0] : AZUL;
  const passo = 8 * u;
  for (let cx = x + passo / 2; cx < x + larguraTalao; cx += passo) {
    if (fundoTransparente) {
      // sem fundo, apaga direto os pixels
      for (let yy = Math.floor(y + alturaTalao - 5 * u); yy < tamanho; yy++) {
        for (let xx = Math.floor(cx - 4 * u); xx <= Math.ceil(cx + 4 * u); xx++) {
          const d = Math.sqrt((xx + 0.5 - cx) ** 2 + (yy + 0.5 - (y + alturaTalao)) ** 2);
          if (d < 4 * u) {
            const i = (yy * tamanho + xx) * 4;
            if (i >= 0 && i < tela.dados.length) tela.dados[i + 3] = 0;
          }
        }
      }
    } else {
      circulo(tela, cx, y + alturaTalao, 4 * u, corRecorte);
    }
  }

  // carimbo verde de conferido
  const raioSelo = 13 * u;
  const selloX = tamanho - 24 * u;
  const selloY = tamanho - 24 * u;
  circulo(tela, selloX, selloY, raioSelo + 2.4 * u, PAPEL);
  circulo(tela, selloX, selloY, raioSelo, VERDE);

  // tique branco dentro do selo
  const grossura = 3.4 * u;
  for (let t = 0; t <= 1; t += 0.008) {
    const px = selloX - 6 * u + t * 5 * u;
    const py = selloY + t * 5 * u;
    circulo(tela, px, py, grossura / 2, PAPEL);
  }
  for (let t = 0; t <= 1; t += 0.008) {
    const px = selloX - 1 * u + t * 8 * u;
    const py = selloY + 5 * u - t * 10 * u;
    circulo(tela, px, py, grossura / 2, PAPEL);
  }

  return tela;
}

// ------------------------------------------------------------------

const publico = resolve(process.cwd(), "public");
mkdirSync(publico, { recursive: true });

const tamanhos = [
  { arquivo: "icone-192.png", tamanho: 192 },
  { arquivo: "icone-512.png", tamanho: 512 },
  { arquivo: "icone-180.png", tamanho: 180 },
  { arquivo: "icone-maskable-512.png", tamanho: 512 },
];

for (const { arquivo, tamanho } of tamanhos) {
  const tela = desenharMarca(tamanho);
  writeFileSync(resolve(publico, arquivo), codificarPng(tamanho, tamanho, tela.dados));
  console.log(`  ${arquivo} (${tamanho}x${tamanho})`);
}

// favicon .ico simples: um PNG de 48px embrulhado no cabecalho ICO
const favicon = desenharMarca(48);
const png = codificarPng(48, 48, favicon.dados);
const cabecalho = Buffer.alloc(22);
cabecalho.writeUInt16LE(0, 0);
cabecalho.writeUInt16LE(1, 2);
cabecalho.writeUInt16LE(1, 4);
cabecalho[6] = 48;
cabecalho[7] = 48;
cabecalho[8] = 0;
cabecalho[9] = 0;
cabecalho.writeUInt16LE(1, 10);
cabecalho.writeUInt16LE(32, 12);
cabecalho.writeUInt32LE(png.length, 14);
cabecalho.writeUInt32LE(22, 18);
writeFileSync(resolve(publico, "favicon.ico"), Buffer.concat([cabecalho, png]));
console.log("  favicon.ico (48x48)");

console.log("\n  Ícones gerados em /public.\n");
