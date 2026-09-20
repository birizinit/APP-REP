import type { Metadata } from "next";
import Link from "next/link";

import { FormRepresentada } from "@/app/(app)/representadas/form";
import { Icone } from "@/components/icone";

export const metadata: Metadata = { title: "Nova representada" };

export default function NovaRepresentada() {
  return (
    <div>
      <header className="mb-5">
        <Link href="/representadas" className="text-[12.5px] text-tinta-3 flex items-center gap-1 mb-1.5">
          <Icone nome="setaEsquerda" tamanho={13} />
          Representadas
        </Link>
        <h1 className="text-[27px] sm:text-[32px] tracking-[-0.04em] text-tinta">Nova representada</h1>
        <p className="text-[13.5px] text-tinta-3 mt-1">
          Depois de salvar você detalha o plano de comissão.
        </p>
      </header>

      <FormRepresentada />
    </div>
  );
}
