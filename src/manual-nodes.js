// 手动优选节点的解析与规范化工具。
// 约定：一行一条“地址[:端口][#备注]”。
// - 地址支持 IPv4、域名和 IPv6，IPv6 可以写方括号，也可以不带方括号；
// - 不带方括号的 IPv6 末尾接 “:端口” 时按端口解析（2a0e:97c0:3f0:1::156b:443 就是
//   2a0e:97c0:3f0:1::156b 的 443 端口写法，两条算同一条）；末段是纯数字的地址请写方括号；
// - 省略端口时默认 443；
// - 端口为 443 时按规范省略不写；省略端口时 IPv6 同时去掉方括号（带其它端口时必须保留
//   方括号，否则 “地址:端口” 的冒号会和 IPv6 自身的冒号混淆）；
// - 省略备注也能识别；
// - 无法识别的行原样保留，由过滤流程统一按无效处理。
// 这些函数同时供服务端和 /admin-client.js 使用：管理页脚本通过函数源码注入，所以函数内部
// 只能引用这里声明的函数，不要引用模块作用域里的其它变量；也不要使用“变量 = 函数表达式”
// 这类写法（`const f = () => …`、对象字面量里的 `f: () => …` 等）。Cloudflare Pages 用
// esbuild 打包 _worker.js（keepNames 默认开启）时会把这些函数表达式改写成
// `__name(fn, "f")`，而注入页面的代码运行在页面作用域，那里没有 __name，调用时会直接抛
// `ReferenceError: __name is not defined`。需要辅助逻辑就写成顶层函数声明并加进 ADMIN_PREAMBLE。

// IPv6 字面量校验：支持 “::” 缩写、尾部 IPv4 混写（::ffff:1.2.3.4）和 zone id（fe80::1%eth0）。
function isIpv6Literal(value) {
  const text = String(value ?? "").trim();
  if (!text.includes(":")) return false;
  // 统一转成小写，让 ::FFFF:1.2.3.4 这类 IPv4 混写的大写写法也能识别。
  const address = (text.includes("%") ? text.slice(0, text.indexOf("%")) : text).toLowerCase();
  return /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/.test(address);
}

function isIpv4Literal(value) {
  const parts = String(value ?? "").trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

// 端口必须是 1-65535 的数字，顺便去掉前导零，避免同一条节点出现多种写法。
function normalizeManualPort(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 65535 ? String(number) : null;
}

// 解析一行手动优选条目：返回 { host, port, remark }（port 为字符串，缺失时补 443），无法识别返回 null。
function parseManualEntry(line) {
  const text = String(line ?? "").trim();
  if (!text) return null;
  const hashIndex = text.indexOf("#");
  const base = (hashIndex >= 0 ? text.slice(0, hashIndex) : text).trim();
  const remark = hashIndex >= 0 ? text.slice(hashIndex + 1).trim() : "";
  if (!base) return null;
  const defaultPort = "443";
  // 带方括号的地址（IPv6，同时兼容 [IPv4]）：方括号里是纯地址，端口写在方括号外。
  const bracketed = /^\[([^\]]+)\](?::(\d{1,5}))?$/.exec(base);
  if (bracketed) {
    const host = bracketed[1];
    if (!isIpv6Literal(host) && !isIpv4Literal(host)) return null;
    if (!bracketed[2]) return { host, port: defaultPort, remark };
    const port = normalizeManualPort(bracketed[2]);
    return port ? { host, port, remark } : null;
  }
  // 不带方括号的 IPv6：末尾接的 “:数字” 能当成端口、且前面的部分同样合法时按端口处理，
  // 这样用户直接粘贴的 2a0e:97c0:3f0:1::156b:443 与不带端口的 2a0e:97c0:3f0:1::156b 是同一条；
  // 代价是末段恰好是纯数字的地址必须写成 [地址]，否则会被当成长度为 1-65535 的端口。
  const barePort = /^(.+):(\d{1,5})$/.exec(base);
  if (barePort && isIpv6Literal(barePort[1])) {
    const port = normalizeManualPort(barePort[2]);
    if (port) return { host: barePort[1], port, remark };
  }
  // 整段是 IPv6 地址时只能使用默认端口 443；其它端口请写方括号。
  if (isIpv6Literal(base)) return { host: base, port: defaultPort, remark };
  const plain = /^([^:]+)(?::(\d{1,5}))?$/.exec(base);
  if (!plain) return null;
  const host = plain[1];
  if (!isIpv4Literal(host) && !/^[a-zA-Z0-9.-]+$/.test(host)) return null;
  if (!plain[2]) {
    // 只写地址（没有端口）时要求它像 IP 或域名，避免把无效文本当成节点。
    if (!isIpv4Literal(host) && !host.includes(".")) return null;
    return { host, port: defaultPort, remark };
  }
  const port = normalizeManualPort(plain[2]);
  return port ? { host, port, remark } : null;
}

// 规范写法（保存和“一键排序”使用）：省略 443 端口，省略端口时 IPv6 去掉方括号。
function formatManualEntry(entry) {
  const host = String(entry?.host ?? "");
  if (!host) return "";
  const remark = String(entry?.remark ?? "");
  const port = String(entry?.port || "443");
  const base = port === "443" ? host : (isIpv6Literal(host) ? `[${host}]:${port}` : `${host}:${port}`);
  return remark ? `${base}#${remark}` : base;
}

// 把一行整理成规范写法；解析不出的行去掉首尾空白后原样保留。
function canonicalizeManualNodeLine(line) {
  const entry = parseManualEntry(line);
  return entry ? formatManualEntry(entry) : String(line ?? "").trim();
}

