import { Casca } from "@/components/casca";
import { RegistrarSw } from "@/components/registrar-sw";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const user = await exigirUsuario();

  const naoLidas = await prisma.notification.count({
    where: { userId: user.id, lida: false },
  });

  return (
    <Casca
      usuario={{ nome: user.nome, email: user.email, avatarUrl: user.avatarUrl }}
      naoLidas={naoLidas}
    >
      {children}
      <RegistrarSw />
    </Casca>
  );
}
