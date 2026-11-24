import { Brain, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Memory as MemoryItem } from "../api";
import { ConfirmButton, EmptyState, Notice, SkeletonLines, timeAgo } from "../components/ui";

export default function Memory() {
  const [memories, setMemories] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMemories()
      .then(setMemories)
      .catch((err) => setError(err.message));
  }, []);

  async function forget(id: string) {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => (prev ?? []).filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the memory.");
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-header">
          <div>
            <h1>Memory</h1>
            <p>
              Durable facts the agent picked up from your emails, like who your clients are or what projects you work on.
              It searches them before prioritizing new emails.
            </p>
          </div>
          {memories && memories.length > 0 && <span className="badge">{memories.length} {memories.length === 1 ? "fact" : "facts"}</span>}
        </header>

        {error && <Notice kind="error">{error}</Notice>}

        {memories === null && !error ? (
          <SkeletonLines lines={5} />
        ) : memories && memories.length === 0 ? (
          <EmptyState icon={<Brain size={20} />} title="Nothing remembered yet">
            When an email reveals something worth knowing later, such as a sender's role or a recurring deadline, the agent
            saves it here automatically.
          </EmptyState>
        ) : (
          <ul className="rows">
            {memories?.map((memory) => (
              <li key={memory.id}>
                <div className="content">
                  <p>{memory.content}</p>
                  <time dateTime={memory.updated_at}>Learned {timeAgo(memory.updated_at)}</time>
                </div>
                <ConfirmButton
                  className="btn-sm"
                  icon={<Trash2 size={14} />}
                  label="Forget"
                  confirmLabel="Forget?"
                  onConfirm={() => forget(memory.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
