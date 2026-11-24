import { ArrowLeft, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, type Email, type EmailInput } from "../api";
import { SAMPLES } from "../samples";
import { Notice, Spinner } from "./ui";

const EMPTY: EmailInput = { author: "", to: "", subject: "", body: "" };

export default function Compose({ onProcessed, onBack }: { onProcessed: (email: Email) => void; onBack: () => void }) {
  const [email, setEmail] = useState<EmailInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof EmailInput) => (e: { target: { value: string } }) =>
    setEmail((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onProcessed(await api.processEmail(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form className="compose" onSubmit={submit}>
      <button type="button" className="btn btn-ghost btn-sm back-btn" onClick={onBack}>
        <ArrowLeft size={15} /> Inbox
      </button>
      <div>
        <h2>Process a new email</h2>
        <p className="hint" style={{ color: "var(--text-2)", marginTop: 4 }}>
          Paste an email or start from a sample. The agent decides whether to keep or trash it, sets a priority, writes a
          summary and remembers useful facts.
        </p>
      </div>

      <div className="samples" role="group" aria-label="Sample emails">
        {SAMPLES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className="chip"
            disabled={busy}
            onClick={() => setEmail(sample.email)}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="author">From</label>
          <input id="author" className="input" required maxLength={320} value={email.author} onChange={set("author")} placeholder="Alice <alice@company.com>" disabled={busy} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" className="input" required maxLength={320} value={email.to} onChange={set("to")} placeholder="Me <me@company.com>" disabled={busy} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" className="input" maxLength={998} value={email.subject} onChange={set("subject")} placeholder="What is this email about?" disabled={busy} />
      </div>
      <div className="field">
        <label htmlFor="body">Body</label>
        <textarea id="body" className="textarea" required maxLength={50000} value={email.body} onChange={set("body")} placeholder="Paste the email content here…" disabled={busy} />
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <div className="compose-footer">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner /> : <Sparkles size={15} />}
          {busy ? "Processing…" : "Process email"}
        </button>
        {busy ? (
          <span className="status" role="status">
            The agent is triaging and filing this email. This usually takes a few seconds.
          </span>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setEmail(EMPTY)}>
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
