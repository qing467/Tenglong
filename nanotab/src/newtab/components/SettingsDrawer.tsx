import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ClearSpan, Settings, Wallpaper } from '../../types';
import { PRESETS, autoLight, compressImage, isPresetLight } from '../../lib/wallpapers';

const CLEAR_TEXT: { v: ClearSpan; t: string }[] = [
  { v: 'never', t: '从不' },
  { v: 'day', t: '每天' },
  { v: 'week', t: '每周' },
  { v: 'month', t: '每月' },
];

const BACKUP_EVERY: { v: Settings['backupEvery']; t: string }[] = [
  { v: 'off', t: '关闭' },
  { v: '1', t: '每 1 个月' },
  { v: '3', t: '每 3 个月' },
  { v: '6', t: '每 6 个月' },
];

function fmtDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onWallpaper: (w: Wallpaper) => void;
  onTheme: (t: 'light' | 'dark') => void;
  onPatch: (fn: (s: Settings) => Settings) => void;
  onClearHistory: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onReset: () => void;
  onManageEngines: () => void;
  onBackup: () => void;
  onNotify: (msg: string, err?: boolean) => void;
}

export function SettingsDrawer({
  open,
  onClose,
  settings,
  onWallpaper,
  onTheme,
  onPatch,
  onClearHistory,
  onExport,
  onImport,
  onReset,
  onManageEngines,
  onBackup,
  onNotify,
}: Props) {
  const [url, setUrl] = useState('');
  /* 版本号取自扩展清单，没拿到就回退到写死的兜底值 */
  const version = (chrome as any)?.runtime?.getManifest?.()?.version || '1.0.2';
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  /* 恢复默认要点两次：第一次只是把按钮变成确认态，4 秒无操作自动复原 */
  const [resetting, setResetting] = useState(false);
  /* 大图压缩要几百毫秒，给个处理中状态，避免以为点了没反应 */
  const [busy, setBusy] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const wp = settings.wallpaper;

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const askReset = () => {
    if (resetting) {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      setResetting(false);
      onReset();
      return;
    }
    setResetting(true);
    resetTimer.current = window.setTimeout(() => setResetting(false), 4000);
  };

  const onJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => onImport(String(rd.result));
    rd.onerror = () => onNotify('文件读取失败', true);
    rd.readAsText(f);
  };

  const pickPreset = (id: string) => {
    onWallpaper({ type: 'preset', value: id, light: isPresetLight(id) });
    onNotify(id === 'wp-white' ? '已切换到纯白背景' : '已切换壁纸');
  };

  /** 自定义图片：先按深色底显示，采样出亮度后再补一次（异步，防抖写入） */
  const applyImage = async (src: string, type: 'url' | 'local') => {
    onWallpaper({ type, value: src, light: false });
    const light = await autoLight(src);
    onWallpaper({ type, value: src, light });
    onNotify('已应用壁纸');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      // 压缩后再存：几 MB 的原图会撑爆 storage 配额，表现为「切了壁纸但刷新就回退」
      const src = await compressImage(f);
      await applyImage(src, 'local');
    } catch (err) {
      const msg = err instanceof Error && err.message === '图片过大' ? '图片过大，压缩后仍无法保存' : '图片处理失败，换一张试试';
      onNotify(msg, true);
    } finally {
      setBusy(false);
    }
  };

  const applyUrl = () => {
    const v = url.trim();
    if (!v) {
      onNotify('请输入图片地址', true);
      return;
    }
    void applyImage(v, 'url');
  };

  return (
    <aside className={'settings' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="s-head">
        <h2>设置</h2>
        <button className="settings-x" onClick={onClose} aria-label="关闭设置">
          <X size={16} />
        </button>
      </div>

      <div className="sec">
        <div className="t">外观</div>
        <div className="grp">
          <div className="row">
            <span className="lb">黑暗模式</span>
            <button
              className="sw"
              role="switch"
              aria-checked={settings.theme === 'dark'}
              aria-label="黑暗模式"
              onClick={() => {
                const next = settings.theme === 'dark' ? 'light' : 'dark';
                onTheme(next);
                onNotify(next === 'dark' ? '已开启黑暗模式' : '已关闭黑暗模式');
              }}
            />
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="t">搜索引擎</div>
        <div className="grp">
          <div className="row">
            <span className="lb">默认引擎</span>
            <select
              className="inp sel"
              value={settings.engine}
              onChange={(e) => onPatch((x) => ({ ...x, engine: e.target.value }))}
            >
              {settings.engines.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.n}
                </option>
              ))}
            </select>
          </div>
          <button className="sbtn" onClick={onManageEngines}>
            管理引擎（添加 / 排序 / 删除）
          </button>
        </div>
        <div className="note">搜索态按 Alt+1~9 可临时切换到列表里的前 9 个引擎。</div>
      </div>

      <div className="sec">
        <div className="t">时钟</div>
        <div className="grp">
          <div className="row">
            <span className="lb">时间制式</span>
            <div className="seg">
              <button aria-pressed={settings.h24} onClick={() => onPatch((x) => ({ ...x, h24: true }))}>
                24 小时
              </button>
              <button aria-pressed={!settings.h24} onClick={() => onPatch((x) => ({ ...x, h24: false }))}>
                12 小时
              </button>
            </div>
          </div>
          <div className="row">
            <span className="lb">显示秒钟</span>
            <button
              className="sw"
              role="switch"
              aria-checked={settings.sec}
              aria-label="显示秒钟"
              onClick={() => onPatch((x) => ({ ...x, sec: !x.sec }))}
            />
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="t">搜索历史</div>
        <div className="grp">
          <div className="row">
            <span className="lb">自动清除</span>
            <select
              className="inp sel"
              value={settings.clear}
              onChange={(e) => onPatch((x) => ({ ...x, clear: e.target.value as ClearSpan }))}
            >
              {CLEAR_TEXT.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.t}
                </option>
              ))}
            </select>
          </div>
          <button className="sbtn" onClick={onClearHistory}>
            立即清除历史记录
          </button>
        </div>
      </div>

      <div className="sec">
        <div className="t">壁纸</div>
        <div className="grp">
          <div className="wp-row">
            <div className="wps">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={'wp ' + p.id}
                  role="radio"
                  aria-checked={wp.type === 'preset' && wp.value === p.id}
                  aria-label={p.n}
                  style={
                    p.src
                      ? {
                          backgroundImage: `url("${p.src}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                  onClick={() => pickPreset(p.id)}
                />
              ))}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFile}
          />
          <button
            className="sbtn"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? '正在压缩图片…' : '上传本地图片'}
          </button>

          <div className="inp-row">
            <input
              className="inp"
              placeholder="或粘贴图片地址"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyUrl();
              }}
            />
            <button className="sbtn" onClick={applyUrl}>
              应用
            </button>
          </div>

          {wp.type !== 'preset' && (
            <button className="sbtn" onClick={() => pickPreset('wp-mountain')}>
              移除自定义壁纸
            </button>
          )}
        </div>
        <div className="note">本地图片会自动压缩到 2560px 内再存本地，原图多大都行。</div>
      </div>

      <div className="sec">
        <div className="t">数据与备份</div>
        <div className="grp">
          <button className="sbtn" onClick={onExport}>
            导出备份（JSON）
          </button>
          <input
            ref={jsonRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={onJsonFile}
          />
          <button className="sbtn" onClick={() => jsonRef.current?.click()}>
            导入备份
          </button>
          <button
            className={'sbtn danger' + (resetting ? ' danger-confirm' : '')}
            onClick={askReset}
          >
            {resetting ? '再点一次：确认恢复默认' : '恢复默认设置'}
          </button>
        </div>
        <div className="note">导入会整体替换当前数据；恢复默认会清空自定站点与历史，回到初始状态。</div>
      </div>

      <div className="sec">
        <div className="t">自动备份</div>
        <div className="grp">
          <div className="row">
            <span className="lb">自动备份</span>
            <select
              className="inp sel"
              value={settings.backupEvery}
              onChange={(e) =>
                onPatch((x) => ({ ...x, backupEvery: e.target.value as Settings['backupEvery'] }))
              }
            >
              {BACKUP_EVERY.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.t}
                </option>
              ))}
            </select>
          </div>
          <div className="row dir-row">
            <span className="lb">备份到（下载目录下的文件夹）</span>
            <input
              className="inp dir"
              value={settings.backupDir}
              placeholder="腾龙起始页"
              onChange={(e) => onPatch((x) => ({ ...x, backupDir: e.target.value }))}
            />
          </div>
          <button className="sbtn" onClick={onBackup}>
            立即备份{settings.backupLast ? `（上次 ${fmtDate(settings.backupLast)}）` : ''}
          </button>
        </div>
        <div className="note">
          浏览器扩展只能写入「下载」目录下的子文件夹。开启后，每隔所选周期打开起始页会自动备份一份。
        </div>
      </div>

      <div className="sec">
        <div className="t">关于</div>
        <div className="grp">
          <div className="row">
            <span className="lb">名称</span>
            <span className="val">腾龙起始页</span>
          </div>
          <div className="row">
            <span className="lb">版本</span>
            <span className="val">{version}</span>
          </div>
        </div>
        <div className="note">轻量起始页 · 数据全部存于本地，不收集任何个人信息。</div>
      </div>
    </aside>
  );
}
