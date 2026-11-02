import type { DockItem } from '../types';

/**
 * 捷径坞支持「收纳夹」（文件夹）。层级只有两层：根层可以是站点或收纳夹，
 * 收纳夹内部只放站点，不再嵌套 —— 路径因此最多两位 [文件夹下标, 内部下标]。
 */

export function isFolder(d?: DockItem): boolean {
  return !!d && Array.isArray(d.items);
}

/** 取指定路径的项；路径为空或不存在返回 undefined */
export function getAt(list: DockItem[], path: number[]): DockItem | undefined {
  if (!path.length) return undefined;
  const head = list[path[0]];
  if (!head) return undefined;
  if (path.length === 1) return head;
  return head.items?.[path[1]];
}

/** 替换指定路径的项（返回新数组，不改原数据） */
export function updateAt(
  list: DockItem[],
  path: number[],
  fn: (d: DockItem) => DockItem,
): DockItem[] {
  if (!path.length) return list;
  const i = path[0];
  if (i < 0 || i >= list.length) return list;
  const next = list.slice();
  if (path.length === 1) {
    next[i] = fn(list[i]);
    return next;
  }
  const inner = updateAt(list[i].items ?? [], path.slice(1), fn);
  next[i] = { ...list[i], items: inner };
  return next;
}

/** 删除指定路径的项 */
export function removeAt(list: DockItem[], path: number[]): DockItem[] {
  if (!path.length) return list;
  const i = path[0];
  if (i < 0 || i >= list.length) return list;
  const next = list.slice();
  if (path.length === 1) {
    next.splice(i, 1);
    return next;
  }
  next[i] = { ...list[i], items: removeAt(list[i].items ?? [], path.slice(1)) };
  return next;
}

/** 追加一项：container < 0 加到根层末尾，否则加进第 container 个收纳夹 */
export function addTo(list: DockItem[], container: number, item: DockItem): DockItem[] {
  if (container < 0 || container >= list.length) return [...list, item];
  const next = list.slice();
  next[container] = { ...list[container], items: [...(list[container].items ?? []), item] };
  return next;
}

/** 根层所有收纳夹（供「所属收纳夹」下拉使用） */
export function foldersOf(list: DockItem[]): { idx: number; d: DockItem }[] {
  return list
    .map((d, idx) => ({ idx, d }))
    .filter(({ d }) => isFolder(d));
}

/** 收纳夹里第一个站点的下标（用于取缩略图） */
export function previewOf(folder: DockItem): DockItem[] {
  return (folder.items ?? []).slice(0, 4);
}
