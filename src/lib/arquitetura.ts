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
