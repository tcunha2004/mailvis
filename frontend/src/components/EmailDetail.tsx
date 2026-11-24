import { ArrowLeft, Bot, ChevronRight, MessageSquareText, Trash2, User, Wrench } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Email, type EmailDetail as Detail, type FeedbackResult, type TraceStep } from "../api";
import { ConfirmButton, fullDate, Notice, PriorityBadge, SkeletonLines, Spinner, StatusBadge } from "./ui";

const INSTRUCTION_TITLES: Record<string, string> = {
  triage_save: "Emails to keep",
  triage_trash: "Emails to trash",
  executor_instructions: "Processing workflow",
};

export default function EmailDetail({
  id,
  onChanged,
  onDeleted,
  onBack,
}: {
  id: string;
  onChanged: (email: Email) => void;
  onDeleted: (id: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setEmail(null);
    setError(null);
    api
      .getEmail(id)
      .then((data) => active && setEmail(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    try {
      await api.deleteEmail(id);
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the email.");
    }
  }

  const back = (
    <button type="button" className="btn btn-ghost btn-sm back-btn" onClick={onBack}>
      <ArrowLeft size={15} /> Inbox
    </button>
  );

  if (error) {
    return (
      <>
        {back}
        <Notice kind="error">{error}</Notice>
      </>
    );
  }
  if (!email) {
    return (
      <>
        {back}
        <div className="skeleton" style={{ height: 24, width: "60%", marginBottom: 20 }} />
        <SkeletonLines lines={6} />
      </>
    );
  }

  return (
    <article>
      {back}
      <div className="detail-head">
        <div>
          <h2>{email.subject || "(no subject)"}</h2>
          <dl className="meta">
            <dt>From</dt>
            <dd>{email.author}</dd>
            <dt>To</dt>
            <dd>{email.to}</dd>
            <dt>Received</dt>
            <dd>{fullDate(email.created_at)}</dd>
          </dl>
        </div>
        <ConfirmButton icon={<Trash2 size={15} />} label="Delete" confirmLabel="Delete?" onConfirm={remove} />
      </div>

      <Verdict email={email} />

      <section className="section" aria-labelledby="body-title">
        <h3 id="body-title">Original email</h3>
        <pre className="body-text">{email.body}</pre>
      </section>

      {email.trace.length > 0 && (
        <section className="section">
          <details className="trace">
            <summary>
              <ChevronRight size={16} />
              How the agent handled it
              <span className="badge">{email.trace.filter((s) => s.role === "tool").length} tool calls</span>
            </summary>
            <ol className="steps">
              {email.trace.slice(1).map((step, i) => (
                <Step key={i} step={step} />
              ))}
            </ol>
          </details>
        </section>
      )}

      <section className="section">
        <Feedback
          email={email}
          onResult={(result) => {
            setEmail({ ...email, ...result.email });
            onChanged(result.email);
          }}
        />
      </section>
    </article>
  );
}

function Verdict({ email }: { email: Email }) {
  if (email.status === "failed") {
    return (
      <div className="verdict failed">
        <div className="badges">
          <StatusBadge status="failed" />
        </div>
        <p className="why">
          The agent could not finish processing this email. {email.error && <code>{email.error}</code>}
        </p>
      </div>
    );
  }
  return (
    <div className="verdict">
      <div className="badges">
        <StatusBadge status={email.status} />
        <PriorityBadge priority={email.priority} />
      </div>
      {email.summary && <p className="summary">{email.summary}</p>}
      {email.triage_reasoning && (
        <p className="why">
          <strong>Why: </strong>
          {email.triage_reasoning}
        </p>
      )}
    </div>
  );
}

function Step({ step }: { step: TraceStep }) {
  if (step.role === "tool") {
    return (
      <li className="step">
        <span className="dot">
          <Wrench />
        </span>
        <div>
          <div className="step-title">Result of {step.name}</div>
          <pre className="code">{step.content || "(empty)"}</pre>
        </div>
      </li>
    );
  }
  const isAi = step.role === "ai";
  return (
    <li className={`step ${step.role}`}>
      <span className="dot">{isAi ? <Bot /> : <User />}</span>
      <div>
        <div className="step-title">
          {isAi ? (step.tool_calls.length ? `Agent called ${step.tool_calls.map((c) => c.name).join(", ")}` : "Agent") : "Input"}
        </div>
        {step.content && <p className="step-text">{step.content}</p>}
        {step.tool_calls.map((call, i) => (
          <pre key={i} className="code">
            {call.name}({JSON.stringify(call.args, null, 2)})
          </pre>
        ))}
      </div>
    </li>
  );
}

function Feedback({ email, onResult }: { email: Email; onResult: (result: FeedbackResult) => void }) {
  const [label, setLabel] = useState<"save" | "trash" | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeedbackResult | null>(null);

  useEffect(() => {
    setLabel(null);
    setText("");
    setResult(null);
    setError(null);
  }, [email.id]);

  const canSubmit = !busy && (label !== null || text.trim().length > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.sendFeedback(email.id, {
        ...(label && { label }),
        ...(text.trim() && { feedback: text.trim() }),
      });
      setResult(data);
      setLabel(null);
      setText("");
      onResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="feedback" onSubmit={submit}>
      <div>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquareText size={16} /> Teach the agent
        </h3>
        <p className="hint" style={{ marginTop: 4 }}>
          Did it get this one wrong? Correct the decision to give it an example for similar emails, and explain what you
          expect so it can rewrite its own instructions.
        </p>
      </div>

      <div className="field">
        <span className="label" id="label-title">
          This email should be
        </span>
        <div className="segmented" role="group" aria-labelledby="label-title">
          {(["save", "trash"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={label === value}
              onClick={() => setLabel(label === value ? null : value)}
              disabled={busy}
            >
              {value === "save" ? "Kept" : "Trashed"}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="feedback-text">What should it do differently? (optional)</label>
        <textarea
          id="feedback-text"
          className="textarea"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Emails from Acme are always high priority, they are our biggest client."
          disabled={busy}
        />
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {result && (
        <Notice kind="success">
          {result.example_saved && "Saved as an example for future triage. "}
          {result.updated_instructions.length > 0
            ? `Updated instructions: ${result.updated_instructions.map((k) => INSTRUCTION_TITLES[k] ?? k).join(", ")}.`
            : result.example_saved
              ? ""
              : "No instruction needed a change."}
        </Notice>
      )}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {busy && <Spinner />}
          {busy ? "Learning…" : "Send feedback"}
        </button>
        {busy && text.trim() && (
          <span className="hint" role="status">
            Rewriting instructions. This can take up to a minute.
          </span>
        )}
      </div>
    </form>
  );
}
