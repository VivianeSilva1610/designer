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
  "Bistrô",
  "Boteco",
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
  // comerciais (restaurante, bar, café)
  "Recepção / hostess",
  "Salão",
  "Bar",
  "Cozinha industrial",
  "Estoque / despensa",
  "Câmara fria",
  "Banheiro feminino",
  "Banheiro masculino",
  "Banheiro PCD",
  "Vestiário de funcionários",
  "Escritório",
  "Área externa / deck",
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
  {
    nome: "Restaurante com bar",
    ambientes: ["Recepção / hostess", "Salão", "Bar", "Cozinha industrial", "Estoque / despensa", "Banheiro feminino", "Banheiro masculino", "Banheiro PCD", "Vestiário de funcionários", "Área externa / deck"],
  },
  { nome: "Café / bistrô", ambientes: ["Salão", "Bar", "Cozinha industrial", "Estoque / despensa", "Banheiro PCD"] },
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
  grupo?: string; // peças de um mesmo conjunto (ex.: mesa + cadeiras) se movem juntas
}

export type TipoAbertura = "porta" | "porta_dupla" | "porta_correr" | "porta_balcao" | "janela" | "vao";

export const TIPO_ABERTURA_LABEL: Record<TipoAbertura, string> = {
  porta: "Porta de abrir",
  porta_dupla: "Porta dupla (2 folhas)",
  porta_correr: "Porta de correr",
  porta_balcao: "Porta-balcão (vidro de correr)",
  janela: "Janela",
  vao: "Vão livre (passagem sem porta)",
};

/** Portas que giram (precisam de área livre para abrir). */
export function temGiro(a: { tipo: TipoAbertura }) {
  return a.tipo === "porta" || a.tipo === "porta_dupla";
}

/** Profundidade varrida pela folha: largura inteira, ou metade na porta dupla. */
export function raioGiro(a: { tipo: TipoAbertura; largura: number }) {
  return a.tipo === "porta_dupla" ? a.largura / 2 : a.largura;
}

export interface Abertura {
  id: string;
  tipo: TipoAbertura;
  parede: number; // índice da parede (0 = Parede A, 1 = B…), na ordem dos cantos do cômodo
  posicao: number; // metros, a partir do canto onde a parede começa
  largura: number;
  altura: number; // metros
  peitoril: number; // altura do piso até a base (0 para portas)
  dobradica: "esquerda" | "direita"; // só para porta de abrir
  abreParaFora: boolean; // só para porta de abrir
}

export interface Ponto {
  x: number;
  y: number;
}

export type FormatoComodo = "retangular" | "L" | "U" | "chanfrado" | "personalizado";

/** Medidas do recorte usadas pelos formatos em L, U e chanfrado. */
export interface Recorte {
  largura: number;
  comprimento: number;
  canto: "sd" | "se" | "id" | "ie"; // superior/inferior + direito/esquerdo
}

export interface Planta {
  largura: number; // metros — largura total (caixa que envolve o cômodo)
  comprimento: number; // metros — comprimento total
  formato?: FormatoComodo; // ausente = retangular
  recorte?: Recorte;
  pontos?: Ponto[]; // cantos do cômodo em sentido horário; ausente = retângulo largura × comprimento
  moveis: Movel[];
  aberturas?: Abertura[]; // opcional: plantas antigas não tinham
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

/** Onde o cômodo fica na planta da casa (em metros) e quanto está girado. */
export interface PosicaoCasa {
  x: number;
  y: number;
  rotacao: 0 | 90 | 180 | 270;
}

export interface Ambiente {
  id: string;
  nome: string; // ex.: "Quarto infantil 2" — pode ser renomeado
  tipo: string; // ex.: "Quarto infantil"
  planta?: Planta;
  posicaoCasa?: PosicaoCasa;
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
  peDireito?: number; // altura do teto em metros (padrão 2,70)
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
