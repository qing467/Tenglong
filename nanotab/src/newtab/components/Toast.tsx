import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';

export interface ToastItem {
  id: number;
  msg: string;
  err?: boolean;
}

/** 最多同时 3 条，超出移除最旧的一条 */
export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((msg: string, err = false) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-2), { id, msg, err }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 1900);
  }, []);

  // 稳定引用：只有提示内容变化时才换对象，避免每次渲染都让使用方的依赖全部失效
  return useMemo(() => ({ items, push }), [items, push]);
}

export function ToastHost({ items }: { items: ToastItem[] }) {
  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.err ? ' err' : ''}`}>
          {t.err ? <AlertCircle size={15} /> : <Check size={15} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
