"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { excluirCliente, mudarStatusCliente } from "@/app/actions/clientes";
import { Icone } from "@/components/icone";
import { Canhoto } from "@/components/ui";
import { cx } from "@/lib/format";

const STATUS = [
  { valor: "ATIVO", rotulo: "Ativo" },
  { valor: "PROSPECT", rotulo: "Prospect" },
  { valor: "EM_RISCO", rotulo: "Em risco" },
  { valor: "INATIVO", rotulo: "Inativo" },
  { valor: "BLOQUEADO", rotulo: "Bloqueado" },
  { valor: "PERDIDO", rotulo: "Perdido" },
];

export function AcoesCliente({
  id,
  nome,
  wa,
  telefone,
  lat,
  lng,
  status,
}: {
  id: string;
  nome: string;
  wa: string | null;
  telefone: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [menu, setMenu] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto sem-barra">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="botao botao-tinta shrink-0">
            <Icone nome="whatsapp" tamanho={16} />
            WhatsApp
          </a>
        ) : null}

        <Link href={`/pedidos/novo?cliente=${id}`} className="botao botao-papel shrink-0">
          <Icone nome="pedido" tamanho={16} />
          Pedido
        </Link>

        <Link href={`/agenda?novo=1&cliente=${id}`} className="botao botao-papel shrink-0">
          <Icone nome="calendarioMais" tamanho={16} />
          Agendar
        </Link>

        {lat && lng ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="botao botao-papel shrink-0"
          >
            <Icone nome="bussola" tamanho={16} />
            Navegar
          </a>
        ) : null}

        {telefone ? (
          <a href={`tel:${telefone}`} className="botao botao-papel shrink-0">
            <Icone nome="telefone" tamanho={16} />
            Ligar
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="botao botao-papel shrink-0"
          aria-label="Mais ações"
        >
          <Icone nome="pontos" tamanho={16} />
        </button>
      </div>

      {menu ? (
        <Canhoto className="p-3 mt-2.5 anim-subir">
          <p className="rotulo mb-1.5">Mudar situação</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATUS.map((s) => (
              <button
                key={s.valor}
                type="button"
                disabled={pendente || s.valor === status}
                onClick={() =>
                  iniciar(async () => {
                    await mudarStatusCliente(id, s.valor as never);
                    router.refresh();
                  })
                }
                className={cx(
                  "etiqueta transition-colors",
                  s.valor === status
                    ? "bg-caneta text-white border-caneta"
                    : "border-papel-borda text-tinta-3 hover:text-tinta",
                )}
              >
                {s.rotulo}
              </button>
            ))}
          </div>

          <div className="linha-picotada my-2" />

          <div className="flex flex-wrap gap-2">
            <Link href={`/clientes/${id}/editar`} className="botao botao-papel text-[13px] flex-1">
              <Icone nome="editar" tamanho={14} />
              Editar cadastro
            </Link>

            {confirmando ? (
              <button
                type="button"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await excluirCliente(id);
                    if (r?.erro) {
                      setErro(r.erro);
                      setConfirmando(false);
                      return;
                    }
                    router.push("/clientes");
                    router.refresh();
                  })
                }
                className="botao text-[13px] flex-1 bg-carimbo text-white"
              >
                Confirmar exclusão
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="botao botao-fantasma text-[13px] flex-1 text-carimbo"
              >
                <Icone nome="lixeira" tamanho={14} />
                Excluir
              </button>
            )}
          </div>

          {erro ? (
            <p className="mt-2.5 text-[12.5px] text-carimbo bg-carimbo-fundo rounded-lg px-3 py-2">
              {erro}
            </p>
          ) : null}
        </Canhoto>
      ) : null}
    </>
  );
}
