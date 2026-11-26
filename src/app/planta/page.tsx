"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import PlantaSvg from "@/components/PlantaSvg";
import { useProjetos } from "@/lib/store";
import EditorFormato from "@/components/EditorFormato";
import { BIBLIOTECA, lugaresDoMovel, medidaTV, polegadasDaTV, type ItemBiblioteca } from "@/lib/biblioteca";
import { desagrupar, duplicarConjunto, girarConjunto, membros, moverConjunto, pecasDoItem, removerConjunto, repetirEmGrade } from "@/lib/conjuntos";
import { gerarArcada } from "@/lib/arquitetura";
import {
  DIRECAO_LABEL,
  aplicarCantos,
  areaLivre,
  areaPlanta,
  cantos,
  comprimentoParede,
  conflitosPlanta,
  folgasMovel,
  letraParede,
  naoOcupaPiso,
  nivelFolga,
  paredes,
} from "@/lib/geometria";
import {
  TIPO_ABERTURA_LABEL,
  novoId,
  temGiro,
  type Abertura,
  type Movel,
  type Planta,
  type TipoAbertura,
} from "@/lib/types";

interface ModeloAbertura {
  nome: string;
  tipo: TipoAbertura;
  largura: number;
  altura: number;
  peitoril: number;
  arco?: boolean;
}

const CHAVE_MODELOS = "studio-interiores:modelos-aberturas";
const ICONE: Record<TipoAbertura, string> = { porta: "◜", porta_dupla: "◠", porta_correr: "⇆", porta_balcao: "⇆", janela: "▭", vao: "⊓" };

// "Meus modelos" de portas/janelas: guardados no navegador e lidos com useSyncExternalStore
const ouvintesModelos = new Set<() => void>();
const SEM_MODELOS: ModeloAbertura[] = [];
let cacheModelos: ModeloAbertura[] | null = null;

function lerModelos(): ModeloAbertura[] {
  if (cacheModelos) return cacheModelos;
  try {
    cacheModelos = JSON.parse(localStorage.getItem(CHAVE_MODELOS) ?? "[]");
  } catch {
    cacheModelos = [];
  }
  return cacheModelos!;
}

function gravarModelos(lista: ModeloAbertura[]) {
  cacheModelos = lista;
  try {
    localStorage.setItem(CHAVE_MODELOS, JSON.stringify(lista));
  } catch {
    /* armazenamento indisponível: os modelos valem só nesta sessão */
  }
  ouvintesModelos.forEach((f) => f());
}

function assinarModelos(f: () => void) {
  ouvintesModelos.add(f);
  return () => {
    ouvintesModelos.delete(f);
  };
}

/** Valores típicos ao trocar o tipo no formulário personalizado. */
const SUGESTAO: Record<TipoAbertura, { largura: number; altura: number; peitoril: number }> = {
  porta: { largura: 0.8, altura: 2.1, peitoril: 0 },
  porta_dupla: { largura: 1.4, altura: 2.1, peitoril: 0 },
  porta_correr: { largura: 1.6, altura: 2.1, peitoril: 0 },
  porta_balcao: { largura: 2.0, altura: 2.2, peitoril: 0 },
  janela: { largura: 1.2, altura: 1.2, peitoril: 1.1 },
  vao: { largura: 1.0, altura: 2.1, peitoril: 0 },
};

