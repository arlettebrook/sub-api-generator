import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { adminClientScript } from "../src/admin-client.js";

// 管理页脚本是把函数源码（Function.prototype.toString()）拼进页面执行的：字符串内容不会经过
// 打包器，但函数源码会。Cloudflare Pages/wrangler 用 esbuild 打包 _worker.js（keepNames 默认
// 开启）时，函数表达式会被改写成 __name(fn, "name")，页面作用域里没有 __name，注入的代码一旦
// 引用它就会抛 ReferenceError: __name is not defined（线上表现为手动优选列表加载失败）。
const MAIN_BODY_MARKER = "// ======================== 全局缓存与工具 ========================";
const preamble = adminClientScript.slice(0, adminClientScript.indexOf(MAIN_BODY_MARKER));

const FUNCTION_EXPRESSION_ASSIGN = /(?:const|let|var)\s+[\w$]+\s*=\s*(?:function\b|(?:\([^()]*\)|[\w$]+)\s*=>)/;
const FUNCTION_EXPRESSION_PROPERTY = /[\w$"']+\s*:\s*(?:function\b|(?:\([^()]*\)|[\w$]+)\s*=>)/;

// 注入的函数源码（顶层函数声明）逐段取出。
function injectedFunctionChunks(script) {
  return script
    .split(/\n(?=function\s+[\w$]+\s*\()/)
    .filter((chunk) => /^function\s+[\w$]+\s*\(/.test(chunk));
}

test("injected function sources survive esbuild keepNames rewriting", () => {
  const chunks = injectedFunctionChunks(preamble);
  assert.ok(chunks.length >= 9, `expected the injected helpers, got ${chunks.length}`);
  for (const chunk of chunks) {
    const name = /^function\s+([\w$]+)/.exec(chunk)[1];
    assert.ok(
      !FUNCTION_EXPRESSION_ASSIGN.test(chunk),
      `注入的函数 ${name} 里有“变量 = 函数表达式”，esbuild keepNames 会包成 __name(fn, "...")，页面里没有 __name；请改成顶层函数声明并加进 ADMIN_PREAMBLE`,
    );
    assert.ok(
      !FUNCTION_EXPRESSION_PROPERTY.test(chunk),
      `注入的函数 ${name} 的对象字面量里有函数表达式，同样会被 keepNames 改写成 __name(fn, "...")；请改成顶层函数声明`,
    );
  }
});

test("injected preamble works in a page-like scope without module bindings", () => {
  const context = vm.createContext({});
  vm.runInContext(
    `${preamble}\nglobalThis.__injected = { parseManualEntry, formatManualEntry, canonicalizeManualNodeLine, compareManualEntries, ipv6SortKey, isIpv4Literal, isIpv6Literal, pickManualNodeLines, matchRemarkRules };`,
    context,
  );
  const injected = context.__injected;
  assert.ok(injected, "preamble should define the injected helpers");
  // 无方括号 IPv6 + 末尾端口与省略端口写法等价（默认 443，443 省略）。
  assert.equal(JSON.stringify(injected.parseManualEntry("2a0e:97c0:3f0:1::156b:443")), JSON.stringify({ host: "2a0e:97c0:3f0:1::156b", port: "443", remark: "" }));
  assert.equal(JSON.stringify(injected.parseManualEntry("2a0e:97c0:3f0:1::156b")), JSON.stringify({ host: "2a0e:97c0:3f0:1::156b", port: "443", remark: "" }));
  assert.equal(injected.canonicalizeManualNodeLine("[2a0e:97c0:3f0:1::156b]:443#备注"), "2a0e:97c0:3f0:1::156b#备注");
  assert.equal(injected.formatManualEntry({ host: "::1", port: "8443", remark: "" }), "[::1]:8443");
  assert.equal(injected.ipv6SortKey("::1"), "00000000000000000000000000000001");
  // IPv4 排在 IPv6 前、IPv6 排在域名前，组内再按地址排序。
  assert.ok(injected.compareManualEntries({ host: "::1" }, { host: "1.1.1.1" }) > 0);
  assert.ok(injected.compareManualEntries({ host: "example.com" }, { host: "::1" }) > 0);
  assert.ok(injected.compareManualEntries({ host: "2a0e:97c0:3f0:1::156b" }, { host: "2a0e:97c0:3f0:1::156a" }) > 0);
  // 只复制 IPv4 / IPv6：按地址族筛选（域名和无效行不会混进来），输出整理成规范写法——
  // 保留非 443 端口和备注、省略 443 端口，所以 1.1.1.1 与 1.1.1.1:443 这类写法会自动去重。
  const copySamples = ["1.1.1.1", "[::1]:8443#v6", "example.com", "1.1.1.1:443", "::1", "not a node"].join("\n");
  assert.equal(injected.pickManualNodeLines(copySamples, "ipv4").join("|"), "1.1.1.1");
  assert.equal(injected.pickManualNodeLines(copySamples, "ipv6").join("|"), "[::1]:8443#v6|::1");
  const copyPorts = "104.156.239.15:443#美国\n2a0e:97c0:3f0:1::156b:8443#备用";
  assert.equal(injected.pickManualNodeLines(copyPorts, "ipv4").join("|"), "104.156.239.15#美国");
  assert.equal(injected.pickManualNodeLines(copyPorts, "ipv6").join("|"), "[2a0e:97c0:3f0:1::156b]:8443#备用");
  // 备注规则（含符号分支，走 REMARK_SYMBOL_REGEX）也要能在页面作用域里独立运行。
  assert.equal(JSON.stringify(injected.matchRemarkRules("速度%20不错", ["空格"])), JSON.stringify({ remark: "速度", rule: "空格", original: "速度 不错" }));
  assert.equal(JSON.stringify(injected.matchRemarkRules("测试🙂", ["符号"])), JSON.stringify({ remark: "测试", rule: "符号", original: "测试🙂" }));
});
