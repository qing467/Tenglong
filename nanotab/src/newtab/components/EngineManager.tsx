import { useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { Engine } from '../../lib/engines';

interface Props {
  open: boolean;
  engines: Engine[];
  currentId: string;
  onClose: () => void;
  onChange: (list: Engine[]) => void;
  onNotify: (msg: string, err?: boolean) => void;
}

/** 空表单：新增时用 */
const BLANK: Engine = { id: '', n: '', l: '', c: '#5b6472', url: '' };

export function EngineManager({ open, engines, currentId, onClose, onChange, onNotify }: Props) {
  const [form, setForm] = useState<Engine>(BLANK);
  const [err, setErr] = useState('');
  const from = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!open) return null;

  const editing = !!form.id;

  const reset = () => {
    setForm(BLANK);
    setErr('');
  };

  const submit = () => {
    const n = form.n.trim();
    const url = form.url.trim();
    if (!n) return setErr('请填名称');
    if (!url) return setErr('请填搜索地址');
    if (!url.includes('{q}')) return setErr('搜索地址里要带 {q}（关键词会替换它）');
    if (!/^https?:\/\//i.test(url)) return setErr('搜索地址要以 http:// 或 https:// 开头');

    const l = form.l.trim() || n.slice(0, 1);
    if (editing) {
      onChange(engines.map((e) => (e.id === form.id ? { ...e, n, url, l, c: form.c } : e)));
      onNotify('已保存搜索引擎');
    } else {
      const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      onChange([...engines, { id, n, l, c: form.c, url }]);
      onNotify('已添加搜索引擎');
    }
    reset();
  };

  const remove = (e: Engine) => {
    if (engines.length <= 1) return onNotify('至少保留一个搜索引擎', true);
    onChange(engines.filter((x) => x.id !== e.id));
  };

  /* 拖拽排序：与捷径坞同一套（dragstart 记起点、dragenter 换位、dragend 提交） */
  const move = (a: number, b: number) => {
    const next = engines.slice();
    const [it] = next.splice(a, 1);
    next.splice(b, 0, it);
    onChange(next);
  };

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-card eng-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>搜索引擎</h3>
          <button className="modal-x" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="eng-list">
          {engines.map((e, i) => (
            <div
              key={e.id}
              className={'eng-row' + (dragIdx === i ? ' dragging' : '')}
              draggable
              onDragStart={() => {
                from.current = i;
                setDragIdx(i);
              }}
              onDragEnter={() => {
                const f = from.current;
                if (f === null || f === i) return;
                move(f, i);
                from.current = i;
                setDragIdx(i);
              }}
              onDragEnd={() => {
                from.current = null;
                setDragIdx(null);
              }}
              onClick={() => {
                setErr('');
                setForm({ ...e });
              }}
            >
              <span className="badge" style={{ background: e.c }}>
                {e.l}
              </span>
              <div className="eng-meta">
                <div className="eng-n">
                  {e.n}
                  {e.id === currentId && <em>当前</em>}
                </div>
                <div className="eng-u">{e.url}</div>
              </div>
              <button
                className="eng-del"
                aria-label={'删除 ' + e.n}
                onClick={(ev) => {
                  ev.stopPropagation();
                  remove(e);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="eng-form">
          <label className="fld">
            <span>{editing ? '编辑名称' : '名称'}</span>
            <input
              value={form.n}
              placeholder="如：豆瓣"
              onChange={(e) => setForm({ ...form, n: e.target.value })}
            />
          </label>
          <label className="fld">
            <span>搜索地址（关键词位置写 {'{q}'}）</span>
            <input
              value={form.url}
              placeholder="https://www.douban.com/search?q={q}"
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>
          <div className="eng-form-row">
            <label className="fld" style={{ flex: '0 0 84px', marginBottom: 0 }}>
              <span>徽标</span>
              <input
                value={form.l}
                placeholder="豆"
                onChange={(e) => setForm({ ...form, l: e.target.value })}
              />
            </label>
            <label className="fld" style={{ flex: '0 0 84px', marginBottom: 0 }}>
              <span>底色</span>
              <input
                type="color"
                className="eng-color"
                value={form.c}
                onChange={(e) => setForm({ ...form, c: e.target.value })}
              />
            </label>
          </div>
          {err && <div className="eng-err">{err}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn primary" onClick={submit}>
            {editing ? <Check size={15} /> : <Plus size={15} />}
            {editing ? '保存修改' : '添加'}
          </button>
          {editing && (
            <button className="btn" onClick={reset}>
              取消编辑
            </button>
          )}
          <span className="modal-note" style={{ marginTop: 0, marginLeft: 'auto' }}>
            拖动行可排序
          </span>
        </div>
      </div>
    </div>
  );
}
