/** Móveis e equipamentos com medidas usuais (largura × profundidade, em metros). */
export interface ItemBiblioteca {
  nome: string;
  w: number;
  h: number;
  cor: string;
  /** conjunto: peças posicionadas dentro de w × h (ex.: mesa + cadeiras) */
  partes?: { nome: string; w: number; h: number; cor: string; dx: number; dy: number }[];
}

/** Quantos lugares sentados uma peça oferece (para restaurantes e salas). */
export function lugaresDoMovel(nome: string): number {
  const n = nome.toLowerCase();
  if (/cadeira escritório|cadeira de escritório/.test(n)) return 0;
  if (/banco booth|namoradeira/.test(n)) return 2;
  if (/sofá 3|sofá de canto/.test(n)) return 3;
  if (/sofá/.test(n)) return 2;
  if (/cadeira|banqueta|poltrona/.test(n)) return 1;
  return 0;
}

const CADEIRA = "#c9a98a";
const MESA_REST = "#a98463";
const ESTOFADO_BOOTH = "#8a4f3d";
const INOX_IND = "#cfd4d8";
const cad = (dx: number, dy: number) => ({ nome: "Cadeira", w: 0.45, h: 0.45, cor: CADEIRA, dx, dy });
const banq = (dx: number, dy: number) => ({ nome: "Banqueta alta", w: 0.4, h: 0.4, cor: CADEIRA, dx, dy });

/**
 * Medidas de uma TV 16:9 a partir da diagonal em polegadas (com ~1,5 cm de borda).
 * largura = d × 16/√337 × 2,54 cm; altura = d × 9/√337 × 2,54 cm.
 */
export function medidaTV(polegadas: number) {
  const d = polegadas * 0.0254;
  const largura = (d * 16) / Math.sqrt(337) + 0.03;
  const altura = (d * 9) / Math.sqrt(337) + 0.03;
  return { largura: +largura.toFixed(2), altura: +altura.toFixed(2) };
}

