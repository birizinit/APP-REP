"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  buscarCepBase,
  distribuirRegioes,
  excluirRegiao,
  excluirVeiculo,
  registrarAbastecimento,
  salvarBase,
  salvarPerfil,
  salvarRegiao,
  salvarVeiculo,
  trocarSenha,
} from "@/app/actions/ajustes";
import { Icone } from "@/components/icone";
import { Campo, Canhoto, CanhotoTitulo, Etiqueta, LinhaPicotada } from "@/components/ui";
import { cx, dinheiro, numeroBR, soDigitos } from "@/lib/format";

// ==================================================================
// Helpers
// ==================================================================

function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function executar(fn: () => Promise<{ erro?: string; ok?: boolean } | void>, sucesso = "Salvo.") {
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (r && "erro" in r && r.erro) {
        setAviso({ tipo: "erro", texto: r.erro });
        return;
      }
      setAviso({ tipo: "ok", texto: sucesso });
      router.refresh();
      setTimeout(() => setAviso(null), 3500);
    });
  }

  return { pendente, aviso, executar, setAviso };
}

function Aviso({ aviso }: { aviso: { tipo: "ok" | "erro"; texto: string } | null }) {
  if (!aviso) return null;
  return (
    <p
      className={cx(
        "flex items-center gap-2 text-[12.5px] rounded-xl px-3 py-2.5 anim-surgir",
        aviso.tipo === "ok" ? "text-quitado bg-quitado-fundo" : "text-carimbo bg-carimbo-fundo",
      )}
    >
      <Icone nome={aviso.tipo === "ok" ? "check" : "alerta"} tamanho={14} />
      {aviso.texto}
    </p>
  );
}

// ==================================================================
// Perfil
// ==================================================================

