import { Inbox as InboxIcon, PenSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Email } from "../api";
import Compose from "../components/Compose";
import EmailDetail from "../components/EmailDetail";
import { displayName, EmptyState, Notice, PriorityBadge, SkeletonLines, StatusBadge, timeAgo } from "../components/ui";

type Filter = "all" | "saved" | "trashed";
type Selection = { kind: "email"; id: string } | { kind: "compose" } | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "saved", label: "Kept" },
  { value: "trashed", label: "Trashed" },
];

export default function Inbox() {
  const [emails, setEmails] = useState<Email[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selection, setSelection] = useState<Selection>(null);
  const [freshId, setFreshId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .listEmails()
      .then(setEmails)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const counts = useMemo(
    () => ({
      all: emails?.length ?? 0,
      saved: emails?.filter((e) => e.status === "saved").length ?? 0,
      trashed: emails?.filter((e) => e.status === "trashed").length ?? 0,
    }),
    [emails],
  );

  const visible = (emails ?? []).filter((e) => filter === "all" || e.status === filter);

  function upsert(email: Email) {
    setEmails((prev) => [email, ...(prev ?? []).filter((e) => e.id !== email.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  const compose = () => setSelection({ kind: "compose" });

  return (
    <div className={`inbox ${selection ? "has-selection" : ""}`}>
      <aside className="list-pane" aria-label="Emails">
        <div className="list-header">
          <div className="row">
            <h1>Inbox</h1>
            <button type="button" className="btn btn-primary" onClick={compose}>
              <PenSquare size={15} /> New email
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Filter emails">
            {FILTERS.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label} <span className="count">{counts[value]}</span>
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <Notice kind="error">Could not load emails: {error}</Notice>
            <button type="button" className="btn" onClick={load}>
              Try again
            </button>
          </div>
        ) : emails === null ? (
          <div style={{ padding: 16 }}>
            <SkeletonLines lines={8} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={<InboxIcon size={20} />} title={emails.length ? "Nothing here" : "No emails yet"}>
            {emails.length
              ? `No ${filter === "saved" ? "kept" : "trashed"} emails so far.`
              : "Process your first email to see the agent in action."}
          </EmptyState>
        ) : (
          <ul className="email-list">
            {visible.map((email) => (
              <li key={email.id}>
                <button
                  type="button"
                  className={`email-item ${email.status} ${email.id === freshId ? "fresh" : ""}`}
                  aria-current={selection?.kind === "email" && selection.id === email.id}
                  onClick={() => setSelection({ kind: "email", id: email.id })}
                >
                  <span className="top">
                    <span className="from">{displayName(email.author)}</span>
                    <time dateTime={email.created_at}>{timeAgo(email.created_at)}</time>
                  </span>
                  <span className="subject">{email.subject || "(no subject)"}</span>
                  <span className="snippet">{email.summary ?? email.triage_reasoning ?? email.body}</span>
                  <span className="badges">
                    <StatusBadge status={email.status} />
                    <PriorityBadge priority={email.priority} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* keyed so each selection starts scrolled to the top */}
      <section className="detail-pane" aria-label="Details" key={selection?.kind === "email" ? selection.id : selection?.kind}>
        <div className="detail-inner">
          {selection?.kind === "compose" ? (
            <Compose
              onBack={() => setSelection(null)}
              onProcessed={(email) => {
                upsert(email);
                setFilter("all");
                setFreshId(email.id);
                setSelection({ kind: "email", id: email.id });
              }}
            />
          ) : selection?.kind === "email" ? (
            <EmailDetail
              id={selection.id}
              onBack={() => setSelection(null)}
              onChanged={upsert}
              onDeleted={(id) => {
                setEmails((prev) => (prev ?? []).filter((e) => e.id !== id));
                setSelection(null);
              }}
            />
          ) : (
            <EmptyState
              icon={<InboxIcon size={20} />}
              title="Your AI email assistant"
              action={
                <button type="button" className="btn btn-primary" onClick={compose}>
                  <PenSquare size={15} /> Process an email
                </button>
              }
            >
              Send an email through the agent. It keeps what matters, trashes the noise, sets priorities and learns from
              your corrections. Select an email on the left to see why it decided what it did.
            </EmptyState>
          )}
        </div>
      </section>
    </div>
  );
}
