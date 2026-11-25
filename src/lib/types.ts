export type StatusProjeto = "briefing" | "em_andamento" | "aprovacao" | "concluido";

export const STATUS_LABEL: Record<StatusProjeto, string> = {
  briefing: "Briefing",
  em_andamento: "Em andamento",
  aprovacao: "Aguardando aprovação",
  concluido: "Concluído",
};

export const ESTILOS = [
  "Moderno",
  "Contemporâneo",
  "Escandinavo",
  "Industrial",
  "Minimalista",
  "Boho",
  "Clássico",
  "Rústico",
  "Japandi",
  "Tropical",
  "Mid-century",
];

export const AMBIENTES = [
  "Sala de estar",
  "Sala de jantar",
  "Sala de estar e jantar",
  "Cozinha",
  "Quarto de casal",
  "Quarto de solteiro",
  "Quarto infantil",
  "Quarto de hóspedes",
  "Closet",
  "Banheiro",
  "Lavabo",
  "Home office",
  "Hall de entrada",
  "Varanda",
  "Área gourmet",
  "Lavanderia",
  "Área comercial",
];

/** Conjuntos prontos para projetos completos. */
export const PACOTES_AMBIENTES: { nome: string; ambientes: string[] }[] = [
  {
    nome: "Casa inteira",
    ambientes: ["Hall de entrada", "Sala de estar", "Sala de jantar", "Cozinha", "Quarto de casal", "Quarto de solteiro", "Banheiro", "Lavabo", "Lavanderia", "Varanda"],
  },
  {
    nome: "Apartamento",
    ambientes: ["Sala de estar e jantar", "Cozinha", "Quarto de casal", "Quarto de solteiro", "Banheiro", "Lavanderia", "Varanda"],
  },
  { nome: "Área social", ambientes: ["Sala de estar", "Sala de jantar", "Lavabo", "Varanda"] },
];

export interface Item {
  id: string;
  nome: string;
  categoria: string;
  fornecedor: string;
  quantidade: number;
  preco: number;
  link: string;
  comprado: boolean;
  ambienteId?: string; // vazio = item geral do projeto
}

export interface Movel {
  id: string;
  nome: string;
  x: number; // metros
  y: number;
  w: number;
  h: number;
  cor: string;
}

export type TipoAbertura = "porta" | "porta_correr" | "janela" | "porta_balcao";
export type Parede = "norte" | "leste" | "sul" | "oeste";

export const TIPO_ABERTURA_LABEL: Record<TipoAbertura, string> = {
  porta: "Porta de abrir",
  porta_correr: "Porta de correr",
  janela: "Janela",
  porta_balcao: "Porta-balcão (vidro de correr)",
};

export const PAREDE_LABEL: Record<Parede, string> = {
  norte: "Superior",
  leste: "Direita",
  sul: "Inferior",
  oeste: "Esquerda",
};

export interface Abertura {
  id: string;
  tipo: TipoAbertura;
  parede: Parede;
  posicao: number; // metros, do canto esquerdo (paredes horizontais) ou superior (verticais)
  largura: number;
  altura: number; // metros
  peitoril: number; // altura do piso até a base (0 para portas)
  dobradica: "esquerda" | "direita"; // só para porta de abrir
  abreParaFora: boolean; // só para porta de abrir
}

export interface Planta {
  largura: number; // metros
  comprimento: number;
  moveis: Movel[];
  aberturas?: Abertura[]; // opcional: plantas antigas não tinham
}

export function comprimentoParede(planta: Planta, parede: Parede) {
  return parede === "norte" || parede === "sul" ? planta.largura : planta.comprimento;
}

