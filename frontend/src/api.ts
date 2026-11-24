export type EmailStatus = "processing" | "saved" | "trashed" | "failed";
export type Priority = "low" | "medium" | "high";

export interface EmailInput {
  author: string;
  to: string;
  subject: string;
  body: string;
}

export interface Email extends EmailInput {
  id: string;
  status: EmailStatus;
  triage_reasoning: string | null;
  priority: Priority | null;
  summary: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraceStep {
  role: "human" | "ai" | "tool";
  content: string;
  name: string | null;
  tool_calls: { name: string; args: Record<string, unknown> }[];
}

export interface EmailDetail extends Email {
  trace: TraceStep[];
}

export interface FeedbackResult {
  email: Email;
  example_saved: boolean;
  updated_instructions: string[];
}

export interface Memory {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Instruction {
  key: string;
  title: string;
  description: string;
  prompt: string;
  is_default: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (Array.isArray(data.detail)) message = data.detail.map((d: { msg: string }) => d.msg).join(". ");
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  listEmails: () => request<Email[]>("/emails"),
  getEmail: (id: string) => request<EmailDetail>(`/emails/${id}`),
  processEmail: (email: EmailInput) => request<Email>("/emails", { method: "POST", body: json(email) }),
  deleteEmail: (id: string) => request<void>(`/emails/${id}`, { method: "DELETE" }),
  sendFeedback: (id: string, body: { label?: "save" | "trash"; feedback?: string }) =>
    request<FeedbackResult>(`/emails/${id}/feedback`, { method: "POST", body: json(body) }),
  listMemories: () => request<Memory[]>("/memories"),
  deleteMemory: (id: string) => request<void>(`/memories/${id}`, { method: "DELETE" }),
  listInstructions: () => request<Instruction[]>("/instructions"),
  updateInstruction: (key: string, prompt: string) =>
    request<Instruction>(`/instructions/${key}`, { method: "PUT", body: json({ prompt }) }),
  resetInstruction: (key: string) => request<Instruction>(`/instructions/${key}`, { method: "DELETE" }),
};