export function SecaoPerfil({
  inicial,
}: {
  inicial: Record<string, string>;
}) {
  const { pendente, aviso, executar } = useAcao();

  return (
    <Canhoto>
      <CanhotoTitulo titulo="Seu perfil" sub="Metas e jornada de trabalho" icone="usuario" />
      <form
        action={(d) => executar(() => salvarPerfil(d))}
        className="px-4 pb-4 space-y-3"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Nome" obrigatorio>
            <input name="nome" defaultValue={inicial.nome} className="campo" required />
          </Campo>
          <Campo rotulo="E-mail" dica="Para trocar, fale comigo.">
            <input value={inicial.email} disabled className="campo" />
          </Campo>
          <Campo rotulo="Telefone">
            <input name="telefone" defaultValue={inicial.telefone} className="campo cifra" />
          </Campo>
          <Campo rotulo="WhatsApp">
            <input name="whatsapp" defaultValue={inicial.whatsapp} className="campo cifra" />
          </Campo>
          <Campo rotulo="CPF/CNPJ" dica="Aparece na nota de serviço.">
            <input name="cpfCnpj" defaultValue={inicial.cpfCnpj} className="campo cifra" />
          </Campo>
          <Campo rotulo="Meta mensal de venda">
            <input
              name="metaMensal"
              defaultValue={inicial.metaMensal}
              inputMode="decimal"
              className="campo cifra"
            />
          </Campo>
        </div>

        <LinhaPicotada rotulo="jornada" />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Campo rotulo="Começo">
            <input type="time" name="jornadaInicio" defaultValue={inicial.jornadaInicio} className="campo" />
          </Campo>
          <Campo rotulo="Fim">
            <input type="time" name="jornadaFim" defaultValue={inicial.jornadaFim} className="campo" />
          </Campo>
          <Campo rotulo="Almoço">
            <input type="time" name="almocoInicio" defaultValue={inicial.almocoInicio} className="campo" />
          </Campo>
          <Campo rotulo="Duração">
            <input
              name="almocoMinutos"
              defaultValue={inicial.almocoMinutos}
              inputMode="numeric"
              className="campo cifra"
            />
          </Campo>
          <Campo rotulo="Visitas/dia">
            <input
              name="metaVisitasDia"
              defaultValue={inicial.metaVisitasDia}
              inputMode="numeric"
              className="campo cifra"
            />
          </Campo>
        </div>

        <p className="text-[11.5px] text-tinta-3">
          A jornada é usada para projetar os horários de chegada da rota e avisar quando o dia
          estoura.
        </p>

        <Aviso aviso={aviso} />

        <button type="submit" disabled={pendente} className="botao botao-tinta">
          {pendente ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </Canhoto>
  );
}

// ==================================================================
// Base
// ==================================================================

export function SecaoBase({
  inicial,
}: {
  inicial: {
    baseLabel: string;
    baseCep: string;
    baseRua: string;
    baseNum: string;
    baseBairro: string;
    baseCidade: string;
    baseUf: string;
    baseLat: number | null;
    baseLng: number | null;
  };
}) {
  const { pendente, aviso, executar } = useAcao();
  const [v, setV] = useState(inicial);
  const [buscando, setBuscando] = useState(false);

  async function puxarCep() {
    if (soDigitos(v.baseCep).length !== 8) return;
    setBuscando(true);
    const r = await buscarCepBase(v.baseCep);
    setBuscando(false);
    if (!r.ok) return;
    setV((a) => ({
      ...a,
      baseRua: r.ficha.logradouro ?? a.baseRua,
      baseBairro: r.ficha.bairro ?? a.baseBairro,
      baseCidade: r.ficha.cidade ?? a.baseCidade,
      baseUf: r.ficha.uf ?? a.baseUf,
      baseLat: r.ficha.lat ?? a.baseLat,
      baseLng: r.ficha.lng ?? a.baseLng,
    }));
  }

  const localizada = Boolean(v.baseLat && v.baseLng);

  return (
    <Canhoto id="base">
      <CanhotoTitulo
        titulo="Sua base"
        sub="De onde a rota sai e para onde volta"
        icone="dia"
        acao={
          <Etiqueta tom={localizada ? "quitado" : "carimbo"} icone={localizada ? "check" : "alerta"}>
            {localizada ? "no mapa" : "sem coordenada"}
          </Etiqueta>
        }
      />

      <form action={(d) => executar(() => salvarBase(d), "Base salva.")} className="px-4 pb-4 space-y-3">
        <input type="hidden" name="baseLat" value={v.baseLat ?? ""} />
        <input type="hidden" name="baseLng" value={v.baseLng ?? ""} />

        <Campo rotulo="Como chamar" dica="Ex.: Escritório, Casa, Depósito">
          <input
            name="baseLabel"
            value={v.baseLabel}
            onChange={(e) => setV({ ...v, baseLabel: e.target.value })}
            className="campo"
          />
        </Campo>

        <div className="grid sm:grid-cols-[150px_1fr] gap-3">
          <Campo rotulo="CEP">
            <div className="relative">
              <input
                name="baseCep"
                value={v.baseCep}
                onChange={(e) => setV({ ...v, baseCep: e.target.value })}
                onBlur={puxarCep}
                inputMode="numeric"
                className="campo cifra pr-9"
              />
              {buscando ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caneta anim-rodar">
                  <Icone nome="atualizar" tamanho={15} />
                </span>
              ) : null}
            </div>
          </Campo>
          <Campo rotulo="Rua">
            <input
              name="baseRua"
              value={v.baseRua}
              onChange={(e) => setV({ ...v, baseRua: e.target.value })}
              className="campo"
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rotulo="Número">
            <input
              name="baseNum"
              value={v.baseNum}
              onChange={(e) => setV({ ...v, baseNum: e.target.value })}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Bairro">
            <input
              name="baseBairro"
              value={v.baseBairro}
              onChange={(e) => setV({ ...v, baseBairro: e.target.value })}
              className="campo"
            />
          </Campo>
          <Campo rotulo="Cidade">
            <input
              name="baseCidade"
              value={v.baseCidade}
              onChange={(e) => setV({ ...v, baseCidade: e.target.value })}
              className="campo"
            />
          </Campo>
          <Campo rotulo="UF">
            <input
              name="baseUf"
              value={v.baseUf}
              onChange={(e) => setV({ ...v, baseUf: e.target.value.toUpperCase().slice(0, 2) })}
              maxLength={2}
              className="campo uppercase"
            />
          </Campo>
        </div>

        {localizada ? (
          <p className="text-[11.5px] text-tinta-3 cifra">
            {v.baseLat?.toFixed(5)}, {v.baseLng?.toFixed(5)}
          </p>
        ) : (
          <p className="text-[12px] text-ambar bg-ambar-fundo rounded-lg px-3 py-2 flex items-start gap-2">
            <Icone nome="alerta" tamanho={13} />
            Ao salvar eu procuro a coordenada automaticamente pelo endereço.
          </p>
        )}

        <Aviso aviso={aviso} />

        <button type="submit" disabled={pendente} className="botao botao-tinta">
          {pendente ? "Salvando..." : "Salvar base"}
        </button>
      </form>
    </Canhoto>
  );
}

