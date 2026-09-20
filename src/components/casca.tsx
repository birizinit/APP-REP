"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icone, Marca, type NomeIcone } from "@/components/icone";
import { Avatar } from "@/components/ui";
import { cx, primeiroNome } from "@/lib/format";

interface Item {
  href: string;
  rotulo: string;
  icone: NomeIcone;
  exato?: boolean;
}

const principais: Item[] = [
  { href: "/", rotulo: "Meu dia", icone: "dia", exato: true },
  { href: "/agenda", rotulo: "Agenda", icone: "agenda" },
  { href: "/rotas", rotulo: "Rotas", icone: "rota" },
  { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
  { href: "/comissoes", rotulo: "Comissões", icone: "comissao" },
];

const secundarios: Item[] = [
  { href: "/pedidos", rotulo: "Pedidos", icone: "pedido" },
  { href: "/representadas", rotulo: "Representadas", icone: "representada" },
  { href: "/importar", rotulo: "Importar", icone: "importar" },
  { href: "/ajustes", rotulo: "Ajustes", icone: "ajustes" },
];

const atalhos = [
  { href: "/pedidos/novo", rotulo: "Lançar pedido", icone: "pedido" as const, detalhe: "Manual, com cálculo de comissão" },
  { href: "/clientes/novo", rotulo: "Cadastrar cliente", icone: "clientes" as const, detalhe: "Puxa a ficha pelo CNPJ" },
  { href: "/agenda?novo=1", rotulo: "Agendar visita", icone: "calendarioMais" as const, detalhe: "Entra na rota do dia" },
  { href: "/rotas?novo=1", rotulo: "Montar rota", icone: "rota" as const, detalhe: "Otimiza km e combustível" },
  { href: "/importar", rotulo: "Importar arquivo", icone: "importar" as const, detalhe: "Planilha ou PDF de pedido" },
  { href: "/comissoes?baixa=1", rotulo: "Dar baixa", icone: "carimboIcone" as const, detalhe: "Registrar comissão recebida" },
];

function ativo(pathname: string, item: Item) {
  if (item.exato) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Casca({
  usuario,
  naoLidas,
  children,
}: {
  usuario: { nome: string; email: string; avatarUrl: string | null };
  naoLidas: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setSheetAberto(false);
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetAberto(false);
        setMenuAberto(false);
      }
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, []);

  return (
    <div className="min-h-dvh">
      {/* ---------------- lateral (desktop) ---------------- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[252px] flex-col border-r border-papel-borda bg-papel-alto z-30">
        <Link href="/" className="flex items-center gap-2.5 px-5 h-[68px] shrink-0">
          <span className="text-caneta">
            <Marca tamanho={30} />
          </span>
          <span>
            <span className="block font-display font-extrabold text-[18px] tracking-[-0.04em] leading-none text-tinta">
              Representei
            </span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-tinta-3 mt-1">
              talão digital
            </span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto sem-barra px-3 pb-4">
          <div className="space-y-0.5">
            {principais.map((item) => (
              <LinkNav key={item.href} item={item} ativo={ativo(pathname, item)} />
            ))}
          </div>

          <div className="linha-picotada my-4 mx-2" />

          <div className="space-y-0.5">
            {secundarios.map((item) => (
              <LinkNav key={item.href} item={item} ativo={ativo(pathname, item)} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSheetAberto(true)}
            className="botao botao-tinta w-full mt-5"
          >
            <Icone nome="mais" tamanho={17} />
            Novo
          </button>
        </nav>

        <div className="border-t border-papel-borda p-3">
          <BlocoUsuario usuario={usuario} aberto={menuAberto} alternar={() => setMenuAberto((v) => !v)} />
        </div>
      </aside>

      {/* ---------------- topo (mobile) ---------------- */}
      <header className="lg:hidden sticky top-0 z-30 vidro border-b border-papel-borda area-segura-cima">
        <div className="flex items-center gap-2 h-[56px] px-4">
          <Link href="/" className="flex items-center gap-2 mr-auto min-w-0">
            <span className="text-caneta">
              <Marca tamanho={26} />
            </span>
            <span className="font-display font-extrabold text-[17px] tracking-[-0.04em] text-tinta truncate">
              Representei
            </span>
          </Link>

          <Link
            href="/clientes?busca=1"
            aria-label="Buscar"
            className="p-2 rounded-lg text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_8%,transparent)]"
          >
            <Icone nome="busca" tamanho={21} />
          </Link>

          <Link
            href="/avisos"
            aria-label={`Avisos${naoLidas > 0 ? ` (${naoLidas} novos)` : ""}`}
            className="relative p-2 rounded-lg text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_8%,transparent)]"
          >
            <Icone nome="sino" tamanho={21} />
            {naoLidas > 0 ? (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-carimbo text-white text-[9.5px] font-bold grid place-items-center">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Menu"
            className="ml-0.5"
          >
            <Avatar nome={usuario.nome} imagem={usuario.avatarUrl} tamanho={32} />
          </button>
        </div>
      </header>

      {/* ---------------- conteudo ---------------- */}
      <div className="lg:pl-[252px]">
        <main className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 pt-4 lg:pt-7 pb-[112px] lg:pb-14">
          {children}
        </main>
      </div>

      {/* ---------------- barra inferior (mobile) ---------------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 vidro border-t border-papel-borda area-segura-baixo">
        <div className="grid grid-cols-5 h-[62px]">
          {principais.map((item) => {
            const on = ativo(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative flex flex-col items-center justify-center gap-1 transition-colors",
                  on ? "text-caneta" : "text-tinta-3",
                )}
              >
                {on ? (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[2.5px] rounded-full bg-caneta" />
                ) : null}
                <Icone nome={item.icone} tamanho={21} />
                <span className="text-[9.5px] font-semibold tracking-tight">{item.rotulo}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ---------------- botao flutuante ---------------- */}
      <button
        type="button"
        onClick={() => setSheetAberto(true)}
        aria-label="Nova ação"
        className={cx(
          "lg:hidden fixed right-4 z-30 w-[54px] h-[54px] rounded-2xl grid place-items-center",
          "bg-caneta text-white shadow-[var(--shadow-grampo)]",
          "transition-transform active:scale-90",
          sheetAberto && "rotate-45",
        )}
        style={{ bottom: "calc(74px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Icone nome="mais" tamanho={26} />
      </button>

      {/* ---------------- folha de acoes ---------------- */}
      {sheetAberto ? (
        <FolhaAcoes fechar={() => setSheetAberto(false)} />
      ) : null}

      {menuAberto ? (
        <MenuUsuario usuario={usuario} fechar={() => setMenuAberto(false)} />
      ) : null}
    </div>
  );
}

function LinkNav({ item, ativo: on }: { item: Item; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      className={cx(
        "relative flex items-center gap-2.5 px-3 h-[40px] rounded-lg text-[14px] font-medium transition-colors",
        on
          ? "bg-caneta-fundo text-caneta"
          : "text-tinta-2 hover:bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)] hover:text-tinta",
      )}
    >
      {on ? <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-caneta" /> : null}
      <Icone nome={item.icone} tamanho={19} />
      {item.rotulo}
    </Link>
  );
}

// ==================================================================

function FolhaAcoes({ fechar }: { fechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-[rgba(10,8,4,0.5)] anim-surgir backdrop-blur-[2px]"
      />
      <div className="relative w-full sm:max-w-[420px] anim-subir">
        <div className="canhoto picote m-3 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <h2 className="text-[16px]">O que vamos fazer?</h2>
            <button type="button" onClick={fechar} className="p-1.5 -mr-1.5 text-tinta-3">
              <Icone nome="fechar" tamanho={19} />
            </button>
          </div>

          <div className="p-2 pb-5 escala">
            {atalhos.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
              >
                <span className="w-9 h-9 rounded-xl grid place-items-center bg-caneta-fundo text-caneta shrink-0">
                  <Icone nome={a.icone} tamanho={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold text-tinta">{a.rotulo}</span>
                  <span className="block text-[12px] text-tinta-3 truncate">{a.detalhe}</span>
                </span>
                <span className="ml-auto text-tinta-3">
                  <Icone nome="seta" tamanho={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================

function MenuUsuario({
  usuario,
  fechar,
}: {
  usuario: { nome: string; email: string; avatarUrl: string | null };
  fechar: () => void;
}) {
  const router = useRouter();
  const [tema, setTema] = useState<string>("auto");

  useEffect(() => {
    setTema(localStorage.getItem("representei-tema") ?? "auto");
  }, []);

  function trocarTema(novo: string) {
    localStorage.setItem("representei-tema", novo);
    const escuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const aplicado = novo === "auto" ? (escuro ? "estrada" : "papel") : novo;
    document.documentElement.setAttribute("data-theme", aplicado);
    document.documentElement.style.colorScheme = aplicado === "estrada" ? "dark" : "light";
    setTema(novo);
  }

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fechar" onClick={fechar} className="absolute inset-0 bg-[rgba(10,8,4,0.35)] anim-surgir" />
      <div className="absolute right-3 top-[60px] lg:right-auto lg:left-3 lg:bottom-[76px] lg:top-auto w-[268px] anim-subir">
        <div className="canhoto overflow-hidden">
          <div className="flex items-center gap-3 p-3.5 border-b border-papel-borda">
            <Avatar nome={usuario.nome} imagem={usuario.avatarUrl} tamanho={40} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-tinta truncate">{usuario.nome}</p>
              <p className="text-[12px] text-tinta-3 truncate">{usuario.email}</p>
            </div>
          </div>

          <div className="p-2">
            <p className="rotulo px-2 pt-2">Aparência</p>
            <div className="grid grid-cols-3 gap-1.5 px-1 pb-2">
              {[
                { valor: "papel", rotulo: "Papel", icone: "dia" as const },
                { valor: "estrada", rotulo: "Estrada", icone: "rota" as const },
                { valor: "auto", rotulo: "Auto", icone: "atualizar" as const },
              ].map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => trocarTema(op.valor)}
                  className={cx(
                    "flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-semibold transition-colors",
                    tema === op.valor
                      ? "border-caneta bg-caneta-fundo text-caneta"
                      : "border-papel-borda text-tinta-3",
                  )}
                >
                  <Icone nome={op.icone} tamanho={16} />
                  {op.rotulo}
                </button>
              ))}
            </div>

            <div className="linha-picotada my-1.5 mx-1" />

            <div className="lg:hidden">
              {secundarios.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 h-[38px] rounded-lg text-[14px] text-tinta-2 active:bg-[color-mix(in_oklab,var(--color-tinta)_7%,transparent)]"
                >
                  <Icone nome={item.icone} tamanho={17} />
                  {item.rotulo}
                </Link>
              ))}
              <div className="linha-picotada my-1.5 mx-1" />
            </div>

            <button
              type="button"
              onClick={sair}
              className="w-full flex items-center gap-2.5 px-3 h-[38px] rounded-lg text-[14px] text-carimbo active:bg-carimbo-fundo"
            >
              <Icone nome="sair" tamanho={17} />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================

function BlocoUsuario({
  usuario,
  aberto,
  alternar,
}: {
  usuario: { nome: string; email: string; avatarUrl: string | null };
  aberto: boolean;
  alternar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alternar}
      className={cx(
        "w-full flex items-center gap-2.5 p-2 rounded-xl transition-colors text-left",
        aberto ? "bg-caneta-fundo" : "hover:bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)]",
      )}
    >
      <Avatar nome={usuario.nome} imagem={usuario.avatarUrl} tamanho={34} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-tinta truncate">
          {primeiroNome(usuario.nome)}
        </span>
        <span className="block text-[11.5px] text-tinta-3 truncate">Representante</span>
      </span>
      <span className="text-tinta-3">
        <Icone nome="pontos" tamanho={16} />
      </span>
    </button>
  );
}
