"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SeletorAmbientes from "@/components/SeletorAmbientes";
import { useProjetos } from "@/lib/store";
import { ESTILOS, STATUS_LABEL, brl, novoId, resumoAmbientes, totalItens, type Ambiente, type Projeto } from "@/lib/types";

export default function Projetos() {
  const { projetos, salvar } = useProjetos();
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    nome: "",
    cliente: "",
    contato: "",
    estilo: ESTILOS[0],
    orcamento: "",
    prazo: "",
  });
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);

  function criar(e: React.FormEvent) {
    e.preventDefault();
    const p: Projeto = {
      id: novoId(),
      nome: form.nome || `Projeto ${form.cliente || "novo"}`,
      cliente: form.cliente,
      contato: form.contato,
      ambientes,
      estilo: form.estilo,
      orcamento: Number(form.orcamento) || 0,
      prazo: form.prazo,
      status: "briefing",
      notas: "",
      itens: [],
      criadoEm: new Date().toISOString(),
    };
    salvar(p);
    router.push(`/projetos/${p.id}`);
  }

  const filtrados = projetos.filter((p) =>
    `${p.nome} ${p.cliente} ${p.ambientes.map((a) => a.nome).join(" ")}`.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Projetos</h1>
        <button className="btn" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? "Cancelar" : "+ Novo projeto"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={criar} className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nome do projeto</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Apartamento Jardins" />
          </div>
          <div>
            <label className="label">Cliente</label>
            <input className="input" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          </div>
          <div>
            <label className="label">Contato (telefone / e-mail)</label>
            <input className="input" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ambientes do projeto</label>
            <p className="mb-2 text-xs text-muted">Escolha um ou vários cômodos, ou use um atalho como “Casa inteira”. Dá para mudar depois.</p>
            <SeletorAmbientes ambientes={ambientes} onChange={setAmbientes} />
          </div>
          <div>
            <label className="label">Estilo</label>
            <select className="input" value={form.estilo} onChange={(e) => setForm({ ...form, estilo: e.target.value })}>
              {ESTILOS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Orçamento (R$)</label>
            <input className="input" type="number" min="0" value={form.orcamento} onChange={(e) => setForm({ ...form, orcamento: e.target.value })} />
          </div>
          <div>
            <label className="label">Prazo</label>
            <input className="input" type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button className="btn w-full" type="submit">Criar projeto</button>
          </div>
        </form>
      )}

      <input className="input max-w-sm" placeholder="Buscar por nome, cliente ou ambiente…" value={busca} onChange={(e) => setBusca(e.target.value)} />

      {filtrados.length === 0 ? (
        <div className="card text-sm text-muted">Nenhum projeto encontrado.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => {
            const gasto = totalItens(p);
            const pct = p.orcamento ? Math.min(100, (gasto / p.orcamento) * 100) : 0;
            return (
              <Link key={p.id} href={`/projetos/${p.id}`} className="card space-y-3 transition hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-sm text-muted">{p.cliente || "Sem cliente"}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-1 text-xs text-accent">{STATUS_LABEL[p.status]}</span>
                </div>
                <div className="text-sm text-muted">{resumoAmbientes(p)} · {p.estilo}</div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>{brl(gasto)}</span>
                    <span>de {brl(p.orcamento)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg">
                    <div className={`h-2 rounded-full ${gasto > p.orcamento && p.orcamento ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
