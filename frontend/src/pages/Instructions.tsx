import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Instruction } from "../api";
import { Notice, SkeletonLines, Spinner } from "../components/ui";

export default function Instructions() {
  const [items, setItems] = useState<Instruction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listInstructions()
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const replace = (updated: Instruction) =>
    setItems((prev) => (prev ?? []).map((item) => (item.key === updated.key ? updated : item)));

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-header">
          <div>
            <h1>Instructions</h1>
            <p>
              The rules the agent follows. They are rewritten automatically when you give feedback on an email, and you
              can edit them here at any time.
            </p>
          </div>
        </header>

        {error && <Notice kind="error">{error}</Notice>}
        {items === null && !error && <SkeletonLines lines={8} />}
        {items?.map((item) => (
          <InstructionEditor key={item.key} item={item} onSaved={replace} />
        ))}
      </div>
    </div>
  );
}

function InstructionEditor({ item, onSaved }: { item: Instruction; onSaved: (item: Instruction) => void }) {
  const [draft, setDraft] = useState(item.prompt);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(item.prompt), [item.prompt]);

  const dirty = draft.trim() !== item.prompt.trim();

  async function run(action: "save" | "reset") {
    setBusy(action);
    setError(null);
    setSaved(false);
    try {
      const updated =
        action === "save" ? await api.updateInstruction(item.key, draft) : await api.resetInstruction(item.key);
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  const id = `instruction-${item.key}`;

  return (
    <section className="instruction" aria-labelledby={`${id}-title`}>
      <div className="head">
        <h2 id={`${id}-title`}>{item.title}</h2>
        <span className={`badge ${item.is_default ? "" : "badge-accent"}`}>{item.is_default ? "Default" : "Customized"}</span>
      </div>
      <p className="desc">{item.description}</p>
      <label htmlFor={id} className="visually-hidden">
        {item.title}
      </label>
      <textarea
        id={id}
        className="textarea mono"
        value={draft}
        maxLength={4000}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        disabled={busy !== null}
      />
      {error && (
        <div style={{ marginTop: 10 }}>
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!dirty || !draft.trim() || busy !== null} onClick={() => run("save")}>
          {busy === "save" ? <Spinner /> : <Save size={15} />} Save
        </button>
        {dirty && (
          <button type="button" className="btn btn-ghost" onClick={() => setDraft(item.prompt)} disabled={busy !== null}>
            Discard changes
          </button>
        )}
        {!item.is_default && !dirty && (
          <button type="button" className="btn btn-ghost" onClick={() => run("reset")} disabled={busy !== null}>
            {busy === "reset" ? <Spinner /> : <RotateCcw size={15} />} Reset to default
          </button>
        )}
        {saved && !dirty && (
          <span className="saved-note" role="status">
            Saved
          </span>
        )}
      </div>
    </section>
  );
}
