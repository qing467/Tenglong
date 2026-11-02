import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockItem, Settings, Wallpaper } from '../types';
import { useAppData } from '../hooks/useAppData';
import { buildTarget, engineIn } from '../lib/engines';
import { navigate } from '../lib/navigate';
import { isPresetLight, presetById } from '../lib/wallpapers';
import { DEFAULT_DATA, exportJson, parseBackup, setSaveErrorHandler } from '../lib/storage';
import { saveBackup, backupSpanMs } from '../lib/backup';
import { SITES_REV, defaultDock } from '../lib/sites';
import { addTo, getAt, isFolder, removeAt, updateAt } from '../lib/dockPath';
import { Clock } from './components/Clock';
import { SearchBar } from './components/SearchBar';
import { DockGrid } from './components/DockGrid';
import { SiteEditor } from './components/SiteEditor';
import { FolderView } from './components/FolderView';
import { EngineManager } from './components/EngineManager';
import { SettingsDrawer } from './components/SettingsDrawer';
import { TopBar } from './components/TopBar';
import { ToastHost, useToast } from './components/Toast';

const SPAN = { day: 864e5, week: 6048e5, month: 2592e6 } as const;

type Mode = 'idle' | 'search' | 'dock';

export default function App() {
  const { data, ready, update, updateSettings, setNow, replace } = useAppData();
  const [mode, setMode] = useState<Mode>('idle');
  /* null = 关闭；末位 -1 = 新增（[folderIdx, -1] = 往某个收纳夹里加） */
  const [editing, setEditing] = useState<number[] | null>(null);
  const [newKind, setNewKind] = useState<'site' | 'folder'>('site');
  const [openFolder, setOpenFolder] = useState<number | null>(null);
  /* popup 里「打开起始页设置」会带 ?settings=1 进来，直接展开设置 */
  const [settingsOpen, setSettingsOpen] = useState(
    () => new URLSearchParams(window.location.search).get('settings') === '1',
  );
  const [engMgr, setEngMgr] = useState(false);
  const toast = useToast();
  const s = data.settings;
  const wp = s.wallpaper;
  /** 图片型预设取内置图片地址，其余预设仍走 CSS 类 */
  const wpImg = wp.type === 'preset' ? presetById(wp.value)?.src : wp.value;

  /* 主题 / 状态类挂在 body 上，CSS 统一控制 */
  useEffect(() => {
    const cl = document.body.classList;
    cl.toggle('dark', s.theme === 'dark');
    // 预设一律按预设表判断深浅（旧存档 / 导入数据的 light 字段可能缺失或错误）
    const light = wp.type === 'preset' ? isPresetLight(wp.value) : !!wp.light;
    cl.toggle('lightbg', light && s.theme !== 'dark');
    cl.toggle('state-idle', mode === 'idle');
    cl.toggle('state-search', mode === 'search');
    cl.toggle('state-dock', mode === 'dock');
    cl.toggle('settings-open', settingsOpen);
  }, [s.theme, wp, mode, settingsOpen]);

  useEffect(() => {
    if (mode !== 'dock') setEditing(null);
  }, [mode]);

  /* 读走 ?settings=1 后就把参数抹掉，否则刷新会再次弹出设置 */
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  /* 写盘彻底失败（配额满）时说一声，别让用户以为存上了 */
  useEffect(() => {
    setSaveErrorHandler(() => toast.push('保存失败：本地存储空间不足', true));
    return () => setSaveErrorHandler(null);
  }, [toast]);

  /* 定期自动清除历史 */
  useEffect(() => {
    if (!ready || s.clear === 'never') return;
    const span = SPAN[s.clear];
    if (!span || Date.now() - s.clearLast < span) return;
    update((prev) => ({
      ...prev,
      history: [],
      settings: { ...prev.settings, clearLast: Date.now() },
    }));
  }, [ready, s.clear, s.clearLast, update]);

  /* 引擎切换（列表可在设置里增删改排序） */
  const engines = s.engines;
  const onEngine = useCallback(
    (id: string) => {
      updateSettings((x) => ({ ...x, engine: id }), true);
      toast.push('已切换到 ' + engineIn(s.engines, id).n);
    },
    [updateSettings, toast, s.engines],
  );

  /* 键盘：Esc 逐级关闭；回车进搜索；Alt+1~6 切引擎 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing !== null) {
          setEditing(null);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (engMgr) {
          setEngMgr(false);
          return;
        }
        if (openFolder !== null) {
          setOpenFolder(null);
          return;
        }
        if (mode === 'dock' || mode === 'search') setMode('idle');
        return;
      }
      if (mode === 'idle' && e.key === 'Enter') {
        e.preventDefault();
        setMode('search');
        return;
      }
      if (mode === 'search' && e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const en = s.engines[Number(e.key) - 1];
        if (en) onEngine(en.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, editing, settingsOpen, engMgr, openFolder, onEngine]);

  /* 右键空白 → 捷径坞（卡片上的右键由卡片自己处理并阻止冒泡） */
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      const t = e.target as HTMLElement;
      if (t.closest('.dock-item')) return;
      if (t.closest('.settings')) return; // 设置面板开着时右键不进坞
      setSettingsOpen(false); // 避免抽屉与捷径坞同时占屏
      setMode('dock');
    };
    document.addEventListener('contextmenu', onCtx);
    return () => document.removeEventListener('contextmenu', onCtx);
  }, []);

  /* 左键点空白：设置面板 / 搜索态 / 捷径坞都收起 */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // 设置开着时，点面板外任意空白即退出（顶栏按钮、其它弹窗除外，避免与自身的开关冲突）
      if (settingsOpen) {
        if (t.closest('.settings') || t.closest('.topbar') || t.closest('.modal')) return;
        setSettingsOpen(false);
        return;
      }
      if (editing !== null || mode === 'idle') return;
      if (t.closest('.searchwrap') || t.closest('.dock-item')) return;
      // 弹窗（收纳夹浮层、编辑框）不算点空白
      if (t.closest('.modal')) return;
      if (mode === 'dock' && t.closest('.dock')) return; // 坞内滚动条等
      setMode('idle');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [mode, editing, settingsOpen]);

  /* 提交搜索：先落盘历史，再跳转 */
  const submit = useCallback(
    (v: string) => {
      const next = { ...data, history: [v, ...data.history.filter((x) => x !== v)].slice(0, 20) };
      void setNow(next).then(() => {
        navigate(buildTarget(v, engineIn(s.engines, s.engine)));
      });
    },
    [data, setNow, s.engine, s.engines],
  );

  const clearHistory = useCallback(() => {
    update(
      (prev) => ({ ...prev, history: [], settings: { ...prev.settings, clearLast: Date.now() } }),
      true,
    );
    toast.push('已清除历史记录', true);
  }, [update, toast]);

  /* 设置项通用改法（时钟制式 / 秒钟 / 自动清除） */
  const patchSettings = useCallback(
    (fn: (s: Settings) => Settings) => {
      updateSettings(fn, true);
    },
    [updateSettings],
  );

  /* 导出：blob 下载（扩展页面里可用，不需要 downloads 权限） */
  const exportBackup = useCallback(() => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '腾龙起始页-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.push('已导出备份');
  }, [data, toast]);

  /* 手动 / 自动备份共用：写进「下载/<子文件夹>/腾龙起始页-日期.json」 */
  const doBackup = useCallback(() => {
    void saveBackup(data, s.backupDir).then(
      () => {
        updateSettings((x) => ({ ...x, backupLast: Date.now() }), true);
        toast.push(`已备份到「下载/${s.backupDir}」`);
      },
      () => toast.push('备份失败，可重试或改用「导出备份」', true),
    );
  }, [data, s.backupDir, updateSettings, toast]);

  /* 自动备份：达到周期就静默备份一次，本页生命周期内只触发一次 */
  const backupFired = useRef(false);
  useEffect(() => {
    if (!ready || backupFired.current) return;
    const span = backupSpanMs(s.backupEvery);
    if (!span) return;
    if (Date.now() - (s.backupLast || 0) < span) return;
    backupFired.current = true;
    void saveBackup(data, s.backupDir).then(
      () => {
        updateSettings((x) => ({ ...x, backupLast: Date.now() }), true);
        toast.push(`已自动备份到「下载/${s.backupDir}」`);
      },
      () => toast.push('自动备份失败，可在设置里手动备份', true),
    );
  }, [ready, s.backupEvery, s.backupLast, s.backupDir, data, updateSettings, toast]);

  /* 导入：整体替换，parseBackup 会 normalize，坏文件不会污染数据 */
  const importBackup = useCallback(
    (text: string) => {
      const next = parseBackup(text);
      if (!next) {
        toast.push('文件格式不对，导入失败', true);
        return;
      }
      void replace(next);
      toast.push('已导入备份');
    },
    [replace, toast],
  );

  const resetAll = useCallback(() => {
    void replace({ ...DEFAULT_DATA, dock: defaultDock(), dockRev: SITES_REV });
    toast.push('已恢复默认设置', true);
  }, [replace, toast]);

  /* 壁纸 / 主题（M6） */
  const setWallpaper = useCallback(
    (w: Wallpaper) => {
      updateSettings((x) => ({ ...x, wallpaper: w }), true);
    },
    [updateSettings],
  );

  const setTheme = useCallback(
    (t: 'light' | 'dark') => {
      updateSettings((x) => ({ ...x, theme: t }), true);
    },
    [updateSettings],
  );

  /* 捷径坞：排序（拖拽中不断调整，commit=true 才立即写盘） */
  const onReorder = useCallback(
    (next: DockItem[], commit: boolean) => {
      update((prev) => ({ ...prev, dock: next }), commit);
    },
    [update],
  );

  /* 站点 / 收纳夹保存：folder = -1 放根层，>=0 收进该收纳夹 */
  const onSaveSite = useCallback(
    (path: number[], n: string, u: string, folder: number, icon: string) => {
      update((prev) => {
        const cur = getAt(prev.dock, path);
        /* 只认手填的图标；留空就走 appIconOf 自动生成，保证和内置站点同一套样式 */
        const icon2 = icon.trim();
        if (cur) {
          const item: DockItem = { ...cur, n, u, icon: icon2 };
          // 位置没变（仍在根层，或仍在原收纳夹）→ 原地更新，避免被挪到末尾
          const sameSpot =
            (path.length === 1 && folder === -1) || (path.length === 2 && folder === path[0]);
          if (sameSpot) return { ...prev, dock: updateAt(prev.dock, path, () => item) };
          const without = removeAt(prev.dock, path);
          // 从根层摘走之后，目标收纳夹的下标可能前移一位
          const target = path.length === 1 && path[0] < folder ? folder - 1 : folder;
          return { ...prev, dock: addTo(without, target, item) };
        }
        const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const add: DockItem = { id, n, u, icon: icon2 };
        // 新建收纳夹时 u 为空：必须带 items，否则会被当成一个没有网址的空站点
        if (!u) add.items = [];
        return { ...prev, dock: addTo(prev.dock, folder, add) };
      }, true);
      const isNew = path[path.length - 1] < 0;
      setEditing(null);
      toast.push(isNew ? '已添加' : '已保存');
    },
    [update, toast],
  );

  const onDeleteSite = useCallback(
    (path: number[]) => {
      update((prev) => {
        const cur = getAt(prev.dock, path);
        // 删收纳夹：里面的站点放回捷径坞，避免一下丢掉一堆
        if (cur && isFolder(cur) && (cur.items?.length ?? 0) > 0) {
          const without = removeAt(prev.dock, path);
          return { ...prev, dock: [...without, ...(cur.items ?? [])] };
        }
        return { ...prev, dock: removeAt(prev.dock, path) };
      }, true);
      setEditing(null);
      // 只在删掉收纳夹本身时关浮层；删夹内站点时保持打开
      const cur = getAt(data.dock, path);
      if (cur && isFolder(cur)) setOpenFolder(null);
      toast.push('已删除', true);
    },
    [update, toast, data.dock],
  );

  return (
    <>
      <div
        className={'wallpaper' + (wpImg ? ' image' : wp.type === 'preset' ? ' ' + wp.value : ' image')}
        style={wpImg ? { backgroundImage: `url("${wpImg}")` } : undefined}
      />
      <TopBar
        dark={s.theme === 'dark'}
        onToggleTheme={() => setTheme(s.theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div id="stage">
        <Clock h24={s.h24} sec={s.sec} />
        <SearchBar
          mode={mode === 'search' ? 'search' : 'idle'}
          setMode={(m) => setMode(m)}
          engines={engines}
          engineId={s.engine}
          onEngine={onEngine}
          history={data.history}
          onSubmit={submit}
          onClearHistory={clearHistory}
          onEnginePref={() => setSettingsOpen(true)}
        />
        {mode === 'dock' && (
          <DockGrid
            items={data.dock}
            onReorder={onReorder}
            onEdit={(path) => setEditing(path)}
            onAdd={() => {
              setNewKind('site');
              setEditing([-1]);
            }}
            onAddFolder={() => {
              setNewKind('folder');
              setEditing([-1]);
            }}
            onOpenFolder={(i) => setOpenFolder(i)}
          />
        )}
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={s}
        onWallpaper={setWallpaper}
        onTheme={setTheme}
        onPatch={patchSettings}
        onClearHistory={clearHistory}
        onExport={exportBackup}
        onImport={importBackup}
        onReset={resetAll}
        onManageEngines={() => setEngMgr(true)}
        onBackup={doBackup}
        onNotify={(m, err) => toast.push(m, err)}
      />

      <EngineManager
        open={engMgr}
        engines={engines}
        currentId={s.engine}
        onClose={() => setEngMgr(false)}
        onChange={(list) =>
          patchSettings((x) => ({
            ...x,
            engines: list,
            // 当前引擎被删掉时，自动落到列表第一个
            engine: list.some((e) => e.id === x.engine) ? x.engine : list[0]?.id ?? x.engine,
          }))
        }
        onNotify={(m, err) => toast.push(m, err)}
      />

      <FolderView
        openIdx={openFolder}
        folder={openFolder === null ? null : data.dock[openFolder] ?? null}
        onClose={() => setOpenFolder(null)}
        onEdit={(path) => setEditing(path)}
        onAdd={(container) => {
          setNewKind('site');
          setEditing([container, -1]);
        }}
      />

      <SiteEditor
        editing={editing}
        newKind={newKind}
        items={data.dock}
        onClose={() => setEditing(null)}
        onSave={onSaveSite}
        onDelete={onDeleteSite}
      />

      <ToastHost items={toast.items} />
    </>
  );
}
