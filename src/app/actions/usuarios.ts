"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirUsuario, hashSenha } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Cadastro de contas feito por quem administra, sem abrir o cadastro publico.
 * A trava vale em cada acao (nao so no menu): quem nao e admin e barrado aqui.
 */
export async function exigirAdmin() {
  const user = await exigirUsuario();
  if (!user.admin) redirect("/");
  return user;
}

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SENHA_MIN = 6;

export async function criarUsuario(dados: FormData) {
  await exigirAdmin();

  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  const admin = dados.get("admin") === "on";

  if (nome.length < 3) return { erro: "Informe o nome completo." };
  if (!EMAIL_OK.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < SENHA_MIN) {
    return { erro: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` };
  }

  const existe = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existe) return { erro: "Já existe uma conta com esse e-mail." };

  await prisma.user.create({
    data: {
      nome,
      email,
      senhaHash: await hashSenha(senha),
      admin,
      jornadaInicio: "08:00",
      jornadaFim: "18:00",
    },
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function redefinirSenha(dados: FormData) {
  await exigirAdmin();

  const id = String(dados.get("id") ?? "");
  const senha = String(dados.get("senha") ?? "");
  if (senha.length < SENHA_MIN) {
    return { erro: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` };
  }

  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!alvo) return { erro: "Conta não encontrada." };

  await prisma.user.update({ where: { id }, data: { senhaHash: await hashSenha(senha) } });
  return { ok: true };
}

export async function alternarAdmin(id: string) {
  const eu = await exigirAdmin();

  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, admin: true } });
  if (!alvo) return { erro: "Conta não encontrada." };

  // Nunca deixar o sistema sem ninguem que consiga criar contas.
  if (alvo.admin) {
    const admins = await prisma.user.count({ where: { admin: true } });
    if (admins <= 1) return { erro: "É o único administrador. Promova outra conta antes." };
    if (alvo.id === eu.id) {
      return { erro: "Você não pode tirar o seu próprio acesso de administrador." };
    }
  }

  await prisma.user.update({ where: { id }, data: { admin: !alvo.admin } });
  revalidatePath("/usuarios");
  return { ok: true };
}
