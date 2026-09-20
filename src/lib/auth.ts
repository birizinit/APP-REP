import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const COOKIE = "representei_sessao";
const DURACAO_DIAS = 30;

function segredo() {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 16) {
    throw new Error(
      "AUTH_SECRET ausente ou curto demais. Gere um valor longo e coloque no .env.",
    );
  }
  return new TextEncoder().encode(valor);
}

export async function hashSenha(senha: string) {
  return bcrypt.hash(senha, 11);
}

export async function conferirSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}

export async function criarSessao(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("representei")
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function idDaSessao(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo(), { issuer: "representei" });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Usuario logado ou null. Nao redireciona. */
export async function usuarioAtual() {
  const id = await idDaSessao();
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}

/** Usuario logado; manda para /entrar se nao houver sessao. */
export async function exigirUsuario() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  return user;
}

/** Para rotas de API: devolve o id ou lanca uma resposta 401. */
export async function exigirUsuarioApi(): Promise<string> {
  const id = await idDaSessao();
  if (!id) throw new RespostaNaoAutorizada();
  return id;
}

export class RespostaNaoAutorizada extends Error {
  constructor() {
    super("Nao autorizado");
    this.name = "RespostaNaoAutorizada";
  }
}
