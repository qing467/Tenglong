import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, FolderInput, Settings, Upload } from 'lucide-react';
import '../styles/global.css';
import { STORAGE_KEY, exportJson, parseBackup } from '../lib/storage';

const version = chrome.runtime.getManifest().version;

function App() {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** 页面内提示：popup 里 alert/confirm 可能失效，一律自己渲染 */
  const say = (m: string, e = false) => {
    setMsg(m);
    setErr(e);
    window.setTimeout(() => setMsg(''), 2200);
  };

  const openSettings = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html?settings=1') });
    window.close();
  };

  const doExport = async () => {
    try {
      const got = await chrome.storage.local.get(STORAGE_KEY);
      if (!got[STORAGE_KEY]) return say('还没有数据，先打开一次起始页', true);
      const text = exportJson(got[STORAGE_KEY]);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = '腾龙起始页-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      say('已导出备份');
    } catch {
      say('导出失败', true);
    }
  };

  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      const data = parseBackup(text);
      if (!data) return say('文件格式不对', true);
      await chrome.storage.local.set({ [STORAGE_KEY]: data });
      say('已导入备份，新标签页已更新');
    } catch {
      say('导入失败', true);
    }
  };

  return (
    <div className="popup-body">
      <div className="pp-head">
        <div>
          <h1 className="pp-title">腾龙起始页</h1>
          <div className="pp-ver">v{version} · 纯本地，断网可用</div>
        </div>
        <Settings size={18} className="pp-logo" />
      </div>

      <button className="sbtn" onClick={openSettings}>
        <Settings size={15} />
        打开起始页设置
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={doImport}
      />

      <div className="pp-row">
        <button className="sbtn" onClick={() => void doExport()}>
          <Download size={15} />
          导出备份
        </button>
        <button className="sbtn" onClick={() => fileRef.current?.click()}>
          <Upload size={15} />
          导入备份
        </button>
      </div>

      <div className="note">
        备份包含设置、捷径坞与搜索历史。导入会整体替换现有数据，建议先导出一份。
      </div>

      {msg && <div className={'pp-msg' + (err ? ' err' : '')}>{msg}</div>}
      <div className="pp-foot">
        <FolderInput size={13} />
        <span>右键起始页空白处 → 捷径坞</span>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