// ==================================================================
// Veículos
// ==================================================================

interface VeiculoUI {
  id: string;
  apelido: string;
  marca: string;
  modelo: string;
  ano: string;
  placa: string;
  combustivel: string;
  flex: boolean;
  consumoCidade: string;
  consumoEstrada: string;
  precoGasolina: string;
  precoEtanol: string;
  precoDiesel: string;
  custoManutencaoKm: string;
  pedagioMedioDia: string;
  hodometro: string;
  padrao: boolean;
  ativo: boolean;
}

export function SecaoVeiculos({
  veiculos,
  abastecimentos,
}: {
  veiculos: VeiculoUI[];
  abastecimentos: Array<{
    id: string;
    veiculo: string;
    data: string;
    litros: number;
    valorLitro: number;
    valorTotal: number;
    hodometro: number | null;
    posto: string | null;
  }>;
}) {
  const { pendente, aviso, executar } = useAcao();
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(veiculos.length === 0);
  const [abastecendo, setAbastecendo] = useState<string | null>(null);

  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Veículos"
        sub="O consumo daqui vira o custo da rota"
        icone="veiculo"
        acao={
          <button
            type="button"
            onClick={() => {
              setCriando((x) => !x);
              setEditando(null);
            }}
            className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
          >
            <Icone nome={criando ? "fechar" : "mais"} tamanho={14} />
            {criando ? "Fechar" : "Veículo"}
          </button>
        }
      />

      <div className="px-4 pb-4 space-y-3">
        {criando ? (
          <FormVeiculo
            aoEnviar={(d) => executar(() => salvarVeiculo(d), "Veículo cadastrado.")}
            pendente={pendente}
            aoCancelar={() => setCriando(false)}
          />
        ) : null}

        {veiculos.map((v) =>
          editando === v.id ? (
            <FormVeiculo
              key={v.id}
              inicial={v}
              pendente={pendente}
              aoEnviar={(d) => executar(() => salvarVeiculo(d), "Veículo atualizado.")}
              aoCancelar={() => setEditando(null)}
            />
          ) : (
            <div key={v.id} className="rounded-xl border border-papel-borda p-3.5">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl grid place-items-center bg-caneta-fundo text-caneta shrink-0">
                  <Icone nome="veiculo" tamanho={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-tinta truncate">{v.apelido}</p>
                    {v.padrao ? <Etiqueta tom="tinta">padrão</Etiqueta> : null}
                  </div>
                  <p className="text-[11.5px] text-tinta-3 mt-0.5">
                    {[v.marca, v.modelo, v.ano].filter(Boolean).join(" ")}
                    {v.placa ? ` · ${v.placa}` : ""}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-tinta-2">
                    <span className="flex items-center gap-1">
                      <Icone nome="combustivel" tamanho={12} />
                      {v.consumoCidade} / {v.consumoEstrada} km/l
                    </span>
                    <span className="cifra">
                      {dinheiro(v.combustivel === "ETANOL" ? v.precoEtanol : v.precoGasolina)}/L
                    </span>
                    <span className="cifra">{dinheiro(v.custoManutencaoKm)}/km manutenção</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(v.id);
                      setCriando(false);
                    }}
                    className="p-1.5 text-tinta-3 hover:text-caneta"
                    aria-label="Editar"
                  >
                    <Icone nome="editar" tamanho={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executar(() => excluirVeiculo(v.id), "Veículo removido.")}
                    className="p-1.5 text-tinta-3 hover:text-carimbo"
                    aria-label="Excluir"
                  >
                    <Icone nome="lixeira" tamanho={16} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAbastecendo(abastecendo === v.id ? null : v.id)}
                className="botao botao-papel w-full mt-3 text-[12.5px]"
              >
                <Icone nome="combustivel" tamanho={14} />
                Registrar abastecimento
              </button>

              {abastecendo === v.id ? (
                <form
                  action={(d) => {
                    d.set("vehicleId", v.id);
                    executar(() => registrarAbastecimento(d), "Abastecimento registrado.");
                    setAbastecendo(null);
                  }}
                  className="mt-3 pt-3 border-t border-papel-borda anim-subir"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Campo rotulo="Litros" obrigatorio>
                      <input name="litros" inputMode="decimal" className="campo cifra text-[13px]" required />
                    </Campo>
                    <Campo rotulo="R$/litro" obrigatorio>
                      <input name="valorLitro" inputMode="decimal" className="campo cifra text-[13px]" required />
                    </Campo>
                    <Campo rotulo="Hodômetro">
                      <input name="hodometro" inputMode="numeric" className="campo cifra text-[13px]" />
                    </Campo>
                    <Campo rotulo="Posto">
                      <input name="posto" className="campo text-[13px]" />
                    </Campo>
                  </div>
                  <p className="text-[11.5px] text-tinta-3 mt-2">
                    Com dois tanques cheios e o hodômetro, eu calculo o consumo real e corrijo o
                    custo das rotas.
                  </p>
                  <button type="submit" disabled={pendente} className="botao botao-tinta w-full mt-2.5 text-[13px]">
                    Registrar
                  </button>
                </form>
              ) : null}
            </div>
          ),
        )}

        {abastecimentos.length > 0 ? (
          <>
            <LinhaPicotada rotulo="últimos abastecimentos" />
            <ul className="space-y-1.5">
              {abastecimentos.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-[12px]">
                  <span className="text-tinta-3 w-[70px] shrink-0">
                    {a.data.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                  <span className="text-tinta-2 min-w-0 flex-1 truncate">
                    {a.posto ?? a.veiculo}
                  </span>
                  <span className="cifra text-tinta-3 shrink-0">{numeroBR(a.litros, 1)} L</span>
                  <span className="cifra text-tinta shrink-0 w-[76px] text-right">
                    {dinheiro(a.valorTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <Aviso aviso={aviso} />
      </div>
    </Canhoto>
  );
}

function FormVeiculo({
  inicial,
  aoEnviar,
  aoCancelar,
  pendente,
}: {
  inicial?: VeiculoUI;
  aoEnviar: (d: FormData) => void;
  aoCancelar: () => void;
  pendente: boolean;
}) {
  const [flex, setFlex] = useState(inicial?.flex ?? true);
  const [combustivel, setCombustivel] = useState(inicial?.combustivel ?? "GASOLINA");
  const [padrao, setPadrao] = useState(inicial?.padrao ?? true);

  return (
    <form action={aoEnviar} className="rounded-xl border border-caneta p-3.5 space-y-3 anim-subir">
      {inicial ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <input type="hidden" name="flex" value={flex ? "on" : "off"} />
      <input type="hidden" name="padrao" value={padrao ? "on" : "off"} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Campo rotulo="Apelido" obrigatorio className="col-span-2">
          <input
            name="apelido"
            defaultValue={inicial?.apelido}
            placeholder="Corolla do trabalho"
            className="campo text-[13px]"
            required
          />
        </Campo>
        <Campo rotulo="Marca">
          <input name="marca" defaultValue={inicial?.marca} className="campo text-[13px]" />
        </Campo>
        <Campo rotulo="Modelo">
          <input name="modelo" defaultValue={inicial?.modelo} className="campo text-[13px]" />
        </Campo>
        <Campo rotulo="Ano">
          <input name="ano" defaultValue={inicial?.ano} inputMode="numeric" className="campo cifra text-[13px]" />
        </Campo>
        <Campo rotulo="Placa">
          <input name="placa" defaultValue={inicial?.placa} className="campo cifra text-[13px] uppercase" />
        </Campo>
        <Campo rotulo="Combustível" className="col-span-2">
          <select
            name="combustivel"
            value={combustivel}
            onChange={(e) => setCombustivel(e.target.value)}
            className="campo text-[13px]"
          >
            <option value="GASOLINA">Gasolina</option>
            <option value="ETANOL">Etanol</option>
            <option value="DIESEL">Diesel</option>
            <option value="GNV">GNV</option>
            <option value="ELETRICO">Elétrico</option>
          </select>
        </Campo>
      </div>

      {(combustivel === "GASOLINA" || combustivel === "ETANOL") && (
        <label className="flex items-start gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flex}
            onChange={(e) => setFlex(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-[var(--color-caneta)]"
          />
          <span>
            É flex
            <span className="block text-[11.5px] text-tinta-3">
              Eu comparo os preços e digo se compensa abastecer com etanol.
            </span>
          </span>
        </label>
      )}

      <LinhaPicotada rotulo="consumo e custo" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Campo rotulo="km/l cidade" obrigatorio>
          <input
            name="consumoCidade"
            defaultValue={inicial?.consumoCidade ?? "10"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="km/l estrada">
          <input
            name="consumoEstrada"
            defaultValue={inicial?.consumoEstrada ?? "13"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Gasolina R$/L">
          <input
            name="precoGasolina"
            defaultValue={inicial?.precoGasolina ?? "6.09"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Etanol R$/L">
          <input
            name="precoEtanol"
            defaultValue={inicial?.precoEtanol ?? "4.29"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Diesel R$/L">
          <input
            name="precoDiesel"
            defaultValue={inicial?.precoDiesel ?? "6.19"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Manutenção R$/km" dica="pneu, óleo, revisão">
          <input
            name="custoManutencaoKm"
            defaultValue={inicial?.custoManutencaoKm ?? "0.35"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Pedágio/dia">
          <input
            name="pedagioMedioDia"
            defaultValue={inicial?.pedagioMedioDia ?? "0"}
            inputMode="decimal"
            className="campo cifra text-[13px]"
          />
        </Campo>
        <Campo rotulo="Hodômetro">
          <input
            name="hodometro"
            defaultValue={inicial?.hodometro}
            inputMode="numeric"
            className="campo cifra text-[13px]"
          />
        </Campo>
      </div>

      <label className="flex items-center gap-2.5 text-[13px] text-tinta-2 cursor-pointer">
        <input
          type="checkbox"
          checked={padrao}
          onChange={(e) => setPadrao(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-caneta)]"
        />
        Usar este veículo por padrão nas rotas
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={aoCancelar} className="botao botao-papel flex-1 text-[13px]">
          Cancelar
        </button>
        <button type="submit" disabled={pendente} className="botao botao-tinta flex-[2] text-[13px]">
          {pendente ? "Salvando..." : "Salvar veículo"}
        </button>
      </div>
    </form>
  );
}

// ==================================================================
// Regiões
// ==================================================================

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CORES_REGIAO = ["#1B34C4", "#12775A", "#CF7C11", "#C62439", "#7A3FB8", "#0E7490"];

export function SecaoRegioes({
  regioes,
  semRegiao,
}: {
  regioes: Array<{
    id: string;
    nome: string;
    cor: string;
    uf: string;
    diaSemana: string;
    cidades: string;
    total: number;
  }>;
  semRegiao: number;
}) {
  const { pendente, aviso, executar } = useAcao();
  const [criando, setCriando] = useState(false);
  const [cor, setCor] = useState(CORES_REGIAO[0]);

  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Regiões"
        sub="Agrupam a carteira e evitam zigue-zague na rota"
        icone="pino"
        acao={
          <button
            type="button"
            onClick={() => setCriando((v) => !v)}
            className="botao botao-papel text-[12.5px] px-2.5 py-1.5"
          >
            <Icone nome={criando ? "fechar" : "mais"} tamanho={14} />
            {criando ? "Fechar" : "Região"}
          </button>
        }
      />

      <div className="px-4 pb-4 space-y-3">
        {criando ? (
          <form
            action={(d) => {
              d.set("cor", cor);
              executar(() => salvarRegiao(d), "Região criada.");
              setCriando(false);
            }}
            className="rounded-xl border border-caneta p-3.5 space-y-3 anim-subir"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Campo rotulo="Nome" obrigatorio className="col-span-2">
                <input name="nome" placeholder="Campinas e região" className="campo text-[13px]" required />
              </Campo>
              <Campo rotulo="UF">
                <input name="uf" maxLength={2} className="campo text-[13px] uppercase" />
              </Campo>
              <Campo rotulo="Dia preferido">
                <select name="diaSemana" className="campo text-[13px]" defaultValue="">
                  <option value="">Qualquer</option>
                  {DIAS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo rotulo="Cidades" dica="Separe por vírgula — uso para encaixar os clientes.">
              <input
                name="cidades"
                placeholder="Campinas, Indaiatuba, Americana"
                className="campo text-[13px]"
              />
            </Campo>

            <div>
              <span className="rotulo">Cor</span>
              <div className="flex gap-2">
                {CORES_REGIAO.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                    className={cx("w-7 h-7 rounded-lg", cor === c && "ring-2 ring-offset-2 ring-offset-[var(--color-papel-alto)]")}
                    style={{ background: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : undefined }}
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={pendente} className="botao botao-tinta w-full text-[13px]">
              Criar região
            </button>
          </form>
        ) : null}

        {regioes.length > 0 ? (
          <div className="space-y-1.5">
            {regioes.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-papel-borda">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: r.cor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-tinta truncate">{r.nome}</p>
                  <p className="text-[11.5px] text-tinta-3 truncate">
                    {r.total} clientes
                    {r.diaSemana !== "" ? ` · ${DIAS[Number(r.diaSemana)]}` : ""}
                    {r.cidades ? ` · ${r.cidades}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => executar(() => excluirRegiao(r.id), "Região removida.")}
                  className="p-1.5 text-tinta-3 hover:text-carimbo shrink-0"
                  aria-label="Excluir região"
                >
                  <Icone nome="lixeira" tamanho={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-tinta-3">
            Sem regiões ainda. Elas fazem o roteirizador agrupar o dia por área.
          </p>
        )}

        {semRegiao > 0 && regioes.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              executar(async () => {
                const r = await distribuirRegioes();
                return { ok: r.encaixados >= 0 };
              }, "Clientes distribuídos pelas cidades cadastradas.")
            }
            disabled={pendente}
            className="botao botao-papel w-full text-[13px]"
          >
            <Icone nome="alvo" tamanho={14} />
            Encaixar {semRegiao} clientes sem região
          </button>
        ) : null}

        <Aviso aviso={aviso} />
      </div>
    </Canhoto>
  );
}

// ==================================================================
// Notificações
// ==================================================================

export function SecaoNotificacoes({ vapidPublica }: { vapidPublica: string }) {
  const [estado, setEstado] = useState<"verificando" | "indisponivel" | "negado" | "ativo" | "inativo">(
    "verificando",
  );
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("indisponivel");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }
      try {
        const registro = await navigator.serviceWorker.getRegistration();
        const inscricao = await registro?.pushManager.getSubscription();
        setEstado(inscricao ? "ativo" : "inativo");
      } catch {
        setEstado("inativo");
      }
    })();
  }, []);

  async function ativar() {
    setOcupado(true);
    setAviso(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado("negado");
        return;
      }

      const registro =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;

      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(vapidPublica),
      });

      const r = await fetch("/api/push/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inscricao.toJSON()),
      });

      if (!r.ok) throw new Error("Falha ao registrar");
      setEstado("ativo");
      setAviso("Pronto. Vou avisar sobre rota, visita e comissão.");
    } catch (e) {
      setAviso("Não consegui ativar aqui. Em iPhone, adicione o app à tela de início antes.");
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    await fetch("/api/push/testar", { method: "POST" });
    setAviso("Mandei um aviso de teste.");
    setOcupado(false);
  }

  return (
    <Canhoto>
      <CanhotoTitulo
        titulo="Notificações"
        sub="Rota do dia, visita próxima, comissão vencendo"
        icone="sino"
        acao={
          <Etiqueta tom={estado === "ativo" ? "quitado" : "neutro"}>
            {estado === "ativo" ? "ligadas" : "desligadas"}
          </Etiqueta>
        }
      />

      <div className="px-4 pb-4 space-y-3">
        {!vapidPublica ? (
          <p className="text-[12.5px] text-ambar bg-ambar-fundo rounded-xl px-3 py-2.5 leading-relaxed">
            Falta gerar as chaves do push. Rode <span className="cifra">npm run vapid</span> e cole o
            resultado no <span className="cifra">.env</span>.
          </p>
        ) : estado === "indisponivel" ? (
          <p className="text-[12.5px] text-tinta-3">
            Este navegador não suporta notificações push.
          </p>
        ) : estado === "negado" ? (
          <p className="text-[12.5px] text-carimbo bg-carimbo-fundo rounded-xl px-3 py-2.5">
            As notificações foram bloqueadas. Libere nas permissões do site e recarregue.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5 text-[12.5px] text-tinta-2">
              {[
                "De manhã: a rota do dia com km e custo",
                "30 min antes de cada visita",
                "3 dias antes de a comissão vencer, e no dia do atraso",
                "Quando um cliente bom some da carteira",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-caneta shrink-0 mt-px">
                    <Icone nome="check" tamanho={13} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              {estado === "ativo" ? (
                <button type="button" onClick={testar} disabled={ocupado} className="botao botao-papel">
                  <Icone nome="sino" tamanho={15} />
                  Mandar teste
                </button>
              ) : (
                <button type="button" onClick={ativar} disabled={ocupado} className="botao botao-tinta">
                  <Icone nome="sino" tamanho={15} />
                  {ocupado ? "Ativando..." : "Ativar notificações"}
                </button>
              )}
            </div>

            <p className="text-[11.5px] text-tinta-3 leading-snug">
              No iPhone é preciso adicionar o app à tela de início (Compartilhar → Adicionar à Tela
              de Início) antes de ativar.
            </p>
          </>
        )}

        {aviso ? (
          <p className="text-[12.5px] text-tinta-2 bg-[color-mix(in_oklab,var(--color-tinta)_5%,transparent)] rounded-xl px-3 py-2.5">
            {aviso}
          </p>
        ) : null}
      </div>
    </Canhoto>
  );
}

function base64ParaUint8(base64: string): Uint8Array<ArrayBuffer> {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalizado = (base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(normalizado);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

// ==================================================================
// Segurança
// ==================================================================

export function SecaoSeguranca() {
  const { pendente, aviso, executar } = useAcao();

  return (
    <Canhoto>
      <CanhotoTitulo titulo="Senha" icone="cadeado" />
      <form
        action={(d) => executar(() => trocarSenha(d), "Senha trocada.")}
        className="px-4 pb-4 space-y-3"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Senha atual" obrigatorio>
            <input type="password" name="senhaAtual" className="campo" required />
          </Campo>
          <Campo rotulo="Nova senha" obrigatorio>
            <input type="password" name="senhaNova" className="campo" required minLength={6} />
          </Campo>
        </div>
        <Aviso aviso={aviso} />
        <button type="submit" disabled={pendente} className="botao botao-papel">
          Trocar senha
        </button>
      </form>
    </Canhoto>
  );
}
