import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { DockItem } from '../../types';
import { foldersOf, getAt, isFolder } from '../../lib/dockPath';

interface Props {
  /** null = 关闭；末位 -1 = 新增；其余为编辑路径 */
  editing: number[] | null;
  /** 新增时的类型（编辑时以该项自身类型为准） */
  newKind: 'site' | 'folder';
  items: DockItem[];
  onClose: () => void;
  /** folder: -1 = 放捷径坞根层；>=0 = 收进第 folder 个收纳夹；icon 空 = 自动抓取 */
  onSave: (path: number[], n: string, u: string, folder: number, icon: string) => void;
  onDelete: (path: number[]) => void;
}

export function SiteEditor({ editing, newKind, items, onClose, onSave, onDelete }: Props) {
  const [n, setN] = useState('');
  const [u, setU] = useState('');
  const [folder, setFolder] = useState(-1);
  const [icon, setIcon] = useState('');
  const first = useRef<HTMLInputElement>(null);

  const isNew = !!editing && editing[editing.length - 1] < 0;
  const cur = editing && !isNew ? getAt(items, editing) : undefined;
  const asFolder = isNew ? newKind === 'folder' : isFolder(cur);
  const folders = foldersOf(items);
  /** 路径形如 [夹下标, 项下标] 时，新增 / 编辑都默认落在该收纳夹内；否则在根层 */
  const inFolder = editing && editing.length > 1 ? editing[0] : -1;

  useEffect(() => {
    if (!editing) return;
    setN(cur?.n ?? '');
    setU(cur?.u ?? '');
    setIcon(cur?.icon ?? '');
    setFolder(inFolder);
    const t = window.setTimeout(() => first.current?.focus(), 20);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) return null;

  const submit = () => {
    const name = n.trim();
    if (!asFolder) {
      const url = u.trim();
      if (!url) {
        first.current?.focus();
        return;
      }
      onSave(editing, name || url.replace(/^https?:\/\//i, '').split('/')[0], url, folder, icon);
      return;
    }
    if (!name) {
      first.current?.focus();
      return;
    }
    onSave(editing, name, '', -1, '');
  };

  const title = isNew ? (asFolder ? '新建收纳夹' : '添加站点') : asFolder ? '编辑收纳夹' : '编辑站点';

  return (
    <div className="modal show" onMouseDown={onClose}>
      <div
        className="modal-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-x" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <label className="fld">
          <span>{asFolder ? '收纳夹名称' : '名称'}</span>
          <input
            ref={first}
            value={n}
            placeholder={asFolder ? '如：工作 / 影音' : '留空则自动取域名'}
            spellCheck={false}
            onChange={(e) => setN(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </label>

        {!asFolder && (
          <label className="fld">
            <span>网址</span>
            <input
              value={u}
              placeholder="https://example.com"
              spellCheck={false}
              onChange={(e) => setU(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </label>
        )}

        {!asFolder && (
          <label className="fld">
            <span>图标地址（可不填）</span>
            <input
              value={icon}
              placeholder="留空 = 自动配色图标；也可贴一张方形图片地址"
              spellCheck={false}
              onChange={(e) => setIcon(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </label>
        )}

        {!asFolder && folders.length > 0 && (
          <label className="fld">
            <span>收纳到</span>
            <select className="inp sel" value={folder} onChange={(e) => setFolder(Number(e.target.value))}>
              <option value={-1}>不收纳（放捷径坞）</option>
              {folders.map(({ idx, d }) => (
                <option key={d.id} value={idx}>
                  {d.n}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="modal-foot">
          {!isNew && (
            <button type="button" className="btn danger" onClick={() => onDelete(editing)}>
              <Trash2 size={15} />
              删除
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn primary" onClick={submit}>
            保存
          </button>
        </div>

        {isNew && !asFolder && (
          <div className="modal-note">图标留空时会按域名自动配一套品牌色图标，与内置站点同一套样式</div>
        )}
        {asFolder && <div className="modal-note">收纳夹建好后，把站点「收纳到」它即可</div>}
      </div>
    </div>
  );
}
