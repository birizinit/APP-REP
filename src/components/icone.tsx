import type { SVGProps } from "react";

/**
 * Conjunto de icones proprio do Representei.
 * Grid 24x24, traco 1.6, pontas arredondadas. Alguns tem um preenchimento
 * fraco (duotone) para dar peso sem virar icone solido.
 */

const T = 1.6;

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: T,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const sombra = { fill: "currentColor", opacity: 0.16, stroke: "none" };

const desenhos: Record<string, React.ReactNode> = {
  // ---------- navegacao principal ----------
  dia: (
    <>
      <path {...sombra} d="M4 14a8 8 0 0 1 16 0z" />
      <path {...traco} d="M4 14a8 8 0 0 1 16 0" />
      <path {...traco} d="M2 14h20M12 2v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4" />
      <path {...traco} d="M5 18h5M14 18h5M8 21.5h8" />
    </>
  ),
  agenda: (
    <>
      <rect {...sombra} x="3" y="6" width="18" height="15" rx="2.5" />
      <rect {...traco} x="3" y="6" width="18" height="15" rx="2.5" />
      <path {...traco} d="M3 10.5h18M8 3v4M16 3v4" />
      <path {...traco} d="m8.5 15.5 2 2 4-4" />
    </>
  ),
  rota: (
    <>
      <path
        {...traco}
        d="M6.5 20c0-3.2 3-3.4 5.5-4s5.5-1.2 5.5-4.4"
        strokeDasharray="0.1 3.2"
      />
      <path {...traco} d="M17.5 3c1.4 0 2.5 1.1 2.5 2.6C20 7.6 17.5 10 17.5 10S15 7.6 15 5.6C15 4.1 16.1 3 17.5 3Z" />
      <circle {...traco} cx="17.5" cy="5.7" r="0.9" />
      <circle {...sombra} cx="6.5" cy="20" r="2.4" />
      <circle {...traco} cx="6.5" cy="20" r="2.4" />
    </>
  ),
  clientes: (
    <>
      <path {...sombra} d="M4 9h16v12H4z" />
      <path {...traco} d="M4 9h16v12H4z" />
      <path {...traco} d="M3 9l1.6-4.2A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.4 1L21 9" />
      <path {...traco} d="M9.5 21v-5.5h5V21" />
      <path {...traco} d="M3 9c0 1.4 1.1 2.2 2.4 2.2S8 10.4 8 9M8 9c0 1.4 1.3 2.2 2.6 2.2S13.2 10.4 13.2 9M13.2 9c0 1.4 1.3 2.2 2.6 2.2S18.4 10.4 18.4 9M18.4 9c0 1.4 1.1 2.2 2.6 2.2" />
    </>
  ),
  representada: (
    <>
      <path {...sombra} d="M8 21V12l5.5 3V12l5.5 3v6z" />
      <path {...traco} d="M8 21.2V11.6l5.6 3.2v-3.2l5.6 3.2v6.4" />
      <path {...traco} d="M3.4 21.2V6.4a1.4 1.4 0 0 1 1.4-1.4h1.8A1.4 1.4 0 0 1 8 6.4v14.8" />
      <path {...traco} d="M2 21.2h20" />
      <path {...traco} d="M4.6 2.4h2.2M11 18.4h1.4M16.6 18.4H18" />
    </>
  ),
  pedido: (
    <>
      <path {...sombra} d="M5 3h14v16l-2.3-1.6L14.4 19l-2.4-1.6L9.6 19l-2.3-1.6L5 19z" />
      <path {...traco} d="M5 3h14v16.4l-2.3-1.6-2.3 1.6-2.4-1.6-2.4 1.6-2.3-1.6L5 19.4z" />
      <path {...traco} d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4" />
    </>
  ),
  comissao: (
    <>
      <circle {...sombra} cx="12" cy="12" r="9" />
      <circle {...traco} cx="12" cy="12" r="9" />
      <path {...traco} d="m9 15 6-6" />
      <circle {...traco} cx="9.6" cy="9.6" r="1.4" />
      <circle {...traco} cx="14.4" cy="14.4" r="1.4" />
    </>
  ),
  veiculo: (
    <>
      <path {...sombra} d="M3 16v-3l2-4.5A2 2 0 0 1 6.9 7h10.2a2 2 0 0 1 1.9 1.5L21 13v3z" />
      <path {...traco} d="M3 16.2v-3.4l1.9-4.3A2 2 0 0 1 6.8 7h10.4a2 2 0 0 1 1.9 1.5l1.9 4.3v3.4z" />
      <path {...traco} d="M5 12.8h14" />
      <circle {...traco} cx="7.2" cy="16.4" r="1.9" />
      <circle {...traco} cx="16.8" cy="16.4" r="1.9" />
      <path {...traco} d="M3 13.6h1.4M19.6 13.6H21" />
    </>
  ),
  combustivel: (
    <>
      <path {...sombra} d="M4 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16z" />
      <path {...traco} d="M4 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16" />
      <path {...traco} d="M3 21h11" />
      <path {...traco} d="M6.5 6.5h4v3.5h-4z" />
      <path {...traco} d="M13 9h3.4a1.6 1.6 0 0 1 1.6 1.6v6.2a1.7 1.7 0 0 0 3.4 0V9.4l-2-2.4" />
    </>
  ),
  importar: (
    <>
      <path {...sombra} d="M3 14v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" />
      <path {...traco} d="M3 14.5v4.2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4.2" />
      <path {...traco} d="M12 3v11M8 7l4-4 4 4" />
    </>
  ),
  ajustes: (
    <>
      <path {...traco} d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h8M16 18h4" />
      <circle {...sombra} cx="16" cy="6" r="2.2" />
      <circle {...traco} cx="16" cy="6" r="2.2" />
      <circle {...sombra} cx="9" cy="12" r="2.2" />
      <circle {...traco} cx="9" cy="12" r="2.2" />
      <circle {...sombra} cx="14" cy="18" r="2.2" />
      <circle {...traco} cx="14" cy="18" r="2.2" />
    </>
  ),

  // ---------- acoes ----------
  sino: (
    <>
      <path {...sombra} d="M6 17V11a6 6 0 1 1 12 0v6z" />
      <path {...traco} d="M18 11a6 6 0 1 0-12 0c0 4-1.6 5.2-1.6 5.2h15.2S18 15 18 11Z" />
      <path {...traco} d="M10.4 19.6a2 2 0 0 0 3.2 0" />
    </>
  ),
  pino: (
    <>
      <path {...sombra} d="M12 22s7-6.2 7-11.4A7 7 0 1 0 5 10.6C5 15.8 12 22 12 22Z" />
      <path {...traco} d="M12 21.6s6.8-6 6.8-11A6.8 6.8 0 1 0 5.2 10.6c0 5 6.8 11 6.8 11Z" />
      <circle {...traco} cx="12" cy="10.2" r="2.6" />
    </>
  ),
  busca: (
    <>
      <circle {...traco} cx="10.6" cy="10.6" r="6.6" />
      <path {...traco} d="m15.6 15.6 4.4 4.4" />
    </>
  ),
  mais: <path {...traco} d="M12 5v14M5 12h14" />,
  menos: <path {...traco} d="M5 12h14" />,
  check: <path {...traco} d="m4.5 12.5 5 5 10-11" />,
  fechar: <path {...traco} d="M6 6l12 12M18 6L6 18" />,
  seta: <path {...traco} d="m9 5 7 7-7 7" />,
  setaEsquerda: <path {...traco} d="m15 5-7 7 7 7" />,
  setaBaixo: <path {...traco} d="m5 9 7 7 7-7" />,
  setaCima: <path {...traco} d="m5 15 7-7 7 7" />,
  externo: (
    <>
      <path {...traco} d="M14 4h6v6M20 4l-8.5 8.5" />
      <path {...traco} d="M19 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H10" />
    </>
  ),
  editar: (
    <>
      <path {...traco} d="M4 20.2 4.9 16 16.4 4.5a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L8 19.2z" />
      <path {...traco} d="m15 6 3 3M4.9 16l3 3" />
    </>
  ),
  lixeira: (
    <>
      <path {...traco} d="M4 7h16M10 4h4M9.5 7l.6 13h7.8l.6-13" strokeWidth={T} />
      <path {...traco} d="M6 7l.6 13a1.4 1.4 0 0 0 1.4 1.3h8a1.4 1.4 0 0 0 1.4-1.3L18 7" />
      <path {...traco} d="M10.4 11v6M13.6 11v6" />
    </>
  ),
  filtro: (
    <>
      <path {...sombra} d="M3.5 5h17l-6.6 7.6V19l-3.8 2v-8.4z" />
      <path {...traco} d="M3.5 5h17l-6.6 7.6v6.1l-3.8 2.1v-8.2z" />
    </>
  ),
  pontos: (
    <>
      <circle {...traco} cx="12" cy="5" r="1.3" />
      <circle {...traco} cx="12" cy="12" r="1.3" />
      <circle {...traco} cx="12" cy="19" r="1.3" />
    </>
  ),
  arrastar: (
    <>
      <circle cx="9" cy="6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </>
  ),

  // ---------- contato ----------
  telefone: (
    <>
      <path {...sombra} d="M7.3 3.5 9.6 8l-2 2.3a13 13 0 0 0 6.1 6.1l2.3-2 4.5 2.3v3a2 2 0 0 1-2.2 2C10.9 20.7 3.3 13.1 2.6 4.7a2 2 0 0 1 2-2.2z" />
      <path {...traco} d="M7.2 3.4 9.5 8l-2 2.3a13.4 13.4 0 0 0 6.2 6.2l2.3-2 4.6 2.3v2.9a2 2 0 0 1-2.2 2C10.8 20.8 3.2 13.2 2.5 4.6a2 2 0 0 1 2-2.2z" />
    </>
  ),
  whatsapp: (
    <>
      <path {...traco} d="M3.5 20.5 4.9 16a8.2 8.2 0 1 1 3.2 3.2z" />
      <path {...traco} d="M9 8.6c.3-.7.6-.7 1-.7h.5c.2 0 .4 0 .6.5l.7 1.6c0 .2 0 .4-.2.6l-.5.6c-.1.2-.2.3 0 .6a6.4 6.4 0 0 0 2.8 2.4c.3.1.5.1.6 0l.7-.8c.2-.2.4-.2.6-.1l1.5.8c.3.1.4.3.4.5a1.9 1.9 0 0 1-1.4 1.6c-.6.1-1.2.2-3.4-.8a8.5 8.5 0 0 1-3.6-3.4c-.7-1.3-.7-2-.6-2.5a2 2 0 0 1 .3-.9Z" />
    </>
  ),
  email: (
    <>
      <rect {...sombra} x="3" y="5" width="18" height="14" rx="2.2" />
      <rect {...traco} x="3" y="5" width="18" height="14" rx="2.2" />
      <path {...traco} d="m3.6 7 7.3 5.3a2 2 0 0 0 2.2 0L20.4 7" />
    </>
  ),
  usuario: (
    <>
      <circle {...sombra} cx="12" cy="8.2" r="3.8" />
      <circle {...traco} cx="12" cy="8.2" r="3.8" />
      <path {...traco} d="M4.5 20.4a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sair: (
    <>
      <path {...traco} d="M14 4.5h4A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4" />
      <path {...traco} d="M11 8.5 14.5 12 11 15.5M14.5 12H3.5" />
    </>
  ),

  // ---------- estado / dados ----------
  relogio: (
    <>
      <circle {...sombra} cx="12" cy="12" r="9" />
      <circle {...traco} cx="12" cy="12" r="9" />
      <path {...traco} d="M12 7v5.2l3.4 2" />
    </>
  ),
  alerta: (
    <>
      <path {...sombra} d="M12 3.4 22 20H2z" />
      <path {...traco} d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path {...traco} d="M12 9.5v4.2M12 17.2h.01" />
    </>
  ),
  fogo: (
    <>
      <path {...sombra} d="M12 22c3.9 0 6.5-2.6 6.5-6 0-4.5-4.5-6-4.5-11 0 0-3 1.5-3 5 0 1.6-1 2-1.6 1.2C8.4 9.5 8 8.6 8 8.6S5.5 11 5.5 16c0 3.4 2.6 6 6.5 6Z" />
      <path {...traco} d="M12 21.6c3.7 0 6.2-2.5 6.2-5.8 0-4.4-4.3-5.9-4.3-10.8 0 0-2.9 1.5-2.9 4.9 0 1.5-1 1.9-1.6 1.2C8.7 9.6 8.3 8.7 8.3 8.7s-2.5 2.4-2.5 7.1c0 3.3 2.5 5.8 6.2 5.8Z" />
      <path {...traco} d="M12 21.6c1.7 0 2.8-1.2 2.8-2.7 0-2-2-2.7-2-4.9 0 0-2.6 1.3-2.6 4 0 1.9.9 3.6 1.8 3.6Z" />
    </>
  ),
  alvo: (
    <>
      <circle {...traco} cx="12" cy="12" r="8.6" />
      <circle {...traco} cx="12" cy="12" r="5" />
      <circle {...sombra} cx="12" cy="12" r="1.9" />
      <circle {...traco} cx="12" cy="12" r="1.9" />
    </>
  ),
  grafico: (
    <>
      <path {...traco} d="M3.5 20.5h17" />
      <rect {...sombra} x="5" y="12" width="3.6" height="6" rx="1" />
      <rect {...traco} x="5" y="12" width="3.6" height="6" rx="1" />
      <rect {...sombra} x="10.2" y="8" width="3.6" height="10" rx="1" />
      <rect {...traco} x="10.2" y="8" width="3.6" height="10" rx="1" />
      <rect {...sombra} x="15.4" y="4.5" width="3.6" height="13.5" rx="1" />
      <rect {...traco} x="15.4" y="4.5" width="3.6" height="13.5" rx="1" />
    </>
  ),
  subindo: <path {...traco} d="M3.5 17 9 11.4l3.4 3.4L20.5 6.6M16 6.5h4.5V11" />,
  descendo: <path {...traco} d="M3.5 7 9 12.6l3.4-3.4 8.1 8.2M16 17.5h4.5V13" />,
  carimboIcone: (
    <>
      <path {...sombra} d="M5 16h14v3.5H5z" />
      <path {...traco} d="M4.5 16h15v2.6a1.4 1.4 0 0 1-1.4 1.4H5.9a1.4 1.4 0 0 1-1.4-1.4z" />
      <path {...traco} d="M8 16v-2.2c0-1-.7-1.6-1.2-2.4A4.6 4.6 0 0 1 6 9a6 6 0 0 1 12 0 4.6 4.6 0 0 1-.8 2.4c-.5.8-1.2 1.4-1.2 2.4V16" />
    </>
  ),
  nota: (
    <>
      <path {...sombra} d="M5 3h9l5 5v13H5z" />
      <path {...traco} d="M5.5 3.5h8.2L19 8.8v11.7H5.5z" />
      <path {...traco} d="M13.6 3.5v5.2H19" />
      <path {...traco} d="M8.4 12.6h7M8.4 16h4.6" />
    </>
  ),
  planilha: (
    <>
      <rect {...sombra} x="3.5" y="4" width="17" height="16" rx="2" />
      <rect {...traco} x="3.5" y="4" width="17" height="16" rx="2" />
      <path {...traco} d="M3.5 9.2h17M9.4 9.2V20M15 9.2V20M3.5 14.6h17" />
    </>
  ),
  pdf: (
    <>
      <path {...traco} d="M6 3.5h7.6L18.5 8.4V15" />
      <path {...traco} d="M13.4 3.5v5h5.1" />
      <path {...traco} d="M18.5 15v4.2a1.3 1.3 0 0 1-1.3 1.3H7.3A1.3 1.3 0 0 1 6 19.2V3.5" />
      <path {...sombra} d="M4 12h10v6H4z" />
      <path {...traco} d="M4.4 12.2h9.4v5.6H4.4z" />
      <path {...traco} d="M6.4 16.6v-3h.9a.9.9 0 0 1 0 1.8h-.9M9.6 16.6v-3h.7a1.5 1.5 0 0 1 0 3zM11.8 16.6v-3h1.4M11.8 15.2h1" strokeWidth={1.2} />
    </>
  ),
  clipe: (
    <path
      {...traco}
      d="M20 11.5 12 19.4a4.8 4.8 0 0 1-6.8-6.8l8-7.9a3.2 3.2 0 0 1 4.5 4.5l-7.9 8a1.6 1.6 0 0 1-2.2-2.2l7.3-7.3"
    />
  ),
  baixar: (
    <>
      <path {...traco} d="M12 3.5v11M8 10.5l4 4 4-4" />
      <path {...traco} d="M4 17v2.2a1.3 1.3 0 0 0 1.3 1.3h13.4a1.3 1.3 0 0 0 1.3-1.3V17" />
    </>
  ),
  raio: (
    <>
      <path {...sombra} d="M13.4 2 4.5 13.4h5.6L9.8 22l9.7-11.6h-6z" />
      <path {...traco} d="M13.4 2.4 4.9 13.3h5.5L10 21.6l9.1-11h-5.9z" />
    </>
  ),
  folha: (
    <>
      <path {...sombra} d="M20 4c0 9-5 13-10 13a5 5 0 0 1-5-5C5 6 12 4 20 4Z" />
      <path {...traco} d="M20 4.2c0 8.8-5 12.7-9.8 12.7A5 5 0 0 1 5.3 12C5.3 6.2 12 4.2 20 4.2Z" />
      <path {...traco} d="M4 20.5c1.6-4.6 5-8.3 9.6-10.6" />
    </>
  ),
  balanca: (
    <>
      <path {...traco} d="M12 4v16M8 20.5h8M12 6.5 5 9M12 6.5 19 9" />
      <path {...traco} d="M2.4 13.6 5 8.6l2.6 5a2.9 2.9 0 0 1-5.2 0ZM16.4 13.6 19 8.6l2.6 5a2.9 2.9 0 0 1-5.2 0Z" />
      <circle {...traco} cx="12" cy="4" r="1.3" />
    </>
  ),
  localizar: (
    <>
      <circle {...traco} cx="12" cy="12" r="7" />
      <circle {...sombra} cx="12" cy="12" r="2.6" />
      <circle {...traco} cx="12" cy="12" r="2.6" />
      <path {...traco} d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
    </>
  ),
  bussola: (
    <>
      <circle {...traco} cx="12" cy="12" r="9" />
      <path {...sombra} d="m15.6 8.4-2 5.2-5.2 2 2-5.2z" />
      <path {...traco} d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z" />
    </>
  ),
  estrela: (
    <>
      <path {...sombra} d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z" />
      <path {...traco} d="m12 3.3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9z" />
    </>
  ),
  olho: (
    <>
      <path {...traco} d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle {...sombra} cx="12" cy="12" r="3.2" />
      <circle {...traco} cx="12" cy="12" r="3.2" />
    </>
  ),
  historico: (
    <>
      <path {...traco} d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path {...traco} d="M3 3.5V9h5.4" />
      <path {...traco} d="M12 7.6V12l3 1.8" />
    </>
  ),
  calendarioMais: (
    <>
      <rect {...sombra} x="3" y="6" width="18" height="15" rx="2.5" />
      <rect {...traco} x="3" y="6" width="18" height="15" rx="2.5" />
      <path {...traco} d="M3 10.5h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
    </>
  ),
  tesoura: (
    <>
      <circle {...traco} cx="6" cy="6.5" r="2.5" />
      <circle {...traco} cx="6" cy="17.5" r="2.5" />
      <path {...traco} d="M8.2 7.8 20 18M8.2 16.2 20 6" />
    </>
  ),
  pix: (
    <>
      <path {...sombra} d="m12 3 9 9-9 9-9-9z" />
      <path
        {...traco}
        d="M9.2 4.6a2.6 2.6 0 0 1 3.6 0l1.9 1.9a2.6 2.6 0 0 0 1.8.7h.6l2.3 2.3a2.6 2.6 0 0 1 0 3.6l-2.3 2.3h-.6a2.6 2.6 0 0 0-1.8.7l-1.9 1.9a2.6 2.6 0 0 1-3.6 0l-1.9-1.9a2.6 2.6 0 0 0-1.8-.7h-.6L2.6 13a2.6 2.6 0 0 1 0-3.6l2.3-2.3h.6a2.6 2.6 0 0 0 1.8-.7z"
      />
    </>
  ),
  banco: (
    <>
      <path {...sombra} d="M3 9.5 12 4l9 5.5z" />
      <path {...traco} d="M3 9.8 12 4.2l9 5.6z" />
      <path {...traco} d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3 20.5h18" />
    </>
  ),
  cofre: (
    <>
      <rect {...sombra} x="3" y="4.5" width="18" height="15" rx="2" />
      <rect {...traco} x="3" y="4.5" width="18" height="15" rx="2" />
      <circle {...traco} cx="11" cy="12" r="4" />
      <path {...traco} d="M11 9.6V12l1.6 1M17.5 9v6M6 19.5V21M18 19.5V21" />
    </>
  ),
  menu: <path {...traco} d="M4 7h16M4 12h16M4 17h10" />,
  atualizar: (
    <>
      <path {...traco} d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path {...traco} d="M21 3v5h-5" />
    </>
  ),
  cadeado: (
    <>
      <rect {...sombra} x="4.5" y="10" width="15" height="10.5" rx="2.2" />
      <rect {...traco} x="4.5" y="10" width="15" height="10.5" rx="2.2" />
      <path {...traco} d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <path {...traco} d="M12 14v2.6" />
    </>
  ),
  copia: (
    <>
      <rect {...traco} x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path {...traco} d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
};

export type NomeIcone = keyof typeof desenhos;

export interface IconeProps extends SVGProps<SVGSVGElement> {
  nome: NomeIcone | string;
  tamanho?: number;
}

export function Icone({ nome, tamanho = 22, ...props }: IconeProps) {
  const desenho = desenhos[nome];
  if (!desenho) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {desenho}
    </svg>
  );
}

/** Marca do produto: um talao com a via destacada. */
export function Marca({ tamanho = 34, ...props }: { tamanho?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" width={tamanho} height={tamanho} fill="none" {...props}>
      <rect x="5" y="3.5" width="24" height="30" rx="3" fill="currentColor" opacity="0.14" />
      <path
        d="M7.5 6.5A2.5 2.5 0 0 1 10 4h16a2.5 2.5 0 0 1 2.5 2.5v25.8l-3.2-2.2-3.2 2.2-3.2-2.2-3.2 2.2-3.2-2.2-3.2 2.2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12.5 12h11M12.5 17h11M12.5 22h6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="27.5" r="8" fill="var(--color-papel-alto, #fff)" />
      <circle cx="30" cy="27.5" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m26.8 27.6 2.2 2.2 4.4-4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
