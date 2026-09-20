import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Healthcheck do Railway. De proposito NAO toca no banco: se o Postgres
 * estiver reiniciando, o app continua "vivo" e o Railway nao derruba o
 * deploy inteiro por causa disso.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    app: "representei",
    em: new Date().toISOString(),
  });
}
