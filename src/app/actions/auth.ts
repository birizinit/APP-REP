"use server";

import { redirect } from "next/navigation";

import { conferirSenha, criarSessao, encerrarSessao, hashSenha } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface EstadoForm {
  erro?: string | null;
  ok?: boolean;
}

export async function entrar(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { erro: "E-mail ou senha não conferem." };

  const confere = await conferirSenha(senha, user.senhaHash);
  if (!confere) return { erro: "E-mail ou senha não conferem." };

  await criarSessao(user.id);
  redirect("/");
}

/**
 * Cadastro so e liberado em duas situacoes:
 *  1. o banco esta vazio (primeiro acesso, quem instalou cria a conta);
 *  2. existe um codigo de convite em CONVITE e a pessoa informou o certo.
 *
 * Sem isso, um app de um representante so, publicado numa URL publica,
 * aceitaria cadastro de qualquer visitante.
 */
export async function cadastroLiberado(): Promise<"primeiro" | "convite" | "fechado"> {
  const total = await prisma.user.count().catch(() => -1);
  if (total === 0) return "primeiro";
  if (total > 0 && (process.env.CONVITE ?? "").length >= 6) return "convite";
  return "fechado";
}

export async function criarConta(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");

  const liberado = await cadastroLiberado();
  if (liberado === "fechado") {
    return { erro: "O cadastro está fechado. Peça para quem administra o sistema." };
  }
  if (liberado === "convite") {
    const convite = String(dados.get("convite") ?? "").trim();
    if (convite !== process.env.CONVITE) {
      return { erro: "Código de convite inválido." };
    }
  }

  if (nome.length < 3) return { erro: "Diga seu nome completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < 6) return { erro: "A senha precisa de pelo menos 6 caracteres." };

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) return { erro: "Já existe uma conta com esse e-mail." };

  const user = await prisma.user.create({
    data: {
      nome,
      email,
      senhaHash: await hashSenha(senha),
      // quem abre o sistema vazio e o dono; por convite, conta comum
      admin: liberado === "primeiro",
      jornadaInicio: "08:00",
      jornadaFim: "18:00",
    },
  });

  await criarSessao(user.id);
  redirect("/ajustes?bemvindo=1");
}

export async function sair() {
  await encerrarSessao();
  redirect("/entrar");
}
