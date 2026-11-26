/**
 * Elementos de arquitetura clássica: arcos, arcadas (pórticos), colunas e pátios.
 */

/** Raio do arco no topo da abertura: meia largura (arco romano), sem passar da altura. */
export function raioArco(a: { largura: number; altura: number }) {
  return Math.min(a.largura / 2, a.altura);
}

/**
 * Posições (a partir do início da parede) de uma sequência de arcos iguais,
 * separados por pilares, centrada na parede. Ex.: parede de 10 m, arcos de
 * 1,60 m e pilares de 40 cm → 4 arcos, com pilar nas duas pontas.
 */
export function gerarArcada(comprimento: number, larguraArco: number, pilar: number): number[] {
  if (larguraArco <= 0 || pilar < 0) return [];
  const n = Math.floor((comprimento - pilar + 1e-9) / (larguraArco + pilar));
  if (n < 1) return [];
  const total = n * larguraArco + (n + 1) * pilar;
  const inicio = (comprimento - total) / 2 + pilar;
  return Array.from({ length: n }, (_, i) => +(inicio + i * (larguraArco + pilar)).toFixed(3));
}

/** Pátio, jardim, quintal: sem teto no 3D. */
export const ehCeuAberto = (texto: string) => /pátio|patio|jardim|quintal|claustro/i.test(texto);

/** Peças desenhadas redondas na planta. */
export const ehRedondo = (nome: string) => /coluna redonda|árvore|arbusto|fonte/i.test(nome);

/** Paleta de tintas para as paredes (cores comuns em projetos residenciais e clássicos). */
export const CORES_PAREDE: { nome: string; hex: string }[] = [
  { nome: "Branco gelo", hex: "#f4f0ea" },
  { nome: "Off-white", hex: "#ece4d6" },
  { nome: "Creme", hex: "#e9dcc0" },
  { nome: "Areia", hex: "#d9c7a7" },
  { nome: "Pedra", hex: "#c7bfae" },
  { nome: "Amarelo ocre", hex: "#d6a84b" },
  { nome: "Terracota", hex: "#c0714f" },
  { nome: "Tijolo", hex: "#a4553a" },
  { nome: "Rosa antigo", hex: "#d4a59a" },
  { nome: "Verde sálvia", hex: "#a9b59a" },
  { nome: "Verde oliva", hex: "#7d8460" },
  { nome: "Azul acinzentado", hex: "#8fa3b0" },
  { nome: "Azul petróleo", hex: "#3f6670" },
  { nome: "Cinza claro", hex: "#cfcfcb" },
  { nome: "Grafite", hex: "#4a4a48" },
];

export const COR_PAREDE_PADRAO = "#f4f0ea";

export function nomeDaCor(hex?: string) {
  if (!hex) return "Padrão (branco gelo)";
  return CORES_PAREDE.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.nome ?? hex;
}
