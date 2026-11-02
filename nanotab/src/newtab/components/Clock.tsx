import { useEffect, useState } from 'react';

interface Props {
  h24: boolean;
  sec: boolean;
}

function fmt(d: Date, h24: boolean, sec: boolean) {
  let h = d.getHours();
  let ap = '';
  if (!h24) {
    ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  }
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return { t: p(h) + ':' + p(d.getMinutes()) + (sec ? ':' + p(d.getSeconds()) : ''), ap };
}

/**
 * 时钟：① 对齐秒边界，不累积漂移；② 文本未变化不更新 state（每秒省一次重排）；
 * ③ 标签页回到前台立即校正（后台定时器会被浏览器节流到分钟级）。
 */
export function Clock({ h24, sec }: Props) {
  const [v, setV] = useState(() => fmt(new Date(), h24, sec));

  useEffect(() => {
    let timer = 0;
    const loop = () => {
      const next = fmt(new Date(), h24, sec);
      setV((prev) => (prev.t === next.t && prev.ap === next.ap ? prev : next));
      timer = window.setTimeout(loop, 1000 - (Date.now() % 1000));
    };
    loop();
    const onVis = () => {
      if (!document.hidden) setV(fmt(new Date(), h24, sec));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [h24, sec]);

  return (
    <div className="clock">
      {v.t}
      {v.ap && <span className="clock-ap">{v.ap}</span>}
    </div>
  );
}
