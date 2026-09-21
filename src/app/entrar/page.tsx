import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { cadastroLiberado } from "@/app/actions/auth";
import { FormEntrar } from "@/app/entrar/form";
import { Icone, Marca } from "@/components/icone";
import { usuarioAtual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  const user = await usuarioAtual();
  if (user) redirect("/");

  // Se o banco ainda nao tem ninguem, a tela vira cadastro.
  const total = await prisma.user.count().catch(() => -1);
  const primeiroAcesso = total === 0;
  const modoCadastro = await cadastroLiberado();
  const temDemo =
    total > 0 &&
    Boolean(
      await prisma.user.findUnique({
        where: { email: "rep@representei.app" },
        select: { id: true },
      }),
    );

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- lado da marca ---------------- */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-papel-alto border-r border-papel-borda overflow-hidden">
        <div className="absolute inset-0 pauta opacity-70" />
        <div className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full bg-caneta opacity-[0.05] blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="text-caneta">
            <Marca tamanho={38} />
          </span>
          <div>
            <p className="font-display font-extrabold text-[22px] tracking-[-0.045em] leading-none text-tinta">
              Representei
            </p>
            <p className="text-[10.5px] uppercase tracking-[0.2em] text-tinta-3 mt-1.5">
              o talão digital do representante
            </p>
          </div>
        </div>

        <div className="relative max-w-[30ch]">
          <h1 className="text-[46px] leading-[0.98] tracking-[-0.045em] text-tinta">
            A carteira inteira
            <br />
            <span className="text-caneta">cabe no bolso.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-tinta-2">
            Rota do dia calculada com o custo real do seu carro, comissão de cada
            representada no automático e aviso quando o dinheiro estiver pra cair.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              { icone: "rota", texto: "Roteiro otimizado com km, litro e R$" },
              { icone: "comissao", texto: "Plano de comissão por representada" },
              { icone: "sino", texto: "Push de visita, cobrança e recebimento" },
            ].map((item) => (
              <li key={item.texto} className="flex items-center gap-3 text-[14px] text-tinta-2">
                <span className="w-8 h-8 rounded-xl grid place-items-center bg-caneta-fundo text-caneta shrink-0">
                  <Icone nome={item.icone} tamanho={16} />
                </span>
                {item.texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-[11.5px] text-tinta-3">
          <Icone nome="cadeado" tamanho={14} />
          Seus dados ficam no seu banco. Nada é compartilhado.
        </div>
      </div>

      {/* ---------------- formulario ---------------- */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="lg:hidden flex items-center gap-2.5 mb-9">
          <span className="text-caneta">
            <Marca tamanho={32} />
          </span>
          <div>
            <p className="font-display font-extrabold text-[19px] tracking-[-0.045em] leading-none text-tinta">
              Representei
            </p>
            <p className="text-[9.5px] uppercase tracking-[0.18em] text-tinta-3 mt-1">
              talão digital
            </p>
          </div>
        </div>

        <FormEntrar primeiroAcesso={primeiroAcesso} temDemo={temDemo} modoCadastro={modoCadastro} />
      </div>
    </div>
  );
}
