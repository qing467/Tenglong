import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2, History as HistoryIcon } from 'lucide-react';
import { engineIn } from '../../lib/engines';
import type { Engine } from '../../lib/engines';

interface Props {
  mode: 'idle' | 'search';
  setMode: (m: 'idle' | 'search') => void;
  engines: Engine[];
  engineId: string;
  onEngine: (id: string) => void;
  history: string[];
  onSubmit: (q: string) => void;
  onClearHistory: () => void;
  onEnginePref: () => void;
}

export function SearchBar({
  mode,
  setMode,
  engines,
  engineId,
  onEngine,
  history,
  onSubmit,
  onClearHistory,
  onEnginePref,
}: Props) {
  const [q, setQ] = useState('');
  const [openEng, setOpenEng] = useState(false);
  /* Esc 分级：引擎弹层 → 历史下拉 → 退出搜索态。下拉被 Esc 收起后，重新输入才再出现 */
  const [hideHist, setHideHist] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const en = engineIn(engines, engineId);

  /** 进入搜索态自动聚焦 */
  useEffect(() => {
    if (mode === 'search') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    setOpenEng(false);
    setQ('');
    setHideHist(false);
  }, [mode]);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (kw ? history.filter((h) => h.toLowerCase().includes(kw)) : history).slice(0, 6);
  }, [q, history]);

  const submit = (v: string) => {
    const s = v.trim();
    if (!s) return;
    // 回车 / 点搜索图标：立即收起历史下拉与引擎弹层，直接搜索
    setOpenEng(false);
    setHideHist(true);
    onSubmit(s);
  };

  const wrapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== 'search') setMode('search');
  };

  return (
    <div className="searchwrap" onClick={wrapClick}>
      {/* 静默态：磨砂胶囊 + 白色小字 */}
      <button type="button" className="s-idle" onClick={() => setMode('search')}>
        搜索
      </button>

      {/* 搜索态：白底胶囊（引擎徽标 / 输入 / 绿色放大镜） */}
      <div className="s-active">
        <button
          type="button"
          className="engine-ico"
          aria-label="选择搜索引擎"
          onClick={(e) => {
            e.stopPropagation();
            setOpenEng((v) => !v);
          }}
        >
          <span className="badge">{en.l}</span>
        </button>

        <input
          ref={inputRef}
          value={q}
          placeholder={`在 ${en.n} 中搜索，或输入网址`}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setHideHist(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit(q);
              return;
            }
            if (e.key === 'Escape') {
              // 还有弹层就先收弹层，不再冒泡到「退出搜索态」
              if (openEng) {
                e.stopPropagation();
                setOpenEng(false);
                return;
              }
              if (list.length > 0 && !hideHist) {
                e.stopPropagation();
                setHideHist(true);
              }
            }
          }}
        />

        <button
          type="button"
          className="go"
          aria-label="搜索"
          onClick={(e) => {
            e.stopPropagation();
            submit(q);
          }}
        >
          <Search size={23} strokeWidth={2} />
        </button>
      </div>

      {/* 历史下拉 */}
      {mode === 'search' && !openEng && !hideHist && list.length > 0 && (
        <div className="hist" onClick={(e) => e.stopPropagation()}>
          {list.map((h) => (
            <div
              key={h}
              className="item"
              onClick={() => {
                setQ(h);
                submit(h);
              }}
            >
              <HistoryIcon size={14} />
              <span>{h}</span>
            </div>
          ))}
          <div className="foot" onClick={onClearHistory}>
            <Trash2 size={13} />
            <span>清除历史记录</span>
          </div>
        </div>
      )}

      {/* 引擎弹层 */}
      {mode === 'search' && openEng && (
        <div className="eng-pop" onClick={(e) => e.stopPropagation()}>
          {engines.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                onEngine(e.id);
                setOpenEng(false);
              }}
            >
              <span className="badge" style={{ background: e.c }}>
                {e.l}
              </span>
              <span>{e.n}</span>
              <span className="k">{i < 9 ? `Alt+${i + 1}` : ''}</span>
            </button>
          ))}
          <button
            type="button"
            className="eng-pref"
            onClick={() => {
              setOpenEng(false);
              onEnginePref();
            }}
          >
            搜索引擎偏好
          </button>
        </div>
      )}
    </div>
  );
}