const BIBLIOTECA_ABERTURAS: ModeloAbertura[] = [
  { nome: "Porta 80 cm", tipo: "porta", largura: 0.8, altura: 2.1, peitoril: 0 },
  { nome: "Porta 70 cm (banheiro)", tipo: "porta", largura: 0.7, altura: 2.1, peitoril: 0 },
  { nome: "Porta de entrada 90 cm", tipo: "porta", largura: 0.9, altura: 2.1, peitoril: 0 },
  { nome: "Porta dupla 1,40 m", tipo: "porta_dupla", largura: 1.4, altura: 2.1, peitoril: 0 },
  { nome: "Porta de correr 1,60 m", tipo: "porta_correr", largura: 1.6, altura: 2.1, peitoril: 0 },
  { nome: "Janela 1,20 m", tipo: "janela", largura: 1.2, altura: 1.2, peitoril: 1.1 },
  { nome: "Janela 1,50 m", tipo: "janela", largura: 1.5, altura: 1.2, peitoril: 1.0 },
  { nome: "Janela alta (banheiro) 60 cm", tipo: "janela", largura: 0.6, altura: 0.6, peitoril: 1.6 },
  { nome: "Porta-balcão 2,00 m", tipo: "porta_balcao", largura: 2.0, altura: 2.2, peitoril: 0 },
  { nome: "Vão livre 1,00 m", tipo: "vao", largura: 1.0, altura: 2.1, peitoril: 0 },
  { nome: "Janela em arco 0,90 m", tipo: "janela", largura: 0.9, altura: 1.8, peitoril: 1.0, arco: true },
  { nome: "Porta em arco 1,00 m", tipo: "porta_dupla", largura: 1.0, altura: 2.5, peitoril: 0, arco: true },
  { nome: "Arco (vão livre) 1,60 m", tipo: "vao", largura: 1.6, altura: 2.6, peitoril: 0, arco: true },
];

const FORM_INICIAL = { tipo: "porta" as TipoAbertura, largura: "0.80", altura: "2.10", peitoril: "0", parede: "auto", posicao: "", nome: "", salvar: false, arco: false };

const PADRAO: Planta = { largura: 4, comprimento: 5, moveis: [] };

