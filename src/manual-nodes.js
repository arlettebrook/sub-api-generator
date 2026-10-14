// 手动优选节点的解析与规范化工具。
// 约定：一行一条“地址[:端口][#备注]”。
// - 地址支持 IPv4、域名和 IPv6，IPv6 可以写方括号，也可以不带方括号；
// - 省略端口时默认 443；
// - 端口为 443 时按规范省略不写；省略端口时 IPv6 同时去掉方括号（带其它端口时必须保留
//   方括号，否则 “地址:端口” 的冒号会和 IPv6 自身的冒号混淆）；
// - 省略备注也能识别；
// - 无法识别的行原样保留，由过滤流程统一按无效处理。
// 这些函数同时供服务端和 /admin-client.js 使用：管理页脚本通过函数源码注入，所以函数内部
// 只能引用这里声明的函数，不要引用模块作用域里的其它变量。

// IPv6 字面量校验：支持 “::” 缩写、尾部 IPv4 混写（::ffff:1.2.3.4）和 zone id（fe80::1%eth0）。
function isIpv6Literal(value) {
  const text = String(value ?? "").trim();
  if (!text.includes(":")) return false;
  const address = text.includes("%") ? text.slice(0, text.indexOf("%")) : text;
  return /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/.test(address);
}

function isIpv4Literal(value) {
  const parts = String(value ?? "").trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
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
  // 端口必须是 1-65535 的数字，顺便去掉前导零，避免同一条节点出现多种写法。
  const normalizePort = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 65535 ? String(number) : null;
  };
  // 带方括号的地址（IPv6，同时兼容 [IPv4]）：方括号里是纯地址，端口写在方括号外。
  const bracketed = /^\[([^\]]+)\](?::(\d{1,5}))?$/.exec(base);
  if (bracketed) {
    const host = bracketed[1];
    if (!isIpv6Literal(host) && !isIpv4Literal(host)) return null;
    if (!bracketed[2]) return { host, port: defaultPort, remark };
    const port = normalizePort(bracketed[2]);
    return port ? { host, port, remark } : null;
  }
  // 不带方括号的 IPv6：整段都是地址，所以只能使用默认端口 443；其它端口请写方括号。
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
  const port = normalizePort(plain[2]);
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

// 排序：IPv4 按每段数值、IPv6 按大小写无关的地址字符串、域名按自然顺序，再比较端口和备注。
function compareManualEntries(left, right) {
  const aHost = String(left?.host ?? "");
  const bHost = String(right?.host ?? "");
  const aIpv4 = isIpv4Literal(aHost);
  const bIpv4 = isIpv4Literal(bHost);
  const family = (host, ipv4) => (ipv4 ? 0 : isIpv6Literal(host) ? 1 : 2);
  const aFamily = family(aHost, aIpv4);
  const bFamily = family(bHost, bIpv4);
  if (aFamily !== bFamily) return aFamily - bFamily;
  let hostDiff = 0;
  if (aIpv4 && bIpv4) {
    const aParts = aHost.split(".");
    const bParts = bHost.split(".");
    for (let index = 0; index < 4 && !hostDiff; index += 1) hostDiff = Number(aParts[index]) - Number(bParts[index]);
  } else if (aFamily === 1) {
    // IPv6 用大小写无关的码位比较，避免依赖运行环境的本地化排序规则。
    const aKey = aHost.toLowerCase();
    const bKey = bHost.toLowerCase();
    if (aKey !== bKey) hostDiff = aKey < bKey ? -1 : 1;
  } else {
    hostDiff = aHost.localeCompare(bHost, "zh-CN", { numeric: true });
  }
  if (hostDiff) return hostDiff;
  const portDiff = (Number(left?.port) || 0) - (Number(right?.port) || 0);
  if (portDiff) return portDiff;
  return String(left?.remark ?? "").localeCompare(String(right?.remark ?? ""), "zh-CN");
}

export { canonicalizeManualNodeLine, compareManualEntries, formatManualEntry, isIpv4Literal, isIpv6Literal, normalizeManualNodeLine, parseManualEntry };
