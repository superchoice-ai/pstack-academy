import { STATUSES, STATUS_LABELS } from "./constants";

const LABELS_JSON = JSON.stringify(STATUS_LABELS).replaceAll("<", "\\u003c");
const STATUSES_JSON = JSON.stringify(STATUSES);

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #f3ecdf;
    color: #1d1914;
    font-family: "Noto Sans Thai", Garuda, "Leelawadee UI", "Sukhumvit Set", Thonburi, Palatino, "Iowan Old Style", sans-serif;
    line-height: 1.45;
  }
  a { color: #1c6b4a; }
  header, main, footer { padding-left: 20px; padding-right: 20px; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-top: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #d9cbb6;
  }
  .brand { display: flex; gap: 12px; align-items: center; }
  .mark {
    width: 42px; height: 42px; display: grid; place-items: center;
    background: #1c6b4a; color: #f6f1e7; font-weight: 700;
  }
  .brand strong { display: block; letter-spacing: 0.04em; }
  .brand span, .meta, footer { color: #6d645b; }
  main { max-width: 1100px; margin: 0 auto; padding-top: 18px; padding-bottom: 48px; }
  footer { padding-bottom: 28px; display: flex; gap: 16px; flex-wrap: wrap; }
  input, select, textarea, button { font: inherit; color: inherit; }
  input, select, textarea {
    width: 100%; padding: 10px 12px; border: 1px solid #d9cbb6; background: #fffaf3;
  }
  textarea { min-height: 88px; resize: vertical; }
  button { min-height: 44px; padding: 0 14px; cursor: pointer; }
  button.primary { background: #1d1914; color: #f6f1e7; border: 1px solid #1d1914; }
  button.ghost { background: transparent; border: 1px solid #1d1914; }
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid #1c6b4a; outline-offset: 2px;
  }
  .login-card, .card, .stat, .lead, .stage {
    background: #fffaf3; border: 1px solid #e4d7c4;
  }
  .login-card { max-width: 440px; margin: 7vh auto; padding: 24px; }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .stat { padding: 14px; }
  .stat b { display: block; font-size: 1.8rem; font-variant-numeric: tabular-nums; }
  .funnel { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0 8px; }
  .stage { flex: 0 0 auto; min-width: 96px; text-align: left; padding: 8px; cursor: pointer; }
  .stage b { display: block; font-size: 1.25rem; font-variant-numeric: tabular-nums; }
  .stage[aria-pressed="true"] { outline: 2px solid #1d1914; }
  .stage[data-status="won"] { background: #e7f5ee; }
  .stage[data-status="lost"], .stage[data-status="opted_out"], .stage[data-status="bounced"] { background: #f8e8e4; }
  .toolbar { display: flex; gap: 8px; align-items: center; }
  .toolbar label {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  .toolbar input { flex: 1 1 auto; width: auto; min-width: 0; }
  .lead { border-left: 4px solid #1c6b4a; padding: 14px; margin-top: 10px; }
  .lead[data-status="replied"], .lead[data-status="talking"], .lead[data-status="proposal"] { border-left-color: #8a5a12; }
  .lead[data-status="lost"], .lead[data-status="opted_out"], .lead[data-status="bounced"] { border-left-color: #8d2f2f; }
  .lead-main {
    width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px;
    text-align: left; background: transparent; border: 0; padding: 0; min-height: 0;
  }
  .lead h3, .lead-main span { margin: 0; overflow-wrap: anywhere; }
  .lead h3 { font-size: 1.05rem; }
  .score { font-variant-numeric: tabular-nums; font-size: 1.2rem; }
  .status {
    justify-self: start; padding: 2px 8px; border: 1px solid #d9cbb6; background: #f3ecdf;
  }
  .detail { display: grid; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e4d7c4; }
  .grid-2 { display: grid; gap: 10px; }
  .touch { padding-bottom: 8px; border-bottom: 1px solid #f0e6d6; }
  .error { color: #8d2f2f; min-height: 1.2em; }
  .banner { background: #f8e8e4; padding: 8px 10px; }
  .pager { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
  .unsub { max-width: 560px; margin: 10vh auto; padding: 28px 24px; background: #fffaf3; border: 1px solid #e4d7c4; }
  .unsub h1 { margin-top: 0; }
  @media (min-width: 800px) {
    .lead-main { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.1fr) auto auto; align-items: center; }
    .grid-2 { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 700px) {
    .stats { grid-template-columns: 1fr; }
    .lead-main {
      grid-template-columns: minmax(0, 1fr) auto auto;
      grid-template-areas: "title score status" "email email email";
    }
    .lead-main > div { grid-area: title; }
    .lead-main .meta { grid-area: email; }
    .lead-main .score { grid-area: score; }
    .lead-main .status { grid-area: status; align-self: center; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function dashboardPage(): string {
  return shell(
    "ไปป์ไลน์ลูกค้า · SuperChoice",
    `<header>
  <div class="brand"><div class="mark">SC</div><div><strong>SuperChoice</strong><span>ไปป์ไลน์ลูกค้า</span></div></div>
  <button class="ghost" id="logout" type="button" hidden>ออกจากระบบ</button>
</header>
<main>
  <section class="login-card" id="login">
    <h1>เข้าสู่ระบบ</h1>
    <p>ใส่ <strong>LEADS_API_TOKEN</strong> โทเค็นอยู่แค่ในแท็บนี้ ใช้ดูลีด บันทึกสถานะ และคัดลอกลิงก์ยกเลิกรับอีเมล</p>
    <form id="login-form">
      <label for="token">โทเค็น</label>
      <input id="token" name="token" type="password" autocomplete="current-password" spellcheck="false" required>
      <p class="error" id="login-error" role="alert"></p>
      <button class="primary" type="submit">เข้าสู่ระบบ</button>
    </form>
  </section>
  <section id="app" hidden>
    <p>บันทึกธุรกิจที่ผู้ช่วยค้นคว้าและอีเมลที่ส่งจาก superchoice@hotmail.com</p>
    <div class="stats" id="stats"></div>
    <div class="funnel" id="funnel"></div>
    <div class="toolbar">
      <label class="meta" for="q">ค้นหา</label>
      <input id="q" type="search" placeholder="ชื่อธุรกิจ อีเมล โดเมน LINE หรือเบอร์" maxlength="200">
      <button class="ghost" id="refresh" type="button">รีเฟรช</button>
    </div>
    <p class="error" id="app-error" role="alert"></p>
    <p class="meta" id="meta"></p>
    <div id="list"></div>
    <div class="pager">
      <button class="ghost" id="prev" type="button">ก่อนหน้า</button>
      <button class="ghost" id="next" type="button">ถัดไป</button>
    </div>
  </section>
  <noscript><p>แดชบอร์ดนี้ต้องใช้จาวาสคริปต์</p></noscript>
</main>
<footer>
  <a href="https://lin.ee/wNUnj5c">LINE OA</a>
  <a href="mailto:superchoice@hotmail.com">superchoice@hotmail.com</a>
</footer>
<script>
const LABELS = ${LABELS_JSON};
const STATUSES = ${STATUSES_JSON};
const KEY = "sc-leads-token";
const limit = 50;
let token = sessionStorage.getItem(KEY) || "";
let statusFilter = "";
let offset = 0;
let total = 0;
let query = "";

const login = document.getElementById("login");
const app = document.getElementById("app");
const logout = document.getElementById("logout");
const loginError = document.getElementById("login-error");
const appError = document.getElementById("app-error");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function percent(value) {
  if (value == null) return "—";
  return (value * 100).toLocaleString("th-TH", { maximumFractionDigits: 1 }) + "%";
}
function when(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function showLogin(message) {
  token = "";
  sessionStorage.removeItem(KEY);
  app.hidden = true;
  logout.hidden = true;
  login.hidden = false;
  loginError.textContent = message || "";
}
async function api(path, options) {
  const response = await fetch(path, {
    method: options && options.method ? options.method : "GET",
    body: options && options.body ? JSON.stringify(options.body) : undefined,
    headers: { authorization: "Bearer " + token, "content-type": "application/json" }
  });
  let body = {};
  try { body = await response.json(); } catch (error) { body = {}; }
  if (response.status === 401) { showLogin("โทเค็นไม่ถูกต้อง"); throw new Error("unauthorized"); }
  if (response.status === 503) { showLogin("ยังไม่ได้ตั้งค่า LEADS_API_TOKEN หรือ LEADS_UNSUBSCRIBE_SECRET"); throw new Error("not_configured"); }
  if (!response.ok) {
    const err = new Error(body.error || "request_failed");
    err.code = body.error || "request_failed";
    throw err;
  }
  return body;
}
function safeLink(url) {
  if (typeof url !== "string" || !/^https?:\\/\\//i.test(url)) return null;
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.rel = "noreferrer";
  link.target = "_blank";
  return link;
}
function renderStats(data) {
  const stats = document.getElementById("stats");
  stats.replaceChildren();
  const tiles = [
    ["ส่งออกวันนี้", String(data.today.sends), data.today.date + " เวลาไทย"],
    ["ตอบกลับวันนี้", String(data.today.replies), "อัตราวันนี้ " + percent(data.today.reply_rate)],
    ["อัตราตอบกลับ", percent(data.totals.reply_rate), "ตลอดรายการ " + data.totals.outbound + " ส่ง / " + data.totals.inbound + " ตอบ"]
  ];
  tiles.forEach(function (tile) {
    const card = el("article", "stat");
    card.append(el("span", "meta", tile[0]), el("b", "", tile[1]), el("span", "meta", tile[2]));
    stats.append(card);
  });
  const funnel = document.getElementById("funnel");
  funnel.replaceChildren();
  STATUSES.forEach(function (status) {
    const button = el("button", "stage", "");
    button.type = "button";
    button.dataset.status = status;
    button.setAttribute("aria-pressed", statusFilter === status ? "true" : "false");
    button.append(el("b", "", String(data.funnel[status] || 0)), el("span", "", LABELS[status]));
    button.addEventListener("click", function () {
      statusFilter = statusFilter === status ? "" : status;
      offset = 0;
      load().catch(function (error) { appError.textContent = error.message; });
    });
    funnel.append(button);
  });
}
function leadArticle(lead) {
  const article = el("article", "lead");
  article.dataset.status = lead.status;
  const main = el("button", "lead-main");
  main.type = "button";
  const title = el("div");
  title.append(el("h3", "", lead.business_name), el("p", "meta", [lead.industry, lead.domain].filter(Boolean).join(" · ")));
  main.append(title, el("span", "meta", lead.email || "ไม่มีอีเมล"), el("span", "score", String(lead.fit_score)), el("span", "status", LABELS[lead.status] || lead.status));
  const detail = el("div", "detail");
  detail.hidden = true;
  main.addEventListener("click", function () {
    const open = detail.hidden;
    detail.hidden = !open;
    if (open && !detail.dataset.loaded) fillDetail(detail, lead, article);
  });
  article.append(main, detail);
  return article;
}
function line(label, value) {
  const row = el("p", "meta");
  row.append(el("span", "", label + ": "));
  if (value) row.append(value); else row.append(el("span", "", "—"));
  return row;
}
async function fillDetail(detail, lead, article) {
  detail.dataset.loaded = "1";
  detail.append(el("p", "", "กำลังโหลดประวัติ…"));
  try {
    const data = await api("/api/leads/" + lead.id);
    detail.replaceChildren();
    if (data.suppressed) detail.append(el("p", "banner", "อีเมลหรือโดเมนนี้อยู่ในรายการยกเลิกรับ ระบบจะไม่ให้บันทึกการส่งออก"));
    const info = el("div");
    info.append(
      line("โทร", document.createTextNode(data.lead.phone || "—")),
      line("LINE", document.createTextNode(data.lead.line_id || "—")),
      line("เว็บ", safeLink(data.lead.website) || document.createTextNode("—")),
      line("ที่มา", safeLink(data.lead.source_url) || document.createTextNode("—")),
      line("โดเมน", document.createTextNode(data.lead.domain || "—"))
    );
    const statusLabel = el("label", "", "สถานะ");
    statusLabel.htmlFor = "status-" + lead.id;
    const select = document.createElement("select");
    select.id = "status-" + lead.id;
    STATUSES.forEach(function (status) {
      const option = el("option", "", LABELS[status]);
      option.value = status;
      if (status === data.lead.status) option.selected = true;
      select.append(option);
    });
    const noteLabel = el("label", "", "โน้ต");
    const notes = document.createElement("textarea");
    notes.value = data.lead.notes || "";
    const painLabel = el("label", "", "จุดเจ็บของเจ้าของ");
    const pain = document.createElement("textarea");
    pain.value = data.lead.pain_point || "";
    const save = el("button", "primary", "บันทึกโน้ต");
    save.type = "button";
    const saved = el("span", "meta", "");
    select.addEventListener("change", async function () {
      if (select.value === "opted_out" && !confirm("บันทึกว่ายกเลิกรับข่าว? ระบบจะไม่ส่งอีเมลหาอีเมลนี้และโดเมนบริษัทนี้อีก")) {
        select.value = data.lead.status;
        return;
      }
      try {
        const updated = await api("/api/leads/" + lead.id, { method: "PATCH", body: { status: select.value } });
        data.lead.status = updated.lead.status;
        article.dataset.status = updated.lead.status;
        article.querySelector(".status").textContent = LABELS[updated.lead.status];
        saved.textContent = "บันทึกสถานะแล้ว";
        loadStats().catch(function () {});
      } catch (error) {
        saved.textContent = "บันทึกไม่สำเร็จ";
        select.value = data.lead.status;
      }
    });
    save.addEventListener("click", async function () {
      try {
        const updated = await api("/api/leads/" + lead.id, { method: "PATCH", body: { notes: notes.value, pain_point: pain.value } });
        data.lead.notes = updated.lead.notes;
        data.lead.pain_point = updated.lead.pain_point;
        saved.textContent = "บันทึกโน้ตแล้ว";
      } catch (error) {
        saved.textContent = "บันทึกไม่สำเร็จ";
      }
    });
    const copy = el("button", "ghost", "คัดลอกลิงก์ยกเลิกรับอีเมล");
    copy.type = "button";
    copy.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(data.lead.unsubscribe_url);
        saved.textContent = "คัดลอกลิงก์แล้ว";
      } catch (error) {
        saved.textContent = data.lead.unsubscribe_url;
      }
    });
    const history = el("div", "touches");
    history.append(el("h4", "", "ประวัติการติดต่อ"));
    if (!data.touches.length) history.append(el("p", "meta", "ยังไม่มีการติดต่อ"));
    data.touches.forEach(function (touch) {
      const block = el("div", "touch");
      const way = (touch.channel === "line" ? "LINE" : "อีเมล") + " · " + (touch.direction === "inbound" ? "ตอบเข้า" : "ส่งออก");
      block.append(el("p", "meta", when(touch.sent_at) + " · " + way));
      if (touch.subject) block.append(el("p", "", touch.subject));
      if (touch.summary) block.append(el("p", "", touch.summary));
      history.append(block);
    });
    detail.append(info, statusLabel, select, painLabel, pain, noteLabel, notes, save, copy, saved, history);
  } catch (error) {
    if (error.message === "unauthorized" || error.message === "not_configured") return;
    detail.replaceChildren(el("p", "error", "โหลดประวัติไม่สำเร็จ"));
  }
}
async function loadStats() {
  renderStats(await api("/api/stats"));
}
async function loadList() {
  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const data = await api("/api/leads?" + params.toString());
  total = data.total;
  const list = document.getElementById("list");
  list.replaceChildren();
  if (!data.leads.length) list.append(el("p", "", "ไม่พบลีด"));
  data.leads.forEach(function (lead) { list.append(leadArticle(lead)); });
  document.getElementById("meta").textContent = "แสดง " + data.leads.length + " จาก " + data.total + (statusFilter ? " · " + LABELS[statusFilter] : "");
  document.getElementById("prev").disabled = offset <= 0;
  document.getElementById("next").disabled = offset + limit >= total;
}
async function load() {
  appError.textContent = "";
  await loadStats();
  await loadList();
  login.hidden = true;
  app.hidden = false;
  logout.hidden = false;
}
document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();
  token = document.getElementById("token").value.trim();
  if (!token) return;
  sessionStorage.setItem(KEY, token);
  load().catch(function () {});
});
logout.addEventListener("click", function () { showLogin(""); });
document.getElementById("refresh").addEventListener("click", function () { load().catch(function (error) { appError.textContent = error.message; }); });
let timer = 0;
document.getElementById("q").addEventListener("input", function (event) {
  query = event.target.value.trim().toLowerCase();
  offset = 0;
  clearTimeout(timer);
  timer = setTimeout(function () { loadList().catch(function (error) { appError.textContent = error.message; }); }, 250);
});
document.getElementById("prev").addEventListener("click", function () {
  offset = Math.max(0, offset - limit);
  loadList().catch(function (error) { appError.textContent = error.message; });
});
document.getElementById("next").addEventListener("click", function () {
  if (offset + limit >= total) return;
  offset += limit;
  loadList().catch(function (error) { appError.textContent = error.message; });
});
if (token) load().catch(function () {});
</script>`,
  );
}

export function unsubscribePage(kind: "ok" | "invalid" | "missing" | "unavailable"): string {
  const blocks = {
    ok: `<h1>ยกเลิกการรับอีเมลแล้ว</h1>
<p>เราจะไม่ส่งอีเมลเกี่ยวกับบริการของ SuperChoice ไปที่อีเมลนี้อีก</p>
<h2>You are unsubscribed</h2>
<p>We will not email you about SuperChoice services again.</p>`,
    invalid: `<h1>ลิงก์ไม่ถูกต้อง</h1>
<p>ลิงก์ยกเลิกรับอีเมลนี้ใช้ไม่ได้ ตอบกลับอีเมลนั้น หรือทัก LINE แล้วบอกว่าไม่ต้องการรับอีเมล</p>
<h2>This unsubscribe link is invalid</h2>
<p>Reply to the email or message us on LINE and we will remove you.</p>`,
    missing: `<h1>ไม่พบรายชื่อนี้</h1>
<p>ลิงก์นี้ลงนามถูกต้อง แต่ไม่มีรายชื่อในระบบแล้ว หากยังได้รับอีเมล ตอบกลับหรือทัก LINE</p>
<h2>This contact was not found</h2>
<p>If you still receive email, reply to it or message us on LINE.</p>`,
    unavailable: `<h1>ระบบยังไม่พร้อม</h1>
<p>ยังบันทึกการยกเลิกไม่ได้ในขณะนี้ ตอบกลับอีเมลหรือทัก LINE เพื่อขอให้หยุดส่ง</p>
<h2>Unsubscribe is temporarily unavailable</h2>
<p>Reply to the email or message us on LINE and we will stop.</p>`,
  } as const;
  return shell(
    "ยกเลิกการรับอีเมล · SuperChoice",
    `<main><article class="unsub">${blocks[kind]}
<p><a href="https://lin.ee/wNUnj5c">LINE</a> · <a href="mailto:superchoice@hotmail.com">superchoice@hotmail.com</a></p>
</article></main>`,
  );
}
