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

export async function criarConta(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");

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
