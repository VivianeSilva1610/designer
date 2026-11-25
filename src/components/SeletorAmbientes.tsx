"use client";

import { useState } from "react";
import { AMBIENTES, PACOTES_AMBIENTES, novoAmbiente, type Ambiente } from "@/lib/types";

interface Props {
  ambientes: Ambiente[];
  onChange: (lista: Ambiente[]) => void;
  /** chamado antes de remover; devolva false para cancelar */
  confirmarRemocao?: (a: Ambiente) => boolean;
}

export default function SeletorAmbientes({ ambientes, onChange, confirmarRemocao }: Props) {
  const [tipo, setTipo] = useState(AMBIENTES[0]);
  const [personalizado, setPersonalizado] = useState("");

  function adicionar(tipos: string[]) {
    const lista = [...ambientes];
    for (const t of tipos) lista.push(novoAmbiente(t, lista));
    onChange(lista);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ambientes.length === 0 && <span className="text-sm text-muted">Nenhum ambiente escolhido ainda.</span>}
        {ambientes.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm text-accent">
            <input
              className="w-auto min-w-0 bg-transparent outline-none"
              size={Math.max(4, a.nome.length)}
              value={a.nome}
              title="Clique para renomear"
              onChange={(e) => onChange(ambientes.map((x) => (x.id === a.id ? { ...x, nome: e.target.value } : x)))}
            />
            <button
              type="button"
              className="rounded-full px-1.5 hover:bg-white"
              title="Remover ambiente"
              onClick={() => {
                if (confirmarRemocao && !confirmarRemocao(a)) return;
                onChange(ambientes.filter((x) => x.id !== a.id));
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {AMBIENTES.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button type="button" className="btn-ghost" onClick={() => adicionar([tipo])}>+ Adicionar</button>
        <input
          className="input w-48"
          placeholder="Outro (ex.: Brinquedoteca)"
          value={personalizado}
          onChange={(e) => setPersonalizado(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (personalizado.trim()) adicionar([personalizado.trim()]);
              setPersonalizado("");
            }
          }}
        />
        <button
          type="button"
          className="btn-ghost"
          disabled={!personalizado.trim()}
          onClick={() => {
            adicionar([personalizado.trim()]);
            setPersonalizado("");
          }}
        >
          + Outro
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Atalhos:</span>
        {PACOTES_AMBIENTES.map((p) => (
          <button key={p.nome} type="button" className="rounded-full border border-line px-3 py-1 hover:border-accent" title={p.ambientes.join(", ")} onClick={() => adicionar(p.ambientes)}>
            {p.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
