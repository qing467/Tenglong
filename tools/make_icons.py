"""生成 NanoTab 扩展图标（纯标准库，无需 PIL）。

设计：圆角方形绿底 + 白色 N。
使用 4x 超采样后降采样，得到平滑边缘。
"""

import os
import struct
import zlib

GREEN_TOP = (154, 209, 74)
GREEN_BOTTOM = (108, 165, 44)
WHITE = (255, 255, 255)
SS = 4  # 超采样倍数


def dist_to_seg(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return ((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2) ** 0.5


def render(size):
    n = size * SS
    pad = n * 0.25  # N 的外边距
    r = n * 0.22  # 圆角半径
    stroke = n * 0.095  # N 的线宽
    x1, x2 = pad, n - pad
    y0, y1 = pad, n - pad

    pixels = [[(0, 0, 0, 0)] * n for _ in range(n)]

    for y in range(n):
        for x in range(n):
            # 圆角矩形：先判断四角圆
            cx = min(max(x, r), n - r)
            cy = min(max(y, r), n - r)
            inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r
            if not inside:
                continue
            # 竖向渐变
            k = y / max(1, n - 1)
            bg = tuple(
                int(GREEN_TOP[i] + (GREEN_BOTTOM[i] - GREEN_TOP[i]) * k) for i in range(3)
            )
            # 白色 N：左竖 + 斜线 + 右竖
            d = min(
                dist_to_seg(x, y, x1, y0, x1, y1),
                dist_to_seg(x, y, x1, y0, x2, y1),
                dist_to_seg(x, y, x2, y0, x2, y1),
            )
            if d <= stroke / 2:
                pixels[y][x] = WHITE + (255,)
            else:
                # 边缘 1px 抗锯齿（超采样后会被平均）
                a = 255 if d > stroke / 2 + SS else int(255 * (1 - (d - stroke / 2) / SS))
                pixels[y][x] = bg + (max(0, min(255, a)),)

    # 降采样
    out = []
    for y in range(size):
        row = []
        for x in range(size):
            rs = gs = bs = as_ = 0
            for dy in range(SS):
                for dx in range(SS):
                    r0, g0, b0, a0 = pixels[y * SS + dy][x * SS + dx]
                    rs += r0 * a0
                    gs += g0 * a0
                    bs += b0 * a0
                    as_ += a0
            if as_ == 0:
                row.append((0, 0, 0, 0))
            else:
                row.append((rs // as_, gs // as_, bs // as_, as_ // (SS * SS)))
        out.append(row)
    return out


def write_png(path, size, rows):
    raw = b"".join(
        b"\x00" + b"".join(struct.pack("BBBB", *px) for px in rows[y]) for y in range(size)
    )

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "nanotab", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (16, 32, 48, 128):
        path = os.path.join(out_dir, "icon%d.png" % size)
        write_png(path, size, render(size))
        print("wrote", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
