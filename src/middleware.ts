import { NextResponse, type NextRequest } from "next/server";

/**
 * A raiz tem duas caras: quem tem sessao ve o "Meu dia"; o visitante ve a
 * landing de vendas (/conheca), sem trocar de endereco.
 *
 * So olha se o cookie existe. Cookie vencido ou adulterado cai no layout do
 * app, que confere a assinatura e manda para /entrar, como antes.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has("representei_sessao")) {
    return NextResponse.rewrite(new URL("/conheca", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