/** Retângulo (no piso) varrido pela folha de uma porta de abrir para dentro. */
export function areaGiroPorta(planta: Planta, a: Abertura) {
  const { largura: L, comprimento: C } = planta;
  const w = a.largura;
  switch (a.parede) {
    case "norte": return { x: a.posicao, y: 0, w, h: w };
    case "sul": return { x: a.posicao, y: C - w, w, h: w };
    case "oeste": return { x: 0, y: a.posicao, w, h: w };
    case "leste": return { x: L - w, y: a.posicao, w, h: w };
  }
}

/** Lista conflitos: portas que batem em móveis e aberturas sobrepostas. */
export function conflitosPlanta(planta: Planta): string[] {
  const avisos: string[] = [];
  const sobrepoe = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
  const aberturas = planta.aberturas ?? [];
  for (const a of aberturas) {
    if (a.tipo !== "porta" || a.abreParaFora) continue;
    const giro = areaGiroPorta(planta, a);
    for (const m of planta.moveis) {
      if (/tapete/i.test(m.nome)) continue;
      if (sobrepoe(giro, m)) avisos.push(`A porta (${PAREDE_LABEL[a.parede].toLowerCase()}) bate em “${m.nome}”.`);
    }
  }
  for (let i = 0; i < aberturas.length; i++) {
    for (let j = i + 1; j < aberturas.length; j++) {
      const a = aberturas[i], b = aberturas[j];
      if (a.parede === b.parede && a.posicao < b.posicao + b.largura && b.posicao < a.posicao + a.largura) {
        avisos.push(`${TIPO_ABERTURA_LABEL[a.tipo]} e ${TIPO_ABERTURA_LABEL[b.tipo].toLowerCase()} estão sobrepostas na parede ${PAREDE_LABEL[a.parede].toLowerCase()}.`);
      }
    }
  }
  return avisos;
}

export function descreverAbertura(a: Abertura) {
  const base = `${TIPO_ABERTURA_LABEL[a.tipo]} ${a.largura.toFixed(2)} m na parede ${PAREDE_LABEL[a.parede].toLowerCase()} (a ${a.posicao.toFixed(2)} m do canto, altura ${a.altura.toFixed(2)} m`;
  const extra = a.tipo === "janela" ? `, peitoril ${a.peitoril.toFixed(2)} m` : a.tipo === "porta" ? `, abre para ${a.abreParaFora ? "fora" : "dentro"}` : "";
  return `${base}${extra})`;
}

export interface Cor {
  hex: string;
  nome: string;
}

export interface Moodboard {
  cores: Cor[];
  imagens: string[]; // data URLs reduzidas
  notas: string;
}

export interface Ambiente {
  id: string;
  nome: string; // ex.: "Quarto infantil 2" — pode ser renomeado
  tipo: string; // ex.: "Quarto infantil"
  planta?: Planta;
}

export interface Projeto {
  id: string;
  nome: string;
  cliente: string;
  contato: string;
  ambientes: Ambiente[];
  estilo: string;
  orcamento: number;
  status: StatusProjeto;
  prazo: string;
  notas: string;
  itens: Item[];
  moodboard?: Moodboard;
  criadoEm: string;
}

export function novoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Cria um ambiente; se já existir outro do mesmo tipo, numera ("Banheiro 2"). */
export function novoAmbiente(tipo: string, existentes: Ambiente[]): Ambiente {
  const mesmos = existentes.filter((a) => a.tipo === tipo).length;
  return { id: novoId(), tipo, nome: mesmos ? `${tipo} ${mesmos + 1}` : tipo };
}

export function resumoAmbientes(p: Projeto) {
  if (p.ambientes.length === 0) return "Sem ambientes";
  if (p.ambientes.length <= 2) return p.ambientes.map((a) => a.nome).join(" e ");
  return `${p.ambientes.length} ambientes`;
}

export function totalAmbiente(p: Projeto, ambienteId: string | undefined) {
  return p.itens
    .filter((i) => (i.ambienteId || undefined) === ambienteId)
    .reduce((s, i) => s + i.preco * i.quantidade, 0);
}

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalItens(p: Projeto) {
  return p.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
}
