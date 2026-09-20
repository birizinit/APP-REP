import Link from "next/link";

import { Icone, Marca } from "@/components/icone";
import { EstradaVazia } from "@/components/ilustracoes";

export const metadata = { title: "Sem conexão" };

export default function Offline() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <span className="text-caneta mb-6">
        <Marca tamanho={40} />
      </span>

      <span className="text-tinta-3 mb-5">
        <EstradaVazia />
      </span>

      <h1 className="text-[26px] tracking-[-0.04em] text-tinta">Sem sinal por aqui</h1>
      <p className="text-[14px] text-tinta-2 mt-2.5 max-w-[38ch] leading-relaxed">
        As telas que você já abriu continuam disponíveis. Quando o sinal voltar, é só recarregar
        que tudo sincroniza.
      </p>

      <Link href="/" className="botao botao-tinta mt-7">
        <Icone nome="atualizar" tamanho={16} />
        Tentar de novo
      </Link>
    </div>
  );
}
