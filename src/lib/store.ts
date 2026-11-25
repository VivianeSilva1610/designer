"use client";

import { useCallback, useSyncExternalStore } from "react";
import { migrarPlanta } from "./geometria";
import { novoId, type Planta, type Projeto } from "./types";

// Armazenamento local (no navegador). Numa próxima fase, trocamos por um banco
// de dados na nuvem (ex.: Supabase) para ter login e acesso de clientes.
const CHAVE = "studio-interiores:projetos";
const ouvintes = new Set<() => void>();
let cache: Projeto[] | null = null;
const VAZIO: Projeto[] = [];

/** Projetos da primeira versão tinham um único "ambiente" e uma "planta". */
type ProjetoAntigo = Projeto & { ambiente?: string; planta?: Planta };

function migrar(antigo: ProjetoAntigo): Projeto {
  const p = migrarAmbientes(antigo);
  return {
    ...p,
    ambientes: p.ambientes.map((a) => (a.planta ? { ...a, planta: migrarPlanta(a.planta) } : a)),
  };
}

function migrarAmbientes(p: ProjetoAntigo): Projeto {
  if (Array.isArray(p.ambientes)) return p;
  const { ambiente, planta, ...resto } = p;
  const amb = ambiente ? [{ id: novoId(), nome: ambiente, tipo: ambiente, planta }] : [];
  return {
    ...resto,
    ambientes: amb,
    itens: (p.itens ?? []).map((i) => ({ ...i, ambienteId: i.ambienteId ?? amb[0]?.id })),
  };
}

function ler(): Projeto[] {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    cache = bruto ? (JSON.parse(bruto) as ProjetoAntigo[]).map(migrar) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(lista: Projeto[]) {
  cache = lista;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    alert(
      "Não foi possível salvar: o armazenamento do navegador está cheio. Remova algumas imagens dos moodboards."
    );
  }
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useProjetos() {
  const projetos = useSyncExternalStore(assinar, ler, () => VAZIO);

  const salvar = useCallback((p: Projeto) => {
    const lista = ler();
    const existe = lista.some((x) => x.id === p.id);
    gravar(existe ? lista.map((x) => (x.id === p.id ? p : x)) : [p, ...lista]);
  }, []);

  const atualizar = useCallback((id: string, mudar: (p: Projeto) => Projeto) => {
    gravar(ler().map((x) => (x.id === id ? mudar(x) : x)));
  }, []);

  const remover = useCallback((id: string) => {
    gravar(ler().filter((x) => x.id !== id));
  }, []);

  return { projetos, salvar, atualizar, remover };
}

/** Reduz uma imagem para caber no armazenamento e no envio à IA. */
export function reduzirImagem(arquivo: File, max = 1280, qualidade = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = reject;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}
