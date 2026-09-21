"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { alternarAdmin, criarUsuario, redefinirSenha } from "@/app/actions/usuarios";
import { Icone } from "@/components/icone";
import { Avatar, Campo, Canhoto, CanhotoTitulo, Etiqueta } from "@/components/ui";
import { cx } from "@/lib/format";

type AvisoT = { tipo: "ok" | "erro"; texto: string } | null;

function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<AvisoT>(null);

  function executar(
    fn: () => Promise<{ erro?: string; ok?: boolean } | void>,
    sucesso: string,
    depois?: () => void,
  ) {
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (r && "erro" in r && r.erro) {
        setAviso({ tipo: "erro", texto: r.erro });
        return;
      }
      setAviso({ tipo: "ok", texto: sucesso });
      depois?.();
      router.refresh();
      setTimeout(() => setAviso(null), 4000);
    });
  }

  return { pendente, aviso, executar };
}

function Aviso({ aviso }: { aviso: AvisoT }) {
  if (!aviso) return null;
  return (
    <p
      className={cx(
        "flex items-center gap-2 text-[12.5px] rounded-xl px-3 py-2.5 anim-surgir",
        aviso.tipo === "ok" ? "text-quitado bg-quitado-fundo" : "text-carimbo bg-carimbo-fundo",
      )}
    >
      <Icone nome={aviso.tipo === "ok" ? "check" : "alerta"} tamanho={14} />
      {aviso.texto}
    </p>
  );
}

// ==================================================================
// Nova conta
// ==================================================================

export function NovoUsuario() {
  const { pendente, aviso, executar } = useAcao();
  const form = useRef<HTMLFormElement>(null);

  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Nova conta"
        sub="Passe o e-mail e a senha para a pessoa; ela troca a senha em Ajustes."
        icone="mais"
      />
      <form
        ref={form}
        action={(d) =>
          executar(() => criarUsuario(d), "Conta criada.", () => form.current?.reset())
        }
        className="px-4 pb-4 space-y-3"
      >
        <div className="grid sm:grid-cols-3 gap-3">
          <Campo rotulo="Nome" obrigatorio>
            <input name="nome" className="campo" required minLength={3} autoComplete="off" />
          </Campo>
          <Campo rotulo="E-mail" obrigatorio>
            <input name="email" type="email" className="campo" required autoComplete="off" />
          </Campo>
          <Campo rotulo="Senha provisória" obrigatorio dica="Mínimo de 6 caracteres.">
            <input
              name="senha"
              type="text"
              className="campo cifra"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Campo>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-tinta-2">
          <input type="checkbox" name="admin" className="w-4 h-4 accent-[var(--color-caneta)]" />
          Administrador (também pode criar contas)
        </label>

        <Aviso aviso={aviso} />
        <button type="submit" disabled={pendente} className="botao botao-tinta">
          <Icone nome="mais" tamanho={16} />
          Criar conta
        </button>
      </form>
    </Canhoto>
  );
}

// ==================================================================
// Contas existentes
// ==================================================================

interface ContaUI {
  id: string;
  nome: string;
  email: string;
  admin: boolean;
  desde: string;
}

export function ListaUsuarios({ contas, meuId }: { contas: ContaUI[]; meuId: string }) {
  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Contas"
        sub={`${contas.length} ${contas.length === 1 ? "conta" : "contas"} no sistema`}
        icone="usuario"
      />
      <ul className="px-4 pb-4 divide-y divide-papel-borda">
        {contas.map((c) => (
          <LinhaConta key={c.id} c={c} souEu={c.id === meuId} />
        ))}
      </ul>
    </Canhoto>
  );
}

function LinhaConta({ c, souEu }: { c: ContaUI; souEu: boolean }) {
  const { pendente, aviso, executar } = useAcao();
  const [trocando, setTrocando] = useState(false);

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Avatar nome={c.nome} tamanho={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-tinta truncate">
            {c.nome}
            {souEu ? <span className="text-tinta-3"> · você</span> : null}
          </p>
          <p className="text-[12px] text-tinta-3 truncate">
            {c.email} · desde {c.desde}
          </p>
        </div>
        {c.admin ? (
          <Etiqueta tom="tinta" icone="cadeado">
            Admin
          </Etiqueta>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 mt-2.5 pl-[48px]">
        <button
          type="button"
          className="botao botao-fantasma"
          onClick={() => setTrocando((v) => !v)}
        >
          <Icone nome="cadeado" tamanho={15} />
          {trocando ? "Cancelar" : "Redefinir senha"}
        </button>
        {!souEu ? (
          <button
            type="button"
            disabled={pendente}
            className="botao botao-fantasma"
            onClick={() =>
              executar(
                () => alternarAdmin(c.id),
                c.admin ? "Deixou de ser administrador." : "Agora é administrador.",
              )
            }
          >
            <Icone nome="usuario" tamanho={15} />
            {c.admin ? "Tirar admin" : "Tornar admin"}
          </button>
        ) : null}
      </div>

      {trocando ? (
        <form
          action={(d) =>
            executar(() => redefinirSenha(d), `Senha de ${c.nome} redefinida.`, () =>
              setTrocando(false),
            )
          }
          className="flex flex-wrap items-end gap-2 mt-2.5 pl-[48px]"
        >
          <input type="hidden" name="id" value={c.id} />
          <Campo rotulo="Nova senha" className="flex-1 min-w-[180px]">
            <input
              name="senha"
              type="text"
              className="campo cifra"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Campo>
          <button type="submit" disabled={pendente} className="botao botao-papel">
            Salvar
          </button>
        </form>
      ) : null}

      {aviso ? (
        <div className="mt-2 pl-[48px]">
          <Aviso aviso={aviso} />
        </div>
      ) : null}
    </li>
  );
}
