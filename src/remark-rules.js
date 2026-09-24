// 备注过滤规则的唯一实现：后端过滤与管理端“试一条备注”预览共用同一份逻辑。
// 该函数会被序列化后注入管理端脚本，因此只能用普通字符串拼接、正则字面量和
// 标准内置对象，不要引用模块外的变量（符号规则的正则另行注入）。
export const REMARK_SYMBOL_REGEX = /[\p{So}\uFE0F]+/gu;

// 判定备注命中规则并返回清理结果：
// 文本/空格规则在最早命中的位置截断，“符号”规则移除 emoji、旗帜和商标符号。
export function matchRemarkRules(value, filterRules = []) {
  let remark = String(value ?? "");
  if (remark.includes("%")) {
    try { remark = decodeURIComponent(remark); } catch { /* 保留原始文本 */ }
  }
  const original = remark;
  const hits = [];
  let cutIndex = -1;
  let cutRule = "";
  for (const rule of filterRules) {
    if (rule === "符号") continue;
    const index = rule === "空格" ? remark.search(/\s/u) : remark.toLowerCase().indexOf(rule.toLowerCase());
    if (index >= 0 && (cutIndex < 0 || index < cutIndex)) { cutIndex = index; cutRule = rule; }
  }
  if (cutIndex >= 0) {
    hits.push(cutRule);
    remark = remark.slice(0, cutIndex);
  }
  if (filterRules.includes("符号")) {
    const stripped = remark.replace(REMARK_SYMBOL_REGEX, "");
    if (stripped !== remark) hits.push("符号");
    remark = stripped;
  }
  return { remark: remark.trim(), rule: hits.join("、"), original };
}
