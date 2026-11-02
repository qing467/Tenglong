import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf-8')).version;
const name = `nanotab-v${version}.zip`;

/*
 * Windows 10+ 自带 bsdtar，`-a` 按扩展名自动选 zip。
 * 注意用 `*` 而不是 `.`：`-C dist .` 会把条目写成 `./manifest.json`，
 * Chrome 应用商店会判定「找不到 manifest.json」；普通文件列表才是干净的根路径。
 */
execSync(`tar -a -c -f ${name} -C dist *`, { stdio: 'inherit' });
console.log(`\n已打包：${name}`);
