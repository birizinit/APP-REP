/**
 * Ilustracoes de estado vazio, desenhadas a mao.
 * Tudo em currentColor para funcionar nos dois temas.
 */

const linha = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const leve = { fill: "currentColor", opacity: 0.1, stroke: "none" };

export function TalaoVazio({ tamanho = 130 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 160 130" width={tamanho} height={(tamanho * 130) / 160} fill="none">
      <ellipse cx="80" cy="116" rx="52" ry="7" {...leve} />
      <path d="M44 20a5 5 0 0 1 5-5h62a5 5 0 0 1 5 5v84l-8-5.5-8 5.5-8-5.5-8 5.5-8-5.5-8 5.5-8-5.5-8 5.5-8-5.5z" {...leve} />
      <path
        d="M42 22a6 6 0 0 1 6-6h64a6 6 0 0 1 6 6v86l-8.5-5.8-8.5 5.8-8.5-5.8-8.5 5.8-8.5-5.8-8.5 5.8-8.5-5.8L42 108z"
        {...linha}
      />
      <path d="M56 40h48M56 54h48M56 68h30" {...linha} strokeOpacity="0.45" strokeDasharray="1 7" />
      <path d="M118 30c10-3 20 2 22 10" {...linha} strokeOpacity="0.4" />
      <path d="m130 26 10 14-16 2z" {...linha} strokeOpacity="0.4" />
      <circle cx="36" cy="34" r="3" {...linha} strokeOpacity="0.35" />
      <circle cx="36" cy="52" r="3" {...linha} strokeOpacity="0.35" />
    </svg>
  );
}

export function EstradaVazia({ tamanho = 140 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 170 130" width={tamanho} height={(tamanho * 130) / 170} fill="none">
      <path d="M40 126 74 36h22l34 90z" {...leve} />
      <path d="M40 126 74 36h22l34 90" {...linha} />
      <path d="M85 116v-10M85 92v-12M85 66v-12M85 42v-6" {...linha} strokeOpacity="0.5" />
      <path d="M12 126h146" {...linha} strokeOpacity="0.35" />
      <path d="M118 42a10 10 0 1 1 20 0c0 7-10 18-10 18s-10-11-10-18Z" {...linha} />
      <circle cx="128" cy="42" r="3.6" {...linha} />
      <path d="M24 92c6-2 12 0 14 5" {...linha} strokeOpacity="0.3" />
      <path d="M30 74c5-1 9 1 11 4" {...linha} strokeOpacity="0.25" />
      <path d="M142 96c-6-2-12 0-14 5" {...linha} strokeOpacity="0.3" />
    </svg>
  );
}

export function CofreVazio({ tamanho = 130 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 150 130" width={tamanho} height={(tamanho * 130) / 150} fill="none">
      <ellipse cx="75" cy="118" rx="48" ry="6" {...leve} />
      <rect x="22" y="26" width="106" height="82" rx="8" {...leve} />
      <rect x="22" y="26" width="106" height="82" rx="8" {...linha} />
      <circle cx="66" cy="67" r="24" {...linha} />
      <circle cx="66" cy="67" r="6" {...linha} strokeOpacity="0.5" />
      <path d="M66 43v8M66 83v8M42 67h8M82 67h8" {...linha} strokeOpacity="0.5" />
      <path d="M108 48v38" {...linha} />
      <path d="M32 108v8M118 108v8" {...linha} />
      <path d="M96 20c0-6 5-10 11-10s11 4 11 10" {...linha} strokeOpacity="0.35" />
    </svg>
  );
}

export function FabricaVazia({ tamanho = 140 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 170 130" width={tamanho} height={(tamanho * 130) / 170} fill="none">
      <ellipse cx="85" cy="118" rx="58" ry="6" {...leve} />
      <path d="M26 112V58l30 16V58l30 16V38l30 16v58z" {...leve} />
      <path d="M26 112V56l30 17V56l30 17V36l30 17v59z" {...linha} />
      <path d="M44 112V94M74 112V94M104 112V94" {...linha} strokeOpacity="0.5" />
      <path d="M116 36V16h14v22" {...linha} />
      <path d="M120 10c0-4 6-4 6-8M132 12c0-4 6-4 6-8" {...linha} strokeOpacity="0.3" />
      <path d="M140 112h10M16 112h10" {...linha} strokeOpacity="0.4" />
    </svg>
  );
}

export function AgendaVazia({ tamanho = 130 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 150 130" width={tamanho} height={(tamanho * 130) / 150} fill="none">
      <rect x="20" y="28" width="110" height="88" rx="9" {...leve} />
      <rect x="20" y="28" width="110" height="88" rx="9" {...linha} />
      <path d="M20 52h110" {...linha} />
      <path d="M46 16v20M104 16v20" {...linha} />
      <circle cx="50" cy="72" r="4" {...linha} strokeOpacity="0.4" />
      <circle cx="75" cy="72" r="4" {...linha} strokeOpacity="0.4" />
      <circle cx="100" cy="72" r="4" {...linha} strokeOpacity="0.4" />
      <circle cx="50" cy="96" r="4" {...linha} strokeOpacity="0.4" />
      <path d="m68 96 6 6 12-13" {...linha} />
    </svg>
  );
}

export function BuscaVazia({ tamanho = 120 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 140 130" width={tamanho} height={(tamanho * 130) / 140} fill="none">
      <circle cx="60" cy="56" r="34" {...leve} />
      <circle cx="60" cy="56" r="34" {...linha} />
      <path d="m85 81 26 26" {...linha} strokeWidth={4} />
      <path d="M48 50h24M48 62h16" {...linha} strokeOpacity="0.4" strokeDasharray="1 6" />
    </svg>
  );
}
