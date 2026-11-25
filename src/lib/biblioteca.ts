/** Móveis e equipamentos com medidas usuais (largura × profundidade, em metros). */
export interface ItemBiblioteca {
  nome: string;
  w: number;
  h: number;
  cor: string;
}

const MADEIRA = "#b8987a";
const MADEIRA_ESCURA = "#8d7560";
const ESTOFADO = "#d9c3a5";
const LOUCA = "#ffffff";
const INOX = "#dfe3e6";
const PEDRA = "#bfc5c9";
const VIDRO = "#dbe9f0";
const CAMA = "#cfd8dc";

export const BIBLIOTECA: { categoria: string; itens: ItemBiblioteca[] }[] = [
  {
    categoria: "Sala",
    itens: [
      { nome: "Sofá 3 lugares", w: 2.1, h: 0.9, cor: ESTOFADO },
      { nome: "Sofá 2 lugares", w: 1.6, h: 0.9, cor: ESTOFADO },
      { nome: "Sofá de canto (L)", w: 2.6, h: 1.6, cor: ESTOFADO },
      { nome: "Poltrona", w: 0.8, h: 0.8, cor: "#c9a98a" },
      { nome: "Mesa de centro", w: 1.0, h: 0.6, cor: MADEIRA },
      { nome: "Mesa lateral", w: 0.45, h: 0.45, cor: MADEIRA },
      { nome: "Rack / painel TV", w: 1.8, h: 0.45, cor: "#9c8169" },
      { nome: "Tapete", w: 2.0, h: 1.4, cor: "#eadfcf" },
      { nome: "Estante", w: 1.0, h: 0.35, cor: MADEIRA_ESCURA },
    ],
  },
  {
    categoria: "Jantar",
    itens: [
      { nome: "Mesa de jantar 6 lug.", w: 1.6, h: 0.9, cor: MADEIRA },
      { nome: "Mesa de jantar 8 lug.", w: 2.2, h: 1.0, cor: MADEIRA },
      { nome: "Mesa redonda 4 lug.", w: 1.1, h: 1.1, cor: MADEIRA },
      { nome: "Cadeira", w: 0.45, h: 0.5, cor: "#c9a98a" },
      { nome: "Buffet / aparador", w: 1.6, h: 0.45, cor: "#9c8169" },
      { nome: "Cristaleira", w: 1.0, h: 0.45, cor: MADEIRA_ESCURA },
    ],
  },
  {
    categoria: "Cozinha",
    itens: [
      { nome: "Pia de cozinha (cuba simples)", w: 1.2, h: 0.6, cor: PEDRA },
      { nome: "Pia de cozinha (cuba dupla)", w: 1.8, h: 0.6, cor: PEDRA },
      { nome: "Bancada cozinha", w: 2.4, h: 0.6, cor: PEDRA },
      { nome: "Bancada de canto (L)", w: 1.2, h: 1.2, cor: PEDRA },
      { nome: "Ilha / península", w: 1.8, h: 0.9, cor: PEDRA },
      { nome: "Cooktop", w: 0.6, h: 0.5, cor: "#3a3633" },
      { nome: "Fogão 4 bocas", w: 0.6, h: 0.6, cor: INOX },
      { nome: "Fogão 5/6 bocas", w: 0.76, h: 0.65, cor: INOX },
      { nome: "Torre quente (forno)", w: 0.6, h: 0.6, cor: MADEIRA },
      { nome: "Geladeira", w: 0.7, h: 0.7, cor: INOX },
      { nome: "Geladeira duplex / inverse", w: 0.9, h: 0.75, cor: INOX },
      { nome: "Lava-louças", w: 0.6, h: 0.6, cor: INOX },
      { nome: "Banqueta", w: 0.4, h: 0.4, cor: "#c9a98a" },
    ],
  },
  {
    categoria: "Banheiro",
    itens: [
      { nome: "Pia de banheiro (lavatório)", w: 0.5, h: 0.4, cor: LOUCA },
      { nome: "Bancada com cuba", w: 0.8, h: 0.5, cor: PEDRA },
      { nome: "Bancada com 2 cubas", w: 1.4, h: 0.5, cor: PEDRA },
      { nome: "Vaso sanitário", w: 0.4, h: 0.65, cor: LOUCA },
      { nome: "Bidê", w: 0.38, h: 0.55, cor: LOUCA },
      { nome: "Box chuveiro", w: 0.9, h: 0.9, cor: VIDRO },
      { nome: "Box chuveiro retangular", w: 1.2, h: 0.8, cor: VIDRO },
      { nome: "Banheira", w: 1.7, h: 0.75, cor: LOUCA },
      { nome: "Gabinete / armário", w: 0.6, h: 0.45, cor: MADEIRA },
    ],
  },
  {
    categoria: "Lavanderia",
    itens: [
      { nome: "Tanque", w: 0.6, h: 0.5, cor: LOUCA },
      { nome: "Máquina de lavar", w: 0.6, h: 0.65, cor: INOX },
      { nome: "Secadora", w: 0.6, h: 0.65, cor: INOX },
      { nome: "Armário lavanderia", w: 0.8, h: 0.5, cor: MADEIRA },
    ],
  },
  {
    categoria: "Quarto",
    itens: [
      { nome: "Cama casal", w: 1.4, h: 1.9, cor: CAMA },
      { nome: "Cama queen", w: 1.6, h: 2.0, cor: CAMA },
      { nome: "Cama king", w: 1.93, h: 2.03, cor: CAMA },
      { nome: "Cama solteiro", w: 0.88, h: 1.88, cor: CAMA },
      { nome: "Berço", w: 0.7, h: 1.3, cor: CAMA },
      { nome: "Criado-mudo", w: 0.5, h: 0.4, cor: "#9c8169" },
      { nome: "Guarda-roupa", w: 2.0, h: 0.6, cor: MADEIRA_ESCURA },
      { nome: "Cômoda", w: 1.2, h: 0.5, cor: MADEIRA_ESCURA },
      { nome: "Penteadeira", w: 1.0, h: 0.45, cor: MADEIRA },
    ],
  },
  {
    categoria: "Escritório",
    itens: [
      { nome: "Escrivaninha", w: 1.2, h: 0.6, cor: MADEIRA },
      { nome: "Mesa em L", w: 1.6, h: 1.4, cor: MADEIRA },
      { nome: "Cadeira escritório", w: 0.6, h: 0.6, cor: "#a5b4a0" },
      { nome: "Arquivo / gaveteiro", w: 0.45, h: 0.55, cor: MADEIRA_ESCURA },
    ],
  },
  {
    categoria: "Área externa e decoração",
    itens: [
      { nome: "Churrasqueira", w: 1.0, h: 0.6, cor: "#9a8f86" },
      { nome: "Espreguiçadeira", w: 0.7, h: 1.9, cor: ESTOFADO },
      { nome: "Rede", w: 0.8, h: 3.0, cor: "#eadfcf" },
      { nome: "Planta / vaso", w: 0.45, h: 0.45, cor: "#a5c49a" },
      { nome: "Piano", w: 1.5, h: 0.6, cor: "#3a3633" },
    ],
  },
];
