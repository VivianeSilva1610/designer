"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PlantaSvg from "@/components/PlantaSvg";
import { useProjetos } from "@/lib/store";
import {
  PAREDE_LABEL,
  TIPO_ABERTURA_LABEL,
  comprimentoParede,
  conflitosPlanta,
  novoId,
  type Abertura,
  type Movel,
  type Parede,
  type Planta,
  type TipoAbertura,
} from "@/lib/types";

const BIBLIOTECA_ABERTURAS: { nome: string; tipo: TipoAbertura; largura: number; altura: number; peitoril: number }[] = [
  { nome: "Porta 80 cm", tipo: "porta", largura: 0.8, altura: 2.1, peitoril: 0 },
  { nome: "Porta 70 cm (banheiro)", tipo: "porta", largura: 0.7, altura: 2.1, peitoril: 0 },
  { nome: "Porta de entrada 90 cm", tipo: "porta", largura: 0.9, altura: 2.1, peitoril: 0 },
  { nome: "Porta de correr 1,60 m", tipo: "porta_correr", largura: 1.6, altura: 2.1, peitoril: 0 },
  { nome: "Janela 1,20 m", tipo: "janela", largura: 1.2, altura: 1.2, peitoril: 1.1 },
  { nome: "Janela 1,50 m", tipo: "janela", largura: 1.5, altura: 1.2, peitoril: 1.0 },
  { nome: "Janela alta (banheiro) 60 cm", tipo: "janela", largura: 0.6, altura: 0.6, peitoril: 1.6 },
  { nome: "Porta-balcão 2,00 m", tipo: "porta_balcao", largura: 2.0, altura: 2.2, peitoril: 0 },
];

const BIBLIOTECA: { nome: string; w: number; h: number; cor: string }[] = [
  { nome: "Sofá 3 lugares", w: 2.1, h: 0.9, cor: "#d9c3a5" },
  { nome: "Sofá 2 lugares", w: 1.6, h: 0.9, cor: "#d9c3a5" },
  { nome: "Poltrona", w: 0.8, h: 0.8, cor: "#c9a98a" },
  { nome: "Mesa de centro", w: 1.0, h: 0.6, cor: "#b8987a" },
  { nome: "Rack / painel TV", w: 1.8, h: 0.45, cor: "#9c8169" },
  { nome: "Tapete", w: 2.0, h: 1.4, cor: "#eadfcf" },
  { nome: "Mesa de jantar 6 lug.", w: 1.6, h: 0.9, cor: "#b8987a" },
  { nome: "Mesa redonda 4 lug.", w: 1.1, h: 1.1, cor: "#b8987a" },
  { nome: "Cadeira", w: 0.45, h: 0.5, cor: "#c9a98a" },
  { nome: "Buffet / aparador", w: 1.6, h: 0.45, cor: "#9c8169" },
  { nome: "Cama casal", w: 1.4, h: 1.9, cor: "#cfd8dc" },
  { nome: "Cama queen", w: 1.6, h: 2.0, cor: "#cfd8dc" },
  { nome: "Cama king", w: 1.93, h: 2.03, cor: "#cfd8dc" },
  { nome: "Cama solteiro", w: 0.88, h: 1.88, cor: "#cfd8dc" },
  { nome: "Criado-mudo", w: 0.5, h: 0.4, cor: "#9c8169" },
  { nome: "Guarda-roupa", w: 2.0, h: 0.6, cor: "#8d7560" },
  { nome: "Escrivaninha", w: 1.2, h: 0.6, cor: "#b8987a" },
  { nome: "Cadeira escritório", w: 0.6, h: 0.6, cor: "#a5b4a0" },
  { nome: "Estante", w: 1.0, h: 0.35, cor: "#8d7560" },
  { nome: "Bancada cozinha", w: 2.4, h: 0.6, cor: "#bfc5c9" },
  { nome: "Geladeira", w: 0.7, h: 0.7, cor: "#dfe3e6" },
  { nome: "Fogão", w: 0.6, h: 0.6, cor: "#dfe3e6" },
  { nome: "Vaso sanitário", w: 0.4, h: 0.65, cor: "#ffffff" },
  { nome: "Box chuveiro", w: 0.9, h: 0.9, cor: "#dbe9f0" },
  { nome: "Planta / vaso", w: 0.45, h: 0.45, cor: "#a5c49a" },
];

