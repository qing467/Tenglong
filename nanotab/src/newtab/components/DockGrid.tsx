import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DockItem } from '../../types';
import { BUILTIN_SITES, textSvg } from '../../lib/sites';
import { appIconOf, isAutoFavicon } from '../../lib/appIcon';
import { normalizeUrl } from '../../lib/favicon';
import { navigate } from '../../lib/navigate';
import { isFolder, previewOf } from '../../lib/dockPath';

interface Props {
  items: DockItem[];
  onReorder: (next: DockItem[], commit: boolean) => void;
  onEdit: (path: number[]) => void;
  onAdd: () => void;
  onAddFolder: () => void;
  onOpenFolder: (i: number) => void;
}

/** 收纳夹缩略格里的一格：与主图标同一套底色 + 首字 */
function Thumb({ d }: { d: DockItem }) {
  const ic = appIconOf(d);
  return (
    <span className="fg-cell" style={{ background: ic.bg }}>
      <i style={{ color: ic.fg }}>{ic.glyph}</i>
    </span>
  );
}

/**
 * 卡片外观：
 * ① 用户手填了图标地址 → 白底 + 图片（容器仍是圆角方块，和其他图标排在一起不违和）
 * ② 内置站点 → 品牌色 + 手工 SVG
 * ③ 新增站点 → 域名哈希取品牌色 + 名称首字，自动和内置站点同一套样式
 */
function look(d: DockItem) {
  if (d.icon && !isAutoFavicon(d.icon, d.u)) return { bg: '#fff', svg: '', img: d.icon };
  const ic = appIconOf(d);
  return { bg: ic.bg, svg: ic.svg ?? textSvg(ic.glyph, 16, ic.fg), img: '' };
}

/** 跳转地址：内置项即使存档里网址丢了，也按内置表还原 */
function urlOf(d: DockItem): string {
  const raw = d.u || (typeof d.b === 'number' && BUILTIN_SITES[d.b] ? BUILTIN_SITES[d.b].u : '');
  return normalizeUrl(raw);
}

export function DockGrid({ items, onReorder, onEdit, onAdd, onAddFolder, onOpenFolder }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  /*
   * 入场动画只播一次：播完立刻摘掉 .enter。
   * 不摘的话，每次拖拽重排（React 会把 DOM 节点重新 insertBefore）都会让动画重新播放，
   * 表现为拖动过程中图标不停闪烁。
   */
  const [enter, setEnter] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setEnter(false), 420);
    return () => window.clearTimeout(t);
  }, []);

  const from = useRef<number | null>(null);
  const snapshot = useRef<string>('');
  const busy = useRef(false);
  /*
   * 拖拽尾巴保护：拖拽过程中换过位后，浏览器可能补一次 click。
   * 之前用布尔标记，问题是「拖完没有 click」时标记会留到下一次点击，
   * 把用户真正想打开的那一次点击吞掉（表现为新加的站点点了没反应）。
   * 改成时间戳：只有紧挨着拖拽结束的 300ms 内的 click 才算尾巴。
   */
  const lastMove = useRef(0);

  const move = useCallback(
    (a: number, b: number) => {
      const next = items.slice();
      const [x] = next.splice(a, 1);
      next.splice(b, 0, x);
      onReorder(next, false);
    },
    [items, onReorder],
  );

  const onDragStart = (i: number) => (e: React.DragEvent) => {
    from.current = i;
    lastMove.current = 0;
    snapshot.current = items.map((x) => x.id).join('|');
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(i));
    } catch {
      /* 某些环境 setData 不可用，不影响内部排序（排序不依赖它） */
    }
  };

  /** dragover 每帧触发：用 rAF 节流，且只有目标变化时才重排 */
  const onDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (from.current === null || from.current === i || busy.current) return;
    busy.current = true;
    requestAnimationFrame(() => {
      busy.current = false;
      const f = from.current;
      if (f === null || f === i) return;
      move(f, i);
      lastMove.current = Date.now();
      from.current = i;
      setDragIdx(i);
    });
  };

  const onDragEnd = () => {
    from.current = null;
    setDragIdx(null);
    const now = items.map((x) => x.id).join('|');
    if (now !== snapshot.current) {
      onReorder(items, true); // 顺序真的变了才立即写盘（静默，不弹提示）
    }
  };

  return (
    <div className={'dock' + (enter ? ' enter' : '')} onDragEnd={onDragEnd}>
      {items.map((d, i) => {
        const l = look(d);
        const folder = isFolder(d);
        const u = folder ? '' : urlOf(d);
        return (
          <a
            key={d.id}
            className={'dock-item' + (dragIdx === i ? ' dragging' : '')}
            href={folder ? undefined : u || undefined}
            draggable
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onClick={(e) => {
              // 刚拖动过（300ms 内）→ 这次 click 是拖拽的尾巴，不能当成打开站点
              if (Date.now() - lastMove.current < 300) {
                e.preventDefault();
                return;
              }
              if (folder) {
                e.preventDefault();
                onOpenFolder(i);
                return;
              }
              if (!u) {
                e.preventDefault(); // 没填网址就什么都不做（不弹提示）
                return;
              }
              // Ctrl / Shift / 中键 → 交给浏览器（新标签页、新窗口）
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              navigate(u);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation(); // 不要触发「右键空白进捷径坞」
              onEdit([i]);
            }}
          >
            <div className={'tile' + (folder ? ' folder' : '') + (l.img ? ' photo' : '')} style={{ background: folder ? undefined : l.bg }}>
              {folder ? (
                <div className="folder-grid">
                  {previewOf(d).map((x) => (
                    <Thumb key={x.id} d={x} />
                  ))}
                </div>
              ) : l.img ? (
                <img className="logo" src={l.img} alt="" draggable={false} decoding="async" />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: l.svg }} />
              )}
            </div>
            <div className="dock-name">
              {d.n}
              {folder ? `（${d.items?.length ?? 0}）` : ''}
            </div>
          </a>
        );
      })}

      <div
        className="dock-item plus-item"
        onClick={onAdd}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddFolder();
        }}
        aria-label="添加站点（右键 = 新建收纳夹）"
      >
        <div className="tile plus">
          <Plus size={26} strokeWidth={2} />
        </div>
        <div className="dock-name">添加</div>
      </div>
    </div>
  );
}
