import type { Metadata } from "next";

import { ListaUsuarios, NovoUsuario } from "@/app/(app)/usuarios/secoes";
import { exigirAdmin } from "@/app/actions/usuarios";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function PaginaUsuarios() {
  const eu = await exigirAdmin();

  const contas = await prisma.user.findMany({
    orderBy: [{ admin: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, email: true, admin: true, createdAt: true },
  });

  return (
    <div className="escala max-w-[820px]">
      <header className="mb-5">
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Usuários</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1">
          Crie as contas de quem vai usar o sistema. Cada conta tem a própria carteira, agenda e
          comissões.
        </p>
      </header>

      <div className="space-y-4">
        <NovoUsuario />
        <ListaUsuarios
          meuId={eu.id}
          contas={contas.map((c) => ({
            id: c.id,
            nome: c.nome,
            email: c.email,
            admin: c.admin,
            desde: c.createdAt.toLocaleDateString("pt-BR"),
          }))}
        />
      </div>
    </div>
  );
}