// 内部和输出写法：始终带端口，IPv6 加方括号，保证下游按 “地址:端口” 解析。
function normalizeManualNodeLine(line) {
  const entry = parseManualEntry(line);
  if (!entry) return String(line ?? "").trim();
  const host = isIpv6Literal(entry.host) ? `[${entry.host}]` : entry.host;
  const base = `${host}:${entry.port || "443"}`;
  return entry.remark ? `${base}#${entry.remark}` : base;
}

// 复制筛选（管理页“只复制 IPv4 / IPv6”使用）：family 传 "ipv4"/"ipv6" 时只保留该地址族的条目，
// 输出整理成规范写法（保留非 443 端口和备注、省略 443 端口、省略端口时 IPv6 不带方括号），
// 所以 1.1.1.1 与 1.1.1.1:443、[::1]:443 与 ::1 这类写法相同的条目会合并，顺序保持原样。
function pickManualNodeLines(content, family) {
  const wantIpv6 = family === "ipv6";
  const seen = new Set();
  const picked = [];
  const lines = String(content ?? "").split(/\r?\n/);
  for (const line of lines) {
    const entry = parseManualEntry(line);
    if (!entry) continue;
    const ipv6 = isIpv6Literal(entry.host);
    if (wantIpv6 ? !ipv6 : (ipv6 || !isIpv4Literal(entry.host))) continue;
    const value = canonicalizeManualNodeLine(line);
    if (seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return picked;
}

// 把地址片段按 “:” 拆成非空分组（供 ipv6SortKey 使用）。
function splitIpv6Groups(part) {
  return part ? part.split(":").filter(Boolean) : [];
}

// IPv6 排序键：把地址展开成 8 组、每组 4 位十六进制的定长字符串（等同于 128 位数值），
// 这样按字符串比较就是按地址数值比较。支持 “::” 缩写、尾部 IPv4 混写和 zone id。
function ipv6SortKey(value) {
  const text = String(value ?? "").trim();
  if (!isIpv6Literal(text)) return null;
  const address = text.includes("%") ? text.slice(0, text.indexOf("%")) : text;
  const doubleIndex = address.indexOf("::");
  const head = doubleIndex >= 0 ? address.slice(0, doubleIndex) : address;
  const tail = doubleIndex >= 0 ? address.slice(doubleIndex + 2) : "";
  const headGroups = splitIpv6Groups(head);
  let tailGroups = splitIpv6Groups(tail);
  // 尾部 IPv4 混写（::ffff:1.2.3.4）换算成两组十六进制。
  if (tailGroups.length) {
    const last = tailGroups[tailGroups.length - 1];
    if (last.includes(".")) {
      const octets = last.split(".").map((item) => Number(item));
      if (octets.length !== 4 || octets.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) return null;
      tailGroups = tailGroups.slice(0, -1).concat([
        (((octets[0] << 8) | octets[1]) >>> 0).toString(16),
        (((octets[2] << 8) | octets[3]) >>> 0).toString(16),
      ]);
    }
  }
  const missing = 8 - headGroups.length - tailGroups.length;
  if (missing < 0) return null;
  const groups = doubleIndex >= 0
    ? headGroups.concat(new Array(missing).fill("0"), tailGroups)
    : headGroups.concat(tailGroups);
  if (groups.length !== 8) return null;
  return groups.map((group) => group.padStart(4, "0").toLowerCase()).join("");
}

// 地址类型分组：0 = IPv4、1 = IPv6、2 = 域名（三类分开排列用）。
function manualEntryFamily(host, ipv4) {
  return ipv4 ? 0 : (isIpv6Literal(host) ? 1 : 2);
}

// 排序：IPv4 按每段数值、IPv6 按 128 位地址数值、域名按自然顺序，再比较端口和备注；三类地址分开排列（IPv4 在前、IPv6 其次、域名最后）。
function compareManualEntries(left, right) {
  const aHost = String(left?.host ?? "");
  const bHost = String(right?.host ?? "");
  const aIpv4 = isIpv4Literal(aHost);
  const bIpv4 = isIpv4Literal(bHost);
  const aFamily = manualEntryFamily(aHost, aIpv4);
  const bFamily = manualEntryFamily(bHost, bIpv4);
  if (aFamily !== bFamily) return aFamily - bFamily;
  let hostDiff = 0;
  if (aIpv4 && bIpv4) {
    const aParts = aHost.split(".");
    const bParts = bHost.split(".");
    for (let index = 0; index < 4 && !hostDiff; index += 1) hostDiff = Number(aParts[index]) - Number(bParts[index]);
  } else if (aFamily === 1) {
    // IPv6 按地址数值比较（键是定长十六进制，退化成字符串比较即可，不依赖本地化规则）。
    const aKey = ipv6SortKey(aHost) || aHost.toLowerCase();
    const bKey = ipv6SortKey(bHost) || bHost.toLowerCase();
    if (aKey !== bKey) hostDiff = aKey < bKey ? -1 : 1;
  } else {
    hostDiff = aHost.localeCompare(bHost, "zh-CN", { numeric: true });
  }
  if (hostDiff) return hostDiff;
  const portDiff = (Number(left?.port) || 0) - (Number(right?.port) || 0);
  if (portDiff) return portDiff;
  return String(left?.remark ?? "").localeCompare(String(right?.remark ?? ""), "zh-CN");
}

export { canonicalizeManualNodeLine, compareManualEntries, formatManualEntry, ipv6SortKey, isIpv4Literal, isIpv6Literal, manualEntryFamily, normalizeManualNodeLine, normalizeManualPort, parseManualEntry, pickManualNodeLines, splitIpv6Groups };
