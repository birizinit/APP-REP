"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { criarConta, entrar, type EstadoForm } from "@/app/actions/auth";
import { Icone } from "@/components/icone";
import { Campo } from "@/components/ui";

const inicial: EstadoForm = { erro: null };

export function FormEntrar({
  primeiroAcesso,
  temDemo,
  modoCadastro,
}: {
  primeiroAcesso: boolean;
  temDemo: boolean;
  /** primeiro = banco vazio · aberto = qualquer um · convite = exige código · fechado = só login */
  modoCadastro: "primeiro" | "aberto" | "convite" | "fechado";
}) {
  const [modo, setModo] = useState<"entrar" | "criar">(primeiroAcesso ? "criar" : "entrar");
  const acao = modo === "entrar" ? entrar : criarConta;
  const [estado, enviar] = useActionState(acao, inicial);
  const [verSenha, setVerSenha] = useState(false);

  return (
    <div className="w-full max-w-[400px] mx-auto anim-subir">
      <h2 className="text-[30px] tracking-[-0.04em] text-tinta">
        {modo === "entrar" ? "Bom te ver de volta." : primeiroAcesso ? "Vamos abrir seu talão." : "Criar conta"}
      </h2>
      <p className="text-[14px] text-tinta-3 mt-2 mb-7 leading-relaxed">
        {modo === "entrar"
          ? "Entre para ver a rota e as comissões de hoje."
          : "Leva um minuto. Depois você cadastra veículo e representadas."}
      </p>

      <form action={enviar} className="space-y-4">
        {modo === "criar" ? (
          <Campo rotulo="Seu nome" obrigatorio>
            <input name="nome" className="campo" placeholder="Ex.: João Batista Silva" autoComplete="name" required />
          </Campo>
        ) : null}

        {modo === "criar" && modoCadastro === "convite" ? (
          <Campo
            rotulo="Código de convite"
            obrigatorio
            dica="Quem administra o sistema te passa esse código."
          >
            <input name="convite" className="campo cifra" autoComplete="off" required />
          </Campo>
        ) : null}

        <Campo rotulo="E-mail" obrigatorio>
          <input
            name="email"
            type="email"
            className="campo"
            placeholder="voce@email.com.br"
            autoComplete="email"
            defaultValue={temDemo && modo === "entrar" ? "rep@representei.app" : ""}
            required
          />
        </Campo>

        <Campo rotulo="Senha" obrigatorio>
          <div className="relative">
            <input
              name="senha"
              type={verSenha ? "text" : "password"}
              className="campo pr-11"
              placeholder="••••••••"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              defaultValue={temDemo && modo === "entrar" ? "representei" : ""}
              required
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-tinta-3"
            >
              <Icone nome="olho" tamanho={18} />
            </button>
          </div>
        </Campo>

        {estado.erro ? (
          <div className="flex items-start gap-2 rounded-xl px-3.5 py-3 bg-carimbo-fundo text-carimbo text-[13px] anim-subir">
            <span className="mt-px shrink-0">
              <Icone nome="alerta" tamanho={15} />
            </span>
            {estado.erro}
          </div>
        ) : null}

        <Enviar modo={modo} />
      </form>

      {!primeiroAcesso && modoCadastro !== "fechado" ? (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="linha-picotada flex-1" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-tinta-3">ou</span>
            <div className="linha-picotada flex-1" />
          </div>

          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="botao botao-papel w-full"
          >
            {modo === "entrar" ? "Criar uma conta nova" : "Já tenho conta"}
          </button>
        </>
      ) : null}

      {temDemo && modo === "entrar" ? (
        <div className="mt-6 canhoto picote px-4 py-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-3 mb-1.5">
            Dados de demonstração
          </p>
          <p className="text-[12.5px] text-tinta-2 leading-relaxed">
            Já deixei preenchido: <span className="cifra">rep@representei.app</span> / <span className="cifra">representei</span>.
            A base vem com 18 clientes, 3 representadas e 5 meses de histórico.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Enviar({ modo }: { modo: "entrar" | "criar" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="botao botao-tinta w-full mt-1">
      {pending ? (
        <>
          <span className="anim-rodar">
            <Icone nome="atualizar" tamanho={17} />
          </span>
          Aguarde...
        </>
      ) : (
        <>
          {modo === "entrar" ? "Entrar" : "Criar conta"}
          <Icone nome="seta" tamanho={17} />
        </>
      )}
    </button>
  );
}
