"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "./actions";

type Entry = { a: string; b: string }; // a = channel/category, b = sub-channel/sub-category
type Section = { key: string; label: string; values: string[] };
type Init = Record<string, Record<string, Entry>>; // sectionKey -> value -> entry

export default function GroupingEditor({
  title,
  note,
  sections,
  initial,
  aLabel,
  bLabel,
  suggestions,
  action,
}: {
  title: string;
  note: string;
  sections: Section[];
  initial: Init;
  aLabel: string;
  bLabel: string;
  suggestions: string[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, setState] = useState<Init>(initial);
  const [res, formAction, pending] = useActionState(action, undefined);
  const aListId = `sug-a-${title.replace(/\s+/g, "")}`;
  const bListId = `sug-b-${title.replace(/\s+/g, "")}`;

  const set = (sk: string, v: string, field: "a" | "b", val: string) =>
    setState((s) => ({ ...s, [sk]: { ...s[sk], [v]: { ...(s[sk]?.[v] ?? { a: "", b: "" }), [field]: val } } }));

  // Suggestions = the built-in presets + every custom name already entered anywhere
  // in this editor, so a value you invent on one row becomes reusable on every row.
  const collect = (field: "a" | "b") => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (x: string) => { const t = x.trim(); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); } };
    if (field === "a") suggestions.forEach(add);
    Object.values(state).forEach((rows) => Object.values(rows).forEach((e) => add(e[field])));
    return out;
  };
  const aSuggest = collect("a");
  const bSuggest = collect("b");

  return (
    <form action={formAction} style={card}>
      <h3 style={h3}>{title}</h3>
      <p style={{ fontSize: 12, color: "var(--mu)", margin: "0 0 6px" }}>{note}</p>
      <p style={{ fontSize: 11.5, color: "var(--mu)", margin: "0 0 14px", fontStyle: "italic" }}>
        Pick a suggestion <b>or type your own</b> — any new name you create here becomes a reusable option on every row below.
      </p>
      <input type="hidden" name="data" value={JSON.stringify(state)} />
      <datalist id={aListId}>{aSuggest.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id={bListId}>{bSuggest.map((s) => <option key={s} value={s} />)}</datalist>

      {sections.map((sec) => (
        <div key={sec.key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--mu)", margin: "0 0 8px" }}>{sec.label}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--mu)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
                  <th style={th}>Toast value</th><th style={th}>{aLabel}</th><th style={th}>{bLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sec.values.map((v) => {
                  const e = state[sec.key]?.[v] ?? { a: "", b: "" };
                  return (
                    <tr key={v} style={{ borderTop: "1px solid var(--ln)" }}>
                      <td style={{ ...td, maxWidth: 280, wordBreak: "break-word" }}>{v}</td>
                      <td style={td}><input list={aListId} value={e.a} onChange={(ev) => set(sec.key, v, "a", ev.target.value)} placeholder="type or pick…" style={inp} /></td>
                      <td style={td}><input list={bListId} value={e.b} onChange={(ev) => set(sec.key, v, "b", ev.target.value)} placeholder="type or pick… (optional)" style={inp} /></td>
                    </tr>
                  );
                })}
                {sec.values.length === 0 && <tr><td colSpan={3} style={{ ...td, color: "var(--mu)" }}>No values.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {res?.error && <p style={{ color: "#ef4444", fontSize: 12.5, margin: "0 0 10px" }}>{res.error}</p>}
      {res?.ok && <p style={{ color: "#10b981", fontSize: 12.5, margin: "0 0 10px" }}>{res.ok}</p>}
      <button type="submit" disabled={pending} style={{ ...saveBtn, opacity: pending ? 0.7 : 1 }}>{pending ? "Saving…" : "Save " + title.toLowerCase()}</button>
    </form>
  );
}

const card: React.CSSProperties = { background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 12, padding: 20 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 6px" };
const th: React.CSSProperties = { padding: "0 10px 8px" };
const td: React.CSSProperties = { padding: "7px 10px" };
const inp: React.CSSProperties = { width: "100%", minWidth: 120, boxSizing: "border-box", padding: "6px 9px", fontSize: 12.5, color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: 6, outline: "none", fontFamily: "var(--font-inter)" };
const saveBtn: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--ac)", border: "none", borderRadius: 7, padding: "8px 16px", cursor: "pointer" };
