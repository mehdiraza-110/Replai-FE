import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ToastItem { id: number; title: string; body?: string; to?: string }
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(list: ToastItem[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

export function showToast(toast: Omit<ToastItem, "id">, ms = 10_000) {
  const id = nextId++;
  items = [...items, { ...toast, id }];
  emit();
  window.setTimeout(() => dismiss(id), ms);
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Mounted once in the app shell. */
export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items);
  const navigate = useNavigate();
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);
  if (!list.length) return null;
  return (
    <div className="sv-fb-toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="sv-fb-toast">
          <button type="button" className="sv-fb-toast-main" onClick={() => { if (t.to) navigate(t.to); dismiss(t.id); }}>
            <strong>{t.title}</strong>
            {t.body ? <span>{t.body}</span> : null}
          </button>
          <button type="button" className="sv-icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X className="sv-icon" aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}