/** Polegadas escritas no nome da TV (ex.: `TV 55"`), ou null se não for uma TV. */
export function polegadasDaTV(nome: string): number | null {
  if (!/\btv\b/i.test(nome) || /rack|painel/i.test(nome)) return null;
  const m = /(\d{2,3})\s*(?:"|”|pol)/i.exec(nome);
  return m ? Number(m[1]) : 50;
}

export const COR_TV = "#1f1f22";
const tv = (pol: number): ItemBiblioteca => ({ nome: `TV ${pol}"`, w: medidaTV(pol).largura, h: 0.08, cor: COR_TV });

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
      tv(43),
      tv(50),
      tv(55),
      tv(60),
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
      { nome: "Mictório", w: 0.4, h: 0.35, cor: LOUCA },
      { nome: "Área de giro PCD (Ø 1,50 m)", w: 1.5, h: 1.5, cor: "#d6e4f0" },
      { nome: "Box chuveiro", w: 0.9, h: 0.9, cor: VIDRO },
      { nome: "Box chuveiro retangular", w: 1.2, h: 0.8, cor: VIDRO },
      { nome: "Banheira", w: 1.7, h: 0.75, cor: LOUCA },
      { nome: "Gabinete / armário", w: 0.6, h: 0.45, cor: MADEIRA },
    ],
  },
  {
    categoria: "Restaurante e bar",
    itens: [
      // conjuntos: entram já montados e se movem juntos
      {
        nome: "Conjunto mesa 2 lugares", w: 0.7, h: 1.6, cor: MESA_REST,
        partes: [{ nome: "Mesa 2 lug. (70×70)", w: 0.7, h: 0.7, cor: MESA_REST, dx: 0, dy: 0.45 }, cad(0.125, 0), cad(0.125, 1.15)],
      },
      {
        nome: "Conjunto mesa 4 lugares", w: 1.7, h: 1.7, cor: MESA_REST,
        partes: [{ nome: "Mesa 4 lug. (80×80)", w: 0.8, h: 0.8, cor: MESA_REST, dx: 0.45, dy: 0.45 }, cad(0.625, 0), cad(0.625, 1.25), cad(0, 0.625), cad(1.25, 0.625)],
      },
      {
        nome: "Conjunto mesa 6 lugares", w: 1.6, h: 1.7, cor: MESA_REST,
        partes: [{ nome: "Mesa 6 lug. (160×80)", w: 1.6, h: 0.8, cor: MESA_REST, dx: 0, dy: 0.45 }, cad(0.15, 0), cad(0.575, 0), cad(1.0, 0), cad(0.15, 1.25), cad(0.575, 1.25), cad(1.0, 1.25)],
      },
      {
        nome: "Booth (cabine) 4 lugares", w: 1.2, h: 1.9, cor: ESTOFADO_BOOTH,
        partes: [
          { nome: "Banco booth", w: 1.2, h: 0.6, cor: ESTOFADO_BOOTH, dx: 0, dy: 0 },
          { nome: "Mesa booth", w: 1.0, h: 0.7, cor: MESA_REST, dx: 0.1, dy: 0.6 },
          { nome: "Banco booth", w: 1.2, h: 0.6, cor: ESTOFADO_BOOTH, dx: 0, dy: 1.3 },
        ],
      },
      {
        nome: "Bistrô alto 2 lugares", w: 1.4, h: 0.6, cor: MESA_REST,
        partes: [{ nome: "Mesa alta bistrô", w: 0.6, h: 0.6, cor: MESA_REST, dx: 0.4, dy: 0 }, banq(0, 0.1), banq(1.0, 0.1)],
      },
      {
        nome: "Balcão de bar + 5 banquetas", w: 3.0, h: 1.15, cor: "#5b4636",
        partes: [{ nome: "Balcão de bar", w: 3.0, h: 0.6, cor: "#5b4636", dx: 0, dy: 0 }, ...[0, 1, 2, 3, 4].map((k) => banq(0.1 + k * 0.6, 0.75))],
      },
      // peças avulsas
      { nome: "Balcão de bar", w: 3.0, h: 0.6, cor: "#5b4636" },
      { nome: "Balcão de bar em L", w: 2.4, h: 1.6, cor: "#5b4636" },
      { nome: "Bancada de apoio (back bar)", w: 3.0, h: 0.5, cor: MADEIRA_ESCURA },
      { nome: "Adega / expositor de bebidas", w: 0.9, h: 0.6, cor: "#3a3633" },
      { nome: "Cervejeira / chopeira", w: 0.7, h: 0.7, cor: INOX_IND },
      { nome: "Mesa 2 lug. (70×70)", w: 0.7, h: 0.7, cor: MESA_REST },
      { nome: "Mesa 4 lug. (80×80)", w: 0.8, h: 0.8, cor: MESA_REST },
      { nome: "Mesa 6 lug. (160×80)", w: 1.6, h: 0.8, cor: MESA_REST },
      { nome: "Mesa alta bistrô", w: 0.6, h: 0.6, cor: MESA_REST },
      { nome: "Cadeira", w: 0.45, h: 0.45, cor: CADEIRA },
      { nome: "Banqueta alta", w: 0.4, h: 0.4, cor: CADEIRA },
      { nome: "Banco booth", w: 1.2, h: 0.6, cor: ESTOFADO_BOOTH },
      { nome: "Caixa / checkout", w: 1.2, h: 0.6, cor: MADEIRA_ESCURA },
      { nome: "Púlpito de recepção (hostess)", w: 0.6, h: 0.5, cor: MADEIRA_ESCURA },
      { nome: "Estação de garçom", w: 1.0, h: 0.5, cor: MADEIRA },
      { nome: "Floreira / divisória", w: 1.2, h: 0.3, cor: "#a5c49a" },
    ],
  },
  {
    categoria: "Cozinha industrial",
    itens: [
      { nome: "Fogão industrial 6 bocas", w: 1.4, h: 0.9, cor: "#3a3633" },
      { nome: "Chapa / char-broiler", w: 0.8, h: 0.7, cor: "#3a3633" },
      { nome: "Fritadeira", w: 0.45, h: 0.7, cor: INOX_IND },
      { nome: "Forno combinado", w: 0.9, h: 0.8, cor: INOX_IND },
      { nome: "Coifa (sobre o fogão)", w: 2.0, h: 1.0, cor: "#e4e7ea" },
      { nome: "Bancada inox", w: 1.5, h: 0.7, cor: INOX_IND },
      { nome: "Pia industrial (2 cubas)", w: 1.5, h: 0.7, cor: INOX_IND },
      { nome: "Mesa de preparo central", w: 1.8, h: 0.8, cor: INOX_IND },
      { nome: "Geladeira industrial 4 portas", w: 1.2, h: 0.75, cor: INOX_IND },
      { nome: "Freezer horizontal", w: 1.4, h: 0.7, cor: INOX },
      { nome: "Lava-louças industrial", w: 0.65, h: 0.75, cor: INOX_IND },
      { nome: "Estante inox", w: 1.2, h: 0.5, cor: INOX_IND },
      { nome: "Câmara fria", w: 2.0, h: 2.0, cor: "#dfe7ec" },
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
      tv(43),
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
