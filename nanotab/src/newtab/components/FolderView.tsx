import { Plus, X } from 'lucide-react';
import type { DockItem } from '../../types';
import { normalizeUrl } from '../../lib/favicon';
import { appIconOf } from '../../lib/appIcon';
import { textSvg } from '../../lib/sites';
import { navigate } from '../../lib/navigate';

interface Props {
  /** null = 关闭；数字 = 根层第几个收纳夹 */
  openIdx: number | null;
  folder: DockItem | null;
  onClose: () => void;
  onEdit: (path: number[]) => void;
  onAdd: (container: number) => void;
}

export function FolderView({ openIdx, folder, onClose, onEdit, onAdd }: Props) {
  if (openIdx === null || !folder) return null;
  const list = folder.items ?? [];

  return (
    <div className="modal show folder-modal" onMouseDown={onClose}>
      <div
        className="modal-card folder-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={folder.n}
      >
        <div className="modal-head">
          <h3>
            {folder.n}
            <span className="folder-count">{list.length} 个站点</span>
          </h3>
          <button type="button" className="modal-x" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {list.length === 0 ? (
          <div className="folder-empty">这个收纳夹还是空的，点下面的「添加」把站点收进来</div>
        ) : (
          <div className="folder-items">
            {list.map((d, i) => {
              const u = normalizeUrl(d.u);
              const ic = appIconOf(d);
              const svg = ic.svg ?? textSvg(ic.glyph, 18, ic.fg);
              return (
                <a
                  key={d.id}
                  className="folder-item"
                  href={u || undefined}
                  onClick={(e) => {
                    if (!u) {
                      e.preventDefault();
                      return;
                    }
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    navigate(u);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit([openIdx, i]);
                  }}
                >
                  <span
                    className="fi-tile"
                    style={{ background: ic.bg }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span className="fi-name">{d.n}</span>
                </a>
              );
            })}
          </div>
        )}

        <div className="modal-foot">
          <button type="button" className="btn primary" onClick={() => onAdd(openIdx)}>
            <Plus size={15} />
            添加
          </button>
          <span className="modal-note" style={{ marginTop: 0, marginLeft: 'auto' }}>
            右键站点可编辑或移出
          </span>
        </div>
      </div>
    </div>
  );
}