const PADRAO: Planta = { largura: 4, comprimento: 5, moveis: [] };

function Editor() {
  const busca = useSearchParams();
  const { projetos, atualizar } = useProjetos();
  const [projetoId, setProjetoId] = useState<string>(busca.get("projeto") ?? "");
  const [ambienteId, setAmbienteId] = useState<string>(busca.get("ambiente") ?? "");
  const [planta, setPlanta] = useState<Planta>(PADRAO);
  const [sel, setSel] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const projeto = projetos.find((p) => p.id === projetoId);
  const ambiente = projeto?.ambientes.find((a) => a.id === ambienteId);

  // ao trocar de projeto, escolhe o primeiro ambiente se o atual não pertencer a ele
  useEffect(() => {
    if (projeto && !projeto.ambientes.some((a) => a.id === ambienteId)) {
      setAmbienteId(projeto.ambientes[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto?.id]);

  // carrega a planta do ambiente escolhido
  useEffect(() => {
    if (ambiente) {
      setPlanta(ambiente.planta ?? PADRAO);
      setSel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambiente?.id]);

  const movel = planta.moveis.find((m) => m.id === sel);
  const abertura = planta.aberturas?.find((a) => a.id === sel);
  const conflitos = conflitosPlanta(planta);
  const area = planta.largura * planta.comprimento;

  function adicionarAbertura(b: (typeof BIBLIOTECA_ABERTURAS)[number]) {
    // coloca na primeira parede com espaço livre, começando pela inferior
    const ordem: Parede[] = ["sul", "norte", "oeste", "leste"];
    const parede = ordem.find((pd) => comprimentoParede(planta, pd) >= b.largura + 0.2) ?? "sul";
    const a: Abertura = {
      id: novoId(),
      tipo: b.tipo,
      parede,
      largura: b.largura,
      altura: b.altura,
      peitoril: b.peitoril,
      posicao: +Math.max(0, (comprimentoParede(planta, parede) - b.largura) / 2).toFixed(2),
      dobradica: "esquerda",
      abreParaFora: false,
    };
    setPlanta((p) => ({ ...p, aberturas: [...(p.aberturas ?? []), a] }));
    setSel(a.id);
  }

  function mudarAbertura(id: string, campos: Partial<Abertura>) {
    setPlanta((p) => ({
      ...p,
      aberturas: (p.aberturas ?? []).map((a) => {
        if (a.id !== id) return a;
        const n = { ...a, ...campos };
        // mantém a abertura dentro da parede
        const max = Math.max(0, comprimentoParede(p, n.parede) - n.largura);
        return { ...n, posicao: +Math.min(Math.max(0, n.posicao), max).toFixed(2) };
      }),
    }));
  }
  const ocupada = planta.moveis.filter((m) => m.nome !== "Tapete").reduce((s, m) => s + m.w * m.h, 0);

  function adicionar(b: (typeof BIBLIOTECA)[number]) {
    const m: Movel = { id: novoId(), nome: b.nome, w: b.w, h: b.h, cor: b.cor, x: 0.2, y: 0.2 };
    // tapetes ficam por baixo dos outros móveis
    setPlanta((p) => ({ ...p, moveis: b.nome === "Tapete" ? [m, ...p.moveis] : [...p.moveis, m] }));
    setSel(m.id);
  }

  function mudarMovel(id: string, campos: Partial<Movel>) {
    setPlanta((p) => ({ ...p, moveis: p.moveis.map((m) => (m.id === id ? { ...m, ...campos } : m)) }));
  }

  function salvar() {
    if (!projetoId || !ambienteId) {
      setAviso("Escolha um projeto e um ambiente para salvar a planta.");
      return;
    }
    atualizar(projetoId, (p) => ({
      ...p,
      ambientes: p.ambientes.map((a) => (a.id === ambienteId ? { ...a, planta } : a)),
    }));
    setAviso(`Planta de "${ambiente?.nome}" salva ✔`);
    setTimeout(() => setAviso(""), 2500);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Planta baixa</h1>
          <p className="text-sm text-muted">Defina as medidas do cômodo, adicione móveis e arraste para posicionar. Grade de 50 cm.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-56" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
            <option value="">— sem projeto —</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {projeto && (
            <select className="input w-48" value={ambienteId} onChange={(e) => setAmbienteId(e.target.value)}>
              {projeto.ambientes.length === 0 && <option value="">projeto sem ambientes</option>}
              {projeto.ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.planta ? " ✓" : ""}</option>)}
            </select>
          )}
          <button className="btn" onClick={salvar}>Salvar planta</button>
        </div>
      </div>
      {aviso && <div className="rounded-xl bg-accent-soft px-4 py-2 text-sm text-accent">{aviso}</div>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_260px]">
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Largura (m)</label>
              <input className="input" type="number" step="0.05" min="1" value={planta.largura} onChange={(e) => setPlanta({ ...planta, largura: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div>
              <label className="label">Comprimento (m)</label>
              <input className="input" type="number" step="0.05" min="1" value={planta.comprimento} onChange={(e) => setPlanta({ ...planta, comprimento: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
          </div>
          <div className="text-sm text-muted">
            Área: <b className="text-ink">{area.toFixed(2)} m²</b> · ocupação dos móveis: <b className="text-ink">{area ? Math.round((ocupada / area) * 100) : 0}%</b>
          </div>
          <div>
            <div className="label">Portas e janelas</div>
            <div className="space-y-1">
              {BIBLIOTECA_ABERTURAS.map((b) => (
                <button key={b.nome} onClick={() => adicionarAbertura(b)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent-soft">
                  <span className="w-4 text-center text-muted">{b.tipo === "janela" ? "▭" : b.tipo === "porta" ? "◜" : "⇆"}</span>
                  {b.nome}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Adicionar móvel</div>
            <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1">
              {BIBLIOTECA.map((b) => (
                <button key={b.nome} onClick={() => adicionar(b)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent-soft">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm border border-line" style={{ background: b.cor }} />
                    {b.nome}
                  </span>
                  <span className="text-xs text-muted">{b.w}×{b.h}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-3">
          <PlantaSvg
            planta={planta}
            selecionado={sel}
            onSelecionar={setSel}
            onMover={(id, x, y) => mudarMovel(id, { x, y })}
            onMoverAbertura={(id, parede, posicao) => mudarAbertura(id, { parede, posicao })}
          />
        </div>

        <div className="card space-y-3">
          {abertura ? (
            <>
              <div className="label">Abertura selecionada</div>
              <select className="input" value={abertura.tipo} onChange={(e) => mudarAbertura(abertura.id, { tipo: e.target.value as TipoAbertura })}>
                {Object.entries(TIPO_ABERTURA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Parede</label>
                  <select className="input" value={abertura.parede} onChange={(e) => mudarAbertura(abertura.id, { parede: e.target.value as Parede })}>
                    {Object.entries(PAREDE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" title="Distância do canto esquerdo (paredes superior/inferior) ou do canto de cima (paredes laterais)">Do canto (m)</label>
                  <input className="input" type="number" step="0.05" min="0" value={abertura.posicao} onChange={(e) => mudarAbertura(abertura.id, { posicao: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Largura (m)</label>
                  <input className="input" type="number" step="0.05" min="0.3" value={abertura.largura} onChange={(e) => mudarAbertura(abertura.id, { largura: Math.max(0.3, Number(e.target.value) || 0.3) })} />
                </div>
                <div>
                  <label className="label">Altura (m)</label>
                  <input className="input" type="number" step="0.05" min="0.3" value={abertura.altura} onChange={(e) => mudarAbertura(abertura.id, { altura: Math.max(0.3, Number(e.target.value) || 0.3) })} />
                </div>
                {abertura.tipo === "janela" && (
                  <div className="col-span-2">
                    <label className="label">Peitoril (m do piso)</label>
                    <input className="input" type="number" step="0.05" min="0" value={abertura.peitoril} onChange={(e) => mudarAbertura(abertura.id, { peitoril: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                )}
              </div>
              {abertura.tipo === "porta" && (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => mudarAbertura(abertura.id, { dobradica: abertura.dobradica === "esquerda" ? "direita" : "esquerda" })}>
                    ⇋ Inverter dobradiça
                  </button>
                  <button className="btn-ghost" onClick={() => mudarAbertura(abertura.id, { abreParaFora: !abertura.abreParaFora })}>
                    {abertura.abreParaFora ? "Abrir para dentro" : "Abrir para fora"}
                  </button>
                </div>
              )}
              <button
                className="btn-ghost text-danger"
                onClick={() => {
                  setPlanta((p) => ({ ...p, aberturas: (p.aberturas ?? []).filter((a) => a.id !== abertura.id) }));
                  setSel(null);
                }}
              >
                Remover
              </button>
              <p className="text-xs text-muted">Dica: arraste a abertura para outra parede ou para deslizar ao longo dela.</p>
            </>
          ) : movel ? (
            <>
              <div className="label">Móvel selecionado</div>
              <input className="input" value={movel.nome} onChange={(e) => mudarMovel(movel.id, { nome: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Largura (m)</label>
                  <input className="input" type="number" step="0.05" min="0.1" value={movel.w} onChange={(e) => mudarMovel(movel.id, { w: Math.max(0.1, Number(e.target.value) || 0.1) })} />
                </div>
                <div>
                  <label className="label">Profund. (m)</label>
                  <input className="input" type="number" step="0.05" min="0.1" value={movel.h} onChange={(e) => mudarMovel(movel.id, { h: Math.max(0.1, Number(e.target.value) || 0.1) })} />
                </div>
                <div>
                  <label className="label">X (m)</label>
                  <input className="input" type="number" step="0.05" value={movel.x} onChange={(e) => mudarMovel(movel.id, { x: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Y (m)</label>
                  <input className="input" type="number" step="0.05" value={movel.y} onChange={(e) => mudarMovel(movel.id, { y: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="label">Cor</label>
                <input type="color" className="h-9 w-full rounded-lg" value={movel.cor} onChange={(e) => mudarMovel(movel.id, { cor: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => mudarMovel(movel.id, { w: movel.h, h: movel.w })}>⟳ Girar 90°</button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const c = { ...movel, id: novoId(), x: movel.x + 0.2, y: movel.y + 0.2 };
                    setPlanta((p) => ({ ...p, moveis: [...p.moveis, c] }));
                    setSel(c.id);
                  }}
                >
                  Duplicar
                </button>
                <button
                  className="btn-ghost text-danger"
                  onClick={() => {
                    setPlanta((p) => ({ ...p, moveis: p.moveis.filter((m) => m.id !== movel.id) }));
                    setSel(null);
                  }}
                >
                  Remover
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Clique em um móvel, porta ou janela na planta para editar medidas, girar ou remover.</p>
          )}
          {conflitos.length > 0 && (
            <div className="space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-warn">
              {conflitos.map((c, i) => <div key={i}>⚠ {c}</div>)}
            </div>
          )}
          <hr className="border-line" />
          <div className="text-xs text-muted">
            Dica de circulação: deixe ao menos 60–80 cm livres nas passagens e 75 cm na lateral das camas.
          </div>
          <button className="btn-ghost w-full" onClick={() => { if (confirm("Limpar todos os móveis, portas e janelas?")) setPlanta({ ...planta, moveis: [], aberturas: [] }); }}>
            Limpar planta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaginaPlanta() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
