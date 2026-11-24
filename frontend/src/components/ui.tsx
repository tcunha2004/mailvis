import { AlertTriangle, Archive, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { EmailStatus, Priority } from "../api";

const STATUS: Record<EmailStatus, { label: string; icon: ReactNode }> = {
  saved: { label: "Kept", icon: <Archive /> },
  trashed: { label: "Trashed", icon: <Trash2 /> },
  failed: { label: "Failed", icon: <AlertTriangle /> },
  processing: { label: "Processing", icon: <Loader2 /> },
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  const { label, icon } = STATUS[status];
  return (
    <span className={`badge badge-${status}`}>
      {icon}
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return <span className={`badge badge-${priority}`}>{priority[0].toUpperCase() + priority.slice(1)} priority</span>;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "error"; children: ReactNode }) {
  const icon = kind === "error" ? <AlertTriangle /> : <CheckCircle2 />;
  return (
    <div className={`notice ${kind === "info" ? "" : kind}`} role={kind === "error" ? "alert" : "status"}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

export function SkeletonLines({ lines = 4 }: { lines?: number }) {
  return (
    <div className="skeleton-lines" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: `${90 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

/** Two-step destructive button: first click arms it, second click confirms. */
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Confirm",
  icon,
  disabled,
  className = "",
}: {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className={`btn btn-danger ${armed ? "confirming" : "btn-ghost"} ${className}`}
      disabled={disabled}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      aria-label={armed ? confirmLabel : label}
    >
      {icon}
      <span>{armed ? confirmLabel : label}</span>
    </button>
  );
}

/** "Alice Smith <alice@x.com>" -> "Alice Smith" */
export function displayName(address: string) {
  const match = address.match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/);
  return match ? match[1] : address;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