function Editor() {
  const busca = useSearchParams();
  const { projetos, atualizar } = useProjetos();
  const [projetoId, setProjetoId] = useState<string>(busca.get("projeto") ?? "");
  const [ambienteId, setAmbienteId] = useState<string>(busca.get("ambiente") ?? "");
  const [planta, setPlanta] = useState<Planta>(PADRAO);
  const [sel, setSel] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [mostrarPersonalizada, setMostrarPersonalizada] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const modelos = useSyncExternalStore(assinarModelos, lerModelos, () => SEM_MODELOS);
  const [erroForm, setErroForm] = useState("");
  const [editandoCantos, setEditandoCantos] = useState(false);
  const [cantoSel, setCantoSel] = useState<number | null>(null);
  const [buscaMovel, setBuscaMovel] = useState("");
  const [mostrarFolgas, setMostrarFolgas] = useState(true);
  const [regua, setRegua] = useState(false);
  const [grade, setGrade] = useState({ linhas: "3", colunas: "4", folga: "0.60" });
  const [arcada, setArcada] = useState({ aberto: false, parede: "auto", largura: "1.60", pilar: "0.40", altura: "2.60", erro: "" });
  const [movelPers, setMovelPers] = useState<{ aberto: boolean; nome: string; w: string; h: string; cor: string }>({ aberto: false, nome: "", w: "1.00", h: "0.60", cor: "#b8987a" });

  const projeto = projetos.find((p) => p.id === projetoId);
  const ambiente = projeto?.ambientes.find((a) => a.id === ambienteId);

  // Ajustes quando o projeto/ambiente muda, feitos durante a renderização
  // (padrão recomendado pelo React em vez de useEffect + setState).
  // 1) projeto novo: escolhe o primeiro ambiente se o atual não pertencer a ele
  const [projetoVisto, setProjetoVisto] = useState<string | undefined>(undefined);
  if (projeto && projeto.id !== projetoVisto) {
    setProjetoVisto(projeto.id);
    if (!projeto.ambientes.some((a) => a.id === ambienteId)) setAmbienteId(projeto.ambientes[0]?.id ?? "");
  }
  // 2) ambiente novo: carrega a planta dele
  const [ambienteVisto, setAmbienteVisto] = useState<string | undefined>(undefined);
  if (ambiente && ambiente.id !== ambienteVisto) {
    setAmbienteVisto(ambiente.id);
    setPlanta(ambiente.planta ?? PADRAO);
    setSel(null);
    setEditandoCantos(false);
    setCantoSel(null);
  }

  const movel = planta.moveis.find((m) => m.id === sel);
  const abertura = planta.aberturas?.find((a) => a.id === sel);
  const conflitos = conflitosPlanta(planta);
  const area = areaPlanta(planta);
  const listaParedes = paredes(planta);

  function adicionarAbertura(b: ModeloAbertura, paredeEscolhida?: number, posicaoEscolhida?: number) {
    // sem parede escolhida: a parede mais comprida
    const maisLonga = [...listaParedes].sort((x, y) => y.comprimento - x.comprimento)[0];
    const parede = paredeEscolhida ?? maisLonga?.i ?? 0;
    const max = Math.max(0, comprimentoParede(planta, parede) - b.largura);
    const a: Abertura = {
      id: novoId(),
      tipo: b.tipo,
      parede,
      largura: b.largura,
      altura: b.altura,
      peitoril: b.peitoril,
      posicao: +Math.min(max, Math.max(0, posicaoEscolhida ?? max / 2)).toFixed(2),
      dobradica: "esquerda",
      abreParaFora: false,
      ...(b.arco ? { arco: true } : {}),
    };
    setPlanta((p) => ({ ...p, aberturas: [...(p.aberturas ?? []), a] }));
    setSel(a.id);
  }

  function criarPersonalizada(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => Number(v.replace(",", "."));
    const largura = num(form.largura);
    const altura = num(form.altura);
    const peitoril = form.tipo === "janela" ? num(form.peitoril) : 0;
    if (!(largura >= 0.3 && largura <= 10)) return setErroForm("Largura deve ficar entre 0,30 e 10 m.");
    if (!(altura >= 0.3 && altura <= 10)) return setErroForm("Altura deve ficar entre 0,30 e 10 m.");
    if (!(peitoril >= 0 && peitoril <= 10)) return setErroForm("Peitoril deve ficar entre 0 e 10 m.");
    if (form.arco && altura < largura / 2) return setErroForm("Para ter arco, a altura precisa ser pelo menos metade da largura.");
    const parede = form.parede === "auto" ? undefined : Number(form.parede);
    const maiorParede = Math.max(...listaParedes.map((par) => par.comprimento));
    if (largura > (parede !== undefined ? comprimentoParede(planta, parede) : maiorParede)) {
      return setErroForm("A abertura é mais larga que a parede. Confira as medidas do cômodo.");
    }
    setErroForm("");
    const modelo: ModeloAbertura = {
      nome: form.nome.trim() || `${TIPO_ABERTURA_LABEL[form.tipo].split(" (")[0]}${form.arco ? " em arco" : ""} ${largura.toFixed(2).replace(".", ",")} m`,
      tipo: form.tipo,
      largura,
      altura,
      peitoril,
      ...(form.arco ? { arco: true } : {}),
    };
    adicionarAbertura(modelo, parede, form.posicao ? num(form.posicao) : undefined);
    if (form.salvar) {
      const lista = [...modelos.filter((m) => m.nome !== modelo.nome), modelo];

      gravarModelos(lista);
    }
    setForm({ ...form, nome: "", posicao: "", salvar: false });
  }

  /** Enche uma parede com arcos iguais separados por pilares (pórtico / galeria). */
  function criarArcada(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => Number(v.replace(",", "."));
    const largura = num(arcada.largura), pilar = num(arcada.pilar), altura = num(arcada.altura);
    const erro = (msg: string) => setArcada({ ...arcada, erro: msg });
    if (!(largura >= 0.5 && largura <= 6)) return erro("Largura do arco entre 0,50 e 6 m.");
    if (!(pilar >= 0.15 && pilar <= 2)) return erro("Pilar entre 0,15 e 2 m.");
    if (!(altura >= largura / 2 && altura <= 10)) return erro("A altura precisa ser pelo menos metade da largura do arco (e até 10 m).");
    const maisLonga = [...listaParedes].sort((x, y) => y.comprimento - x.comprimento)[0];
    const parede = arcada.parede === "auto" ? maisLonga?.i ?? 0 : Number(arcada.parede);
    const posicoes = gerarArcada(comprimentoParede(planta, parede), largura, pilar);
    if (!posicoes.length) return erro("Não cabe nenhum arco nessa parede com essas medidas.");
    const naParede = (planta.aberturas ?? []).filter((a) => a.parede === parede);
    if (naParede.length && !confirm(`A parede ${letraParede(parede)} já tem ${naParede.length} abertura(s). Substituir pelos arcos?`)) return;
    const arcos: Abertura[] = posicoes.map((posicao) => ({
      id: novoId(), tipo: "vao", parede, posicao, largura, altura, peitoril: 0, dobradica: "esquerda", abreParaFora: false, arco: true,
    }));
    setPlanta((p) => ({ ...p, aberturas: [...(p.aberturas ?? []).filter((a) => a.parede !== parede), ...arcos] }));
    setArcada({ ...arcada, erro: "", aberto: false });
    setSel(null);
    setAviso(`${arcos.length} arcos criados na parede ${letraParede(parede)}. Veja em 3D com “Paredes inteiras”.`);
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
  const ocupada = planta.moveis.filter((m) => !naoOcupaPiso(m.nome)).reduce((s, m) => s + m.w * m.h, 0);

  function adicionar(b: ItemBiblioteca) {
    const pecas = pecasDoItem(b, 0.2, 0.2);
    // tapetes ficam por baixo dos outros móveis
    setPlanta((p) => ({ ...p, moveis: /tapete|área de giro/i.test(b.nome) ? [...pecas, ...p.moveis] : [...p.moveis, ...pecas] }));
    setSel(pecas[0].id);
  }

  const lugares = planta.moveis.reduce((s, m) => s + lugaresDoMovel(m.nome), 0);
  const conjuntoSel = movel ? membros(planta.moveis, movel) : [];

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
          {projeto && ambiente?.planta && (
            <a className="btn-ghost" href={`/projetos/${projeto.id}/casa?vista=3d&comodo=${ambiente.id}`} title="Salve antes para ver as últimas mudanças">
              ◈ Ver em 3D
            </a>
          )}
        </div>
      </div>
      {aviso && <div className="rounded-xl bg-accent-soft px-4 py-2 text-sm text-accent">{aviso}</div>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_260px]">
        <div className="card space-y-4">
          <EditorFormato
            planta={planta}
            onChange={setPlanta}
            editandoCantos={editandoCantos}
            onEditandoCantos={setEditandoCantos}
            cantoSelecionado={cantoSel}
            onSelecionarCanto={setCantoSel}
          />
          <div className="text-sm text-muted">
            Área: <b className="text-ink">{area.toFixed(2)} m²</b> · livre: <b className="text-ink">{areaLivre(planta).toFixed(2)} m²</b> · ocupação: <b className="text-ink">{area ? Math.round((ocupada / area) * 100) : 0}%</b>
            {lugares > 0 && (
              <div className="mt-1" title="Referência para salões de restaurante: cerca de 1,2 a 1,5 m² por lugar, já contando a circulação">
                Lugares: <b className="text-ink">{lugares}</b> · <b className="text-ink">{(area / lugares).toFixed(2).replace(".", ",")} m²</b> por lugar
                {(() => {
                  const r = area / lugares;
                  if (r < 1.1) return <span className="text-danger"> (apertado)</span>;
                  if (r <= 1.6) return <span className="text-ok"> (bom para restaurante)</span>;
                  return <span> (espaçoso)</span>;
                })()}
              </div>
            )}
          </div>
          <div>
            <div className="label">Portas e janelas</div>
            <button
              className={`mb-2 w-full ${mostrarPersonalizada ? "btn" : "btn-ghost"}`}
              onClick={() => setMostrarPersonalizada(!mostrarPersonalizada)}
            >
              {mostrarPersonalizada ? "Fechar" : "✎ Criar com medida personalizada"}
            </button>

            {mostrarPersonalizada && (
              <form onSubmit={criarPersonalizada} className="mb-3 space-y-2 rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <div>
                  <label className="label">Tipo</label>
                  <select
                    className="input"
                    value={form.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoAbertura;
                      const s = SUGESTAO[tipo];
                      setForm({ ...form, tipo, largura: s.largura.toFixed(2), altura: s.altura.toFixed(2), peitoril: s.peitoril.toFixed(2) });
                    }}
                  >
                    {Object.entries(TIPO_ABERTURA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Largura (m)</label>
                    <input className="input" inputMode="decimal" value={form.largura} onChange={(e) => setForm({ ...form, largura: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Altura (m)</label>
                    <input className="input" inputMode="decimal" value={form.altura} onChange={(e) => setForm({ ...form, altura: e.target.value })} />
                  </div>
                  {form.tipo === "janela" && (
                    <div className="col-span-2">
                      <label className="label">Peitoril (m do piso)</label>
                      <input className="input" inputMode="decimal" value={form.peitoril} onChange={(e) => setForm({ ...form, peitoril: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <label className="label">Parede</label>
                    <select className="input" value={form.parede} onChange={(e) => setForm({ ...form, parede: e.target.value })}>
                      <option value="auto">Automática</option>
                      {listaParedes.map((par) => <option key={par.i} value={par.i}>{letraParede(par.i)} ({par.comprimento.toFixed(2)} m)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" title="Distância a partir do início da parede">Do início (m)</label>
                    <input className="input" inputMode="decimal" placeholder="centro" value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.arco} onChange={(e) => setForm({ ...form, arco: e.target.checked })} />
                  Topo em arco (⌒ arco romano)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.salvar} onChange={(e) => setForm({ ...form, salvar: e.target.checked })} />
                  Salvar em “Meus modelos”
                </label>
                {form.salvar && (
                  <input className="input" placeholder="Nome do modelo (ex.: Porta suíte 72 cm)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                )}
                {erroForm && <div className="text-xs text-danger">{erroForm}</div>}
                <button className="btn w-full" type="submit">Adicionar na planta</button>
              </form>
            )}

            <button className={`mb-2 w-full ${arcada.aberto ? "btn" : "btn-ghost"}`} onClick={() => setArcada({ ...arcada, aberto: !arcada.aberto, erro: "" })}>
              {arcada.aberto ? "Fechar" : "🏛 Criar arcada (sequência de arcos)"}
            </button>
            {arcada.aberto && (
              <form onSubmit={criarArcada} className="mb-3 space-y-2 rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <p className="text-xs text-muted">Enche a parede com arcos iguais separados por pilares, como num pórtico ou claustro.</p>
                <div>
                  <label className="label">Parede</label>
                  <select className="input" value={arcada.parede} onChange={(e) => setArcada({ ...arcada, parede: e.target.value })}>
                    <option value="auto">A mais comprida</option>
                    {listaParedes.map((par) => <option key={par.i} value={par.i}>{letraParede(par.i)} ({par.comprimento.toFixed(2)} m)</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Arco (m)</label>
                    <input className="input" inputMode="decimal" value={arcada.largura} onChange={(e) => setArcada({ ...arcada, largura: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Pilar (m)</label>
                    <input className="input" inputMode="decimal" value={arcada.pilar} onChange={(e) => setArcada({ ...arcada, pilar: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Altura (m)</label>
                    <input className="input" inputMode="decimal" value={arcada.altura} onChange={(e) => setArcada({ ...arcada, altura: e.target.value })} />
                  </div>
                </div>
                {(() => {
                  const par = arcada.parede === "auto" ? [...listaParedes].sort((x, y) => y.comprimento - x.comprimento)[0] : listaParedes.find((q) => q.i === Number(arcada.parede));
                  const n = par ? gerarArcada(par.comprimento, Number(arcada.largura.replace(",", ".")), Number(arcada.pilar.replace(",", "."))).length : 0;
                  return <div className="text-xs text-muted">{n > 0 ? `Cabem ${n} arcos nessa parede.` : "Não cabe nenhum arco com essas medidas."}</div>;
                })()}
                {arcada.erro && <div className="text-xs text-danger">{arcada.erro}</div>}
                <button className="btn w-full" type="submit">Criar arcos</button>
              </form>
            )}

            {modelos.length > 0 && (
              <div className="mb-2">
                <div className="mb-1 text-xs font-medium text-muted">Meus modelos</div>
                {modelos.map((b) => (
                  <div key={b.nome} className="group flex items-center rounded-lg hover:bg-accent-soft">
                    <button onClick={() => adicionarAbertura(b)} className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" title={`${b.largura} × ${b.altura} m`}>
                      <span className="w-4 text-center text-muted">{b.arco ? "⌒" : ICONE[b.tipo]}</span>
                      {b.nome}
                    </button>
                    <button
                      className="hidden px-2 text-xs text-danger group-hover:block"
                      title="Excluir modelo"
                      onClick={() => {
                        const lista = modelos.filter((m) => m.nome !== b.nome);

                        gravarModelos(lista);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-1 text-xs font-medium text-muted">Medidas padrão</div>
            <div className="space-y-1">
              {BIBLIOTECA_ABERTURAS.map((b) => (
                <button key={b.nome} onClick={() => adicionarAbertura(b)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent-soft">
                  <span className="w-4 text-center text-muted">{b.arco ? "⌒" : ICONE[b.tipo]}</span>
                  {b.nome}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Adicionar móvel</div>
            <input className="input mb-2" placeholder="Buscar (ex.: pia, cama, tanque)…" value={buscaMovel} onChange={(e) => setBuscaMovel(e.target.value)} />

            <button
              className={`mb-2 w-full ${movelPers.aberto ? "btn" : "btn-ghost"}`}
              onClick={() => setMovelPers({ ...movelPers, aberto: !movelPers.aberto })}
            >
              {movelPers.aberto ? "Fechar" : "✎ Móvel com medida personalizada"}
            </button>
            {movelPers.aberto && (
              <form
                className="mb-3 space-y-2 rounded-xl border border-accent/40 bg-accent-soft/40 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = (v: string) => Math.max(0.1, Number(v.replace(",", ".")) || 0.1);
                  adicionar({ nome: movelPers.nome.trim() || "Móvel", w: n(movelPers.w), h: n(movelPers.h), cor: movelPers.cor });
                  setMovelPers({ ...movelPers, nome: "" });
                }}
              >
                <input className="input" placeholder="Nome (ex.: Aparador sob medida)" value={movelPers.nome} onChange={(e) => setMovelPers({ ...movelPers, nome: e.target.value })} />
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <div>
                    <label className="label">Largura</label>
                    <input className="input" inputMode="decimal" value={movelPers.w} onChange={(e) => setMovelPers({ ...movelPers, w: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Profund.</label>
                    <input className="input" inputMode="decimal" value={movelPers.h} onChange={(e) => setMovelPers({ ...movelPers, h: e.target.value })} />
                  </div>
                  <input type="color" className="h-10 w-10 rounded-lg" value={movelPers.cor} onChange={(e) => setMovelPers({ ...movelPers, cor: e.target.value })} title="Cor" />
                </div>
                <button className="btn w-full" type="submit">Adicionar na planta</button>
              </form>
            )}

            <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
              {BIBLIOTECA.map((grupo) => {
                const termo = buscaMovel.trim().toLowerCase();
                const itens = termo ? grupo.itens.filter((b) => `${b.nome} ${grupo.categoria}`.toLowerCase().includes(termo)) : grupo.itens;
                if (itens.length === 0) return null;
                return (
                  <details key={grupo.categoria} open={Boolean(termo)} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-bg">
                      {grupo.categoria}
                      <span className="text-xs text-muted">{itens.length} <span className="inline-block transition group-open:rotate-90">›</span></span>
                    </summary>
                    {itens.map((b) => (
                      <button key={b.nome} onClick={() => adicionar(b)} className="flex w-full items-center justify-between rounded-lg py-1.5 pl-4 pr-2 text-left text-sm hover:bg-accent-soft">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 shrink-0 rounded-sm border border-line" style={{ background: b.cor }} />
                          {b.nome}
                        </span>
                        <span className="shrink-0 pl-2 text-xs text-muted">{b.w}×{b.h}</span>
                      </button>
                    ))}
                  </details>
                );
              })}
              {buscaMovel.trim() && BIBLIOTECA.every((g) => !g.itens.some((b) => `${b.nome} ${g.categoria}`.toLowerCase().includes(buscaMovel.trim().toLowerCase()))) && (
                <p className="px-2 text-sm text-muted">Nada encontrado. Use o móvel com medida personalizada.</p>
              )}
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              className={`rounded-full border px-3 py-1 text-sm ${mostrarFolgas ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
              onClick={() => setMostrarFolgas(!mostrarFolgas)}
              title="Ao selecionar um móvel, mostra a distância livre até a parede ou outro móvel"
            >
              ↔ Medidas livres {mostrarFolgas ? "ligadas" : "desligadas"}
            </button>
            <button
              className={`rounded-full border px-3 py-1 text-sm ${regua ? "border-[#2563a8] bg-[#e8f0fa] text-[#2563a8]" : "border-line"}`}
              onClick={() => { setRegua(!regua); setSel(null); }}
            >
              📏 Régua {regua ? "(arraste na planta)" : ""}
            </button>
            {mostrarFolgas && (
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-danger" /> menos de 60 cm
                <span className="inline-block h-2 w-2 rounded-full bg-warn" /> 60–80 cm
                <span className="inline-block h-2 w-2 rounded-full bg-ok" /> 80 cm ou mais
              </span>
            )}
          </div>
          <PlantaSvg
            mostrarFolgas={mostrarFolgas}
            regua={regua}
            planta={planta}
            selecionado={sel}
            onSelecionar={setSel}
            onMover={(id, x, y) => setPlanta((p) => ({ ...p, moveis: moverConjunto(p.moveis, id, x, y) }))}
            destacados={conjuntoSel.length > 1 ? conjuntoSel.map((m) => m.id) : undefined}
            onMoverAbertura={(id, parede, posicao) => mudarAbertura(id, { parede, posicao })}
            editarCantos={editandoCantos}
            cantoSelecionado={cantoSel}
            onSelecionarCanto={setCantoSel}
            onMoverCanto={(i, p) => setPlanta((pl) => aplicarCantos(pl, cantos(pl).map((q, k) => (k === i ? p : q)), "personalizado"))}
            onInserirCanto={(depoisDe, p) => {
              setPlanta((pl) => {
                const pts = [...cantos(pl)];
                pts.splice(depoisDe + 1, 0, p);
                return aplicarCantos(pl, pts, "personalizado");
              });
              setCantoSel(depoisDe + 1);
            }}
          />
          {editandoCantos && (
            <p className="mt-2 text-center text-xs text-muted">Modo de edição dos cantos: os móveis ficam travados até você clicar em “Concluir”.</p>
          )}
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
                  <select className="input" value={abertura.parede} onChange={(e) => mudarAbertura(abertura.id, { parede: Number(e.target.value) })}>
                    {listaParedes.map((par) => <option key={par.i} value={par.i}>{letraParede(par.i)} ({par.comprimento.toFixed(2)} m)</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" title="Distância a partir do início da parede (sentido horário)">Do início (m)</label>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(abertura.arco)}
                  onChange={(e) => mudarAbertura(abertura.id, { arco: e.target.checked, ...(e.target.checked && abertura.altura < abertura.largura / 2 ? { altura: +(abertura.largura / 2).toFixed(2) } : {}) })}
                />
                Topo em arco (⌒)
              </label>
              {temGiro(abertura) && (
                <div className="flex flex-wrap gap-2">
                  {abertura.tipo === "porta" && (
                    <button className="btn-ghost" onClick={() => mudarAbertura(abertura.id, { dobradica: abertura.dobradica === "esquerda" ? "direita" : "esquerda" })}>
                      ⇋ Inverter dobradiça
                    </button>
                  )}
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
              {(() => {
                const folgas = folgasMovel(planta, movel);
                if (folgas.length === 0) return null;
                const cor = { apertado: "text-danger", justo: "text-warn", bom: "text-ok" };
                return (
                  <div className="rounded-xl bg-bg p-2 text-xs">
                    <div className="mb-1 font-medium text-muted">Espaço livre ao redor</div>
                    {folgas.map((f) => (
                      <div key={f.direcao} className="flex justify-between gap-2">
                        <span>{DIRECAO_LABEL[f.direcao]} <span className="text-muted">até {f.ate_o_que}</span></span>
                        <b className={cor[nivelFolga(f.distancia)]}>{Math.round(f.distancia * 100)} cm</b>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <input className="input" value={movel.nome} onChange={(e) => mudarMovel(movel.id, { nome: e.target.value })} />
              {(() => {
                const pol = polegadasDaTV(movel.nome);
                if (!pol) return null;
                // distância recomendada para TVs 4K: ~1,2 a 1,6 vezes a diagonal
                const diagonal = pol * 0.0254;
                const deitada = movel.h > movel.w; // girada 90°: a largura da tela está em "h"
                return (
                  <div className="space-y-2 rounded-xl bg-bg p-2">
                    <label className="label">Tamanho da TV (polegadas)</label>
                    <div className="flex gap-1">
                      {[43, 50, 55, 60, 65].map((n) => (
                        <button
                          key={n}
                          className={`flex-1 rounded-lg border px-1 py-1 text-xs ${n === pol ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
                          onClick={() => {
                            const largura = medidaTV(n).largura;
                            mudarMovel(movel.id, { nome: `TV ${n}"`, ...(deitada ? { h: largura } : { w: largura }) });
                          }}
                        >
                          {n}&quot;
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted">
                      Tela de {medidaTV(pol).largura.toFixed(2).replace(".", ",")} × {medidaTV(pol).altura.toFixed(2).replace(".", ",")} m.
                      Distância ideal do sofá: <b className="text-ink">{(diagonal * 1.2).toFixed(1).replace(".", ",")} a {(diagonal * 1.6).toFixed(1).replace(".", ",")} m</b>.
                      Encoste na parede; no 3D ela aparece fixada com o centro a ~1,05 m do piso.
                    </p>
                  </div>
                );
              })()}
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
              {conjuntoSel.length > 1 && (
                <div className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">
                  Parte de um <b>conjunto de {conjuntoSel.length} peças</b>: mover, girar, duplicar e repetir valem para o conjunto todo.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => setPlanta((p) => ({ ...p, moveis: girarConjunto(p.moveis, movel.id) }))}>⟳ Girar 90°</button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const r = duplicarConjunto(planta.moveis, movel.id);
                    setPlanta((p) => ({ ...p, moveis: r.moveis }));
                    setSel(r.selecionar);
                  }}
                >
                  Duplicar
                </button>
                {conjuntoSel.length > 1 && (
                  <button className="btn-ghost" onClick={() => setPlanta((p) => ({ ...p, moveis: desagrupar(p.moveis, movel.id) }))} title="Separa as peças para mexer em cada uma">
                    Desagrupar
                  </button>
                )}
                <button
                  className="btn-ghost text-danger"
                  onClick={() => {
                    setPlanta((p) => ({ ...p, moveis: removerConjunto(p.moveis, movel.id) }));
                    setSel(null);
                  }}
                >
                  Remover
                </button>
              </div>
              <details className="rounded-xl border border-line p-2 text-sm">
                <summary className="cursor-pointer font-medium">▦ Repetir em grade</summary>
                <p className="mt-1 text-xs text-muted">Cria cópias {conjuntoSel.length > 1 ? "do conjunto" : "da peça"} em linhas e colunas — ótimo para salões de restaurante.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Linhas</label>
                    <input className="input" type="number" min="1" max="30" value={grade.linhas} onChange={(e) => setGrade({ ...grade, linhas: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Colunas</label>
                    <input className="input" type="number" min="1" max="30" value={grade.colunas} onChange={(e) => setGrade({ ...grade, colunas: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" title="Espaço livre entre um e outro">Espaço (m)</label>
                    <input className="input" type="number" min="0" step="0.05" value={grade.folga} onChange={(e) => setGrade({ ...grade, folga: e.target.value })} />
                  </div>
                </div>
                <button
                  className="btn mt-2 w-full"
                  onClick={() => {
                    const l = Math.min(30, Math.max(1, Math.round(Number(grade.linhas) || 1)));
                    const c = Math.min(30, Math.max(1, Math.round(Number(grade.colunas) || 1)));
                    setPlanta((p) => ({ ...p, moveis: repetirEmGrade(p.moveis, movel.id, l, c, Math.max(0, Number(grade.folga) || 0)) }));
                  }}
                >
                  Repetir ({Math.max(1, Number(grade.linhas) || 1) * Math.max(1, Number(grade.colunas) || 1)} no total)
                </button>
                <p className="mt-1 text-xs text-muted">Restaurantes: deixe ao menos 0,90 m nas passagens principais (rota acessível).</p>
              </details>
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
