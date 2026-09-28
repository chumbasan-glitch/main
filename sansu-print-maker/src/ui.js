/* ================= 画面 ================= */
const $ = id => document.getElementById(id);
const LEVEL_NAMES = {0:"きほん", 1:"ふつう", 2:"チャレンジ", mix:"まぜる"};
try{ document.documentElement.lang = "ja"; }catch(e){}
const state = {grade:5, units:[], subsOff:{}, level:0, total:20, alloc:{}, order:"group", paper:"auto", over:"bigger", size:"m", score:"count", hdr2:"on", meateOn:false, meate:"", meateEdited:false, seed:Date.now() % 1000000};
let view = "q", items = [], groups = [], LAY = null, PAPER_NOW = "A4";

function persist(){ try{ localStorage.setItem("smm-state", JSON.stringify(Object.assign({}, state, {seed:undefined}))); }catch(e){} }
function load(){
  try{
    const s = JSON.parse(localStorage.getItem("smm-state") || "null");
    if(s) for(const k of Object.keys(state)) if(k !== "seed" && s[k] !== undefined) state[k] = s[k];
  }catch(e){}
  if(!GRADES[state.grade]) state.grade = 5;
  const ids = unitsOf(state.grade).map(u => u.id);
  state.units = state.units.filter(id => ids.includes(id));
  if(!state.units.length) state.units = [ids[0]];
}

/* ---------- 単元ごとの問題数 ---------- */
function selUnits(){ return unitsOf(state.grade).filter(u => state.units.includes(u.id)); }
function autoSplit(){
  const us = selUnits(), n = us.length; state.alloc = {};
  if(!n) return;
  const base = Math.floor(state.total / n); let r = state.total - base * n;
  us.forEach(u => { state.alloc[u.id] = base + (r > 0 ? 1 : 0); if(r > 0) r--; });
}
function defaultMeate(){
  const us = selUnits();
  if(!us.length) return "";
  if(us.length === 1) return us[0].meate;
  return us.map(u => u.name.replace(/（.）/, "")).slice(0, 3).join("や") + (us.length > 3 ? "など" : "") + "をふりかえろう";
}
function titleText(){
  const us = selUnits();
  return us.map(u => u.name).join("・") || "算数プリント";
}

/* ---------- 描画（左の設定） ---------- */
function segSet(id, val){ for(const b of $(id).querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === String(val))); }
function renderGrades(){
  const box = $("grades"); box.innerHTML = "";
  for(let g = 1; g <= 6; g++){
    const b = document.createElement("button"); b.type = "button"; b.textContent = g + "年"; b.dataset.v = g;
    b.disabled = !GRADES[g]; if(!GRADES[g]) b.title = "じゅんび中";
    b.addEventListener("click", () => { state.grade = g; state.units = [unitsOf(g)[0].id]; autoSplit(); update(true); });
    box.appendChild(b);
  }
  segSet("grades", state.grade);
  $("gradeNote").textContent = "";
}
function renderUnits(){
  const box = $("units"); box.innerHTML = "";
  for(const u of unitsOf(state.grade)){
    const on = state.units.includes(u.id);
    const lab = document.createElement("label"); lab.className = "unit" + (on ? " on" : "");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = on; cb.id = "u-" + u.id;
    cb.addEventListener("change", () => {
      if(cb.checked) state.units.push(u.id); else state.units = state.units.filter(x => x !== u.id);
      autoSplit(); update(true);
    });
    const nm = document.createElement("span"); nm.className = "nm";
    const sm = document.createElement("small"); sm.textContent = typeof u.no === "number" ? u.no : ""; nm.append(sm, document.createTextNode(u.name));
    const mo = document.createElement("span"); mo.className = "mo"; mo.textContent = u.month;
    lab.append(cb, nm, mo); box.appendChild(lab);
  }
  $("unitCount").textContent = state.units.length + "こ選択";
}
function renderSubs(){
  const box = $("subs"); box.innerHTML = "";
  const us = selUnits();
  $("stepSubs").hidden = !us.length;
  for(const u of us){
    const grp = document.createElement("div"); grp.className = "subgrp";
    const h = document.createElement("div"); h.className = "sub-h"; h.textContent = u.name;
    const chips = document.createElement("div"); chips.className = "chips";
    const off = state.subsOff[u.id] || [];
    for(const s of u.subs){
      const b = document.createElement("button"); b.type = "button"; b.className = "chip" + (off.includes(s.id) ? " off" : "");
      b.textContent = s.name; b.setAttribute("aria-pressed", String(!off.includes(s.id)));
      b.addEventListener("click", () => {
        const cur = state.subsOff[u.id] || [];
        if(cur.includes(s.id)) state.subsOff[u.id] = cur.filter(x => x !== s.id);
        else if(cur.length < u.subs.length - 1) state.subsOff[u.id] = cur.concat([s.id]);
        update(true);
      });
      chips.appendChild(b);
    }
    grp.append(h, chips); box.appendChild(grp);
  }
}
function renderCount(){
  $("cnt").value = state.total;
  const pr = $("presets"); pr.innerHTML = "";
  for(const n of [5, 10, 15, 20, 30]){
    const b = document.createElement("button"); b.type = "button"; b.textContent = n + "問"; b.setAttribute("aria-pressed", String(state.total === n));
    b.addEventListener("click", () => { state.total = n; autoSplit(); update(true); });
    pr.appendChild(b);
  }
  const us = selUnits();
  $("allocBox").hidden = us.length < 2;
  const box = $("alloc"); box.innerHTML = "";
  if(us.length >= 2) for(const u of us){
    const r = document.createElement("div"); r.className = "ar";
    const s = document.createElement("span"); s.textContent = u.name;
    const st = document.createElement("div"); st.className = "stepper sm";
    const m = document.createElement("button"); m.type = "button"; m.textContent = "−"; m.setAttribute("aria-label", u.name + "を1問へらす");
    const inp = document.createElement("input"); inp.type = "number"; inp.min = "0"; inp.max = "40"; inp.value = state.alloc[u.id] || 0; inp.id = "al-" + u.id; inp.setAttribute("aria-label", u.name + "の問題数");
    const p = document.createElement("button"); p.type = "button"; p.textContent = "＋"; p.setAttribute("aria-label", u.name + "を1問ふやす");
    const setA = v => { state.alloc[u.id] = Math.max(0, Math.min(40, v | 0)); state.total = Math.max(1, us.reduce((a, x) => a + (state.alloc[x.id] || 0), 0)); update(true); };
    m.addEventListener("click", () => setA((state.alloc[u.id] || 0) - 1));
    p.addEventListener("click", () => setA((state.alloc[u.id] || 0) + 1));
    inp.addEventListener("change", () => setA(parseInt(inp.value, 10) || 0));
    st.append(m, inp, p); r.append(s, st); box.appendChild(r);
  }
  $("stepOrder").hidden = us.length < 2 && !us.some(u => u.subs.length > 1);
}
function renderOptions(){
  segSet("segLevel", state.level); segSet("segOrder", state.order); segSet("segPaper", state.paper);
  segSet("segOver", state.over); segSet("segSize", state.size); segSet("segScore", state.score); segSet("segHdr2", state.hdr2); segSet("segView", view);
  $("segScore").querySelector('[data-v="count"]').textContent = "問題数（／" + state.total + "問）";
  $("meateOn").checked = state.meateOn;
  $("meate").disabled = !state.meateOn;
  if(!state.meateEdited) state.meate = defaultMeate();
  if(document.activeElement !== $("meate")) $("meate").value = state.meate;
}

/* ---------- 問題を作ってならべる ---------- */
let mG = null;
function measureG(){ if(!mG){ const c = document.createElement("canvas"); mG = makeG(c.getContext("2d"), 4); } return mG; }
function printOpt(){
  return {title:titleText(), grade:state.grade, score:state.score === "100" && groups.reduce((s, g) => s + g.n, 0) <= 100 ? "100" : "count", total:groups.reduce((s, g) => s + g.n, 0), hdr2:state.hdr2 !== "off", meate:state.meateOn ? state.meate.trim() : ""};
}
function generate(){
  items = buildItems(state);
  groups = makeGroups(items, state.order);
  relayout();
}
function relayout(){
  if(state.score === "100") assignPoints(groups); else for(const g of groups){ g.each = g.total = g.itemPts = null; }
  const G = measureG(), fs = FS[state.size], opt = printOpt();
  if(state.paper === "auto"){
    const a4 = layoutPages(G, groups, "A4", fs, opt);
    if(a4.fits || state.over === "pages"){ LAY = a4; PAPER_NOW = "A4"; }
    else { LAY = layoutPages(G, groups, "B4", fs, opt); PAPER_NOW = "B4"; }
    $("paperAuto").textContent = "おすすめ（" + PAPER_NOW + "）";
  } else { PAPER_NOW = state.paper; LAY = layoutPages(G, groups, PAPER_NOW, fs, opt); $("paperAuto").textContent = "おすすめ"; }
  const n = LAY.pages.length, note = $("paperNote");
  if(!groups.length){ note.hidden = true; }
  else if(state.paper === "auto" && PAPER_NOW === "B4" && n === 1){ note.hidden = false; note.textContent = "A4の1まいには入りきらないので、B4にしました。"; }
  else if(n > 1){ note.hidden = false; note.textContent = PAPER_NOW + "で" + n + "まいになります。" + (PAPER_NOW === "A4" ? "1まいにしたいときは、用紙をB4にするか、問題数をへらしてください。" : "1まいにしたいときは、問題数をへらすか、文字を小さくしてください。"); }
  else note.hidden = true;
  const total = groups.reduce((s, g) => s + g.n, 0);
  $("pvMeta").textContent = total ? PAPER_NOW + "たて ・ " + total + "問 ・ " + n + "まい ・ " + LEVEL_NAMES[state.level] : "";
  $("cntInfo").textContent = total && total !== state.total ? "（できた問題 " + total + "問）" : "";
  drawPreview();
  scheduleFonts();
}

/* ---------- プレビュー ---------- */
let pvTimer = 0;
function drawPreview(){
  clearTimeout(pvTimer);
  pvTimer = setTimeout(() => {
    const box = $("pages");
    const none = !groups.length;
    for(const id of ["savePdf", "saveImgQ", "saveImgA", "printQ", "printA"]) $(id).disabled = none;
    if(none){ box.innerHTML = '<div class="empty">単元を1つ以上えらんでください。</div>'; return; }
    const want = LAY.pages.length;
    const figs = [...box.querySelectorAll("figure")];
    if(figs.length !== want || box.querySelector(".empty")){
      box.innerHTML = "";
      for(let i = 0; i < want; i++){
        const f = document.createElement("figure"), c = document.createElement("canvas"), cap = document.createElement("figcaption");
        c.setAttribute("aria-label", "プリントのプレビュー " + (i + 1) + "まいめ"); c.lang = "ja";
        cap.textContent = want > 1 ? (i + 1) + "まいめ" : ""; cap.hidden = want < 2;
        f.append(c, cap); box.appendChild(f);
      }
    }
    const cvs = box.querySelectorAll("canvas");
    const cssW = Math.min(820, Math.max(280, box.clientWidth - 24));
    const k = cssW * Math.min(2, window.devicePixelRatio || 1) / LAY.PW;
    const fs = FS[state.size], opt = printOpt();
    cvs.forEach((c, i) => {
      c.width = Math.round(LAY.PW * k); c.height = Math.round(LAY.PH * k);
      const G = makeG(c.getContext("2d"), k);
      try{ drawPageAt(G, LAY, i, fs, opt, view === "a"); }catch(e){ console.error(e); }
    });
  }, 30);
}
function renderAll(){ renderGrades(); renderUnits(); renderSubs(); renderCount(); renderOptions(); }
function update(regen){ persist(); renderAll(); if(regen) generate(); else relayout(); }

/* ---------- 保存（PDF・画像） ---------- */
let dl = null, dlChecked = false;
async function getDl(){
  if(dl) return dl;
  try{ if(window.claude && typeof window.claude.use === "function") dl = await window.claude.use("downloads"); }catch(e){ dl = null; }
  dlChecked = true; setSaveMode();
  return dl;
}
function setSaveMode(){
  const can = !!dl || !dlChecked;
  /* タブレットなど保存ができない画面では、印刷ボタンで印刷用の画像を出す */
  $("savePdf").textContent = can ? "PDFで保存（問題＋答え）" : "問題と答えの画像をまとめて出す";
  $("saveImgQ").hidden = $("saveImgA").hidden = !can;
  if(!can && !setSaveMode.noted){ setSaveMode.noted = true; status("「問題を印刷する」「答えを印刷する」をおすと，印刷用の画像が出ます。画像を長押しして「共有」→「プリント」で印刷できます。"); }
}
function status(msg, kind){ const el = $("saveStatus"); el.textContent = msg; el.className = "status" + (kind ? " " + kind : ""); }
const PRINT_K = 200 / 25.4;
function renderPrint(ans){
  const fs = FS[state.size], opt = printOpt();
  return LAY.pages.map((_, i) => { const c = document.createElement("canvas"); c.width = Math.round(LAY.PW * PRINT_K); c.height = Math.round(LAY.PH * PRINT_K); drawPageAt(makeG(c.getContext("2d"), PRINT_K), LAY, i, fs, opt, ans); return c; });
}
function baseName(){
  const us = selUnits();
  const unit = us.length ? us[0].name.replace(/[（）()\s]/g, "") + (us.length > 1 ? "ほか" : "") : "";
  const d = new Date(), pad = n => String(n).padStart(2, "0");
  return "算数プリント_" + state.grade + "年_" + unit + "_" + groups.reduce((s, g) => s + g.n, 0) + "問_" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}
function showImages(list){
  const box = $("imgList"); box.innerHTML = "";
  for(const it of list){
    const fig = document.createElement("figure"), cap = document.createElement("figcaption"), img = document.createElement("img");
    cap.textContent = it.label; img.alt = it.label; img.src = it.canvas.toDataURL("image/png");
    fig.append(cap, img); box.appendChild(fig);
  }
  $("imgHow").textContent = "画像を1まいずつ長押しして「共有」→「プリント」をえらぶと，そのまま印刷できます。「写真に保存」してから，プリンターのアプリで印刷することもできます。用紙は「" + PAPER_NOW + "」，大きさは「用紙に合わせる」（ふちなしにしない）にしてください。";
  $("imgOverlay").hidden = false;
}
async function offer(filename, data){
  if(!dl) return "none";
  try{ await dl.save({filename, data}); return "saved"; }catch(err){ return (err && err.code) || "error"; }
}
function explain(code){
  if(code === "declined") return ["保存をやめました。", ""];
  if(code === "rate_limited") return ["保存の確認画面がすでに開いています。少し待ってからもう一度おしてください。", "err"];
  return ["この画面では保存できませんでした。", "err"];
}
async function withBusy(btn, fn){ const t = btn.textContent; btn.disabled = true; btn.textContent = "作成中…"; try{ await fn(); } finally { btn.disabled = false; btn.textContent = t; setSaveMode(); } }
$("savePdf").addEventListener("click", e => withBusy(e.currentTarget, async () => {
  await fontsReady;
  if(!(await getDl())){
    const q = renderPrint(false), a = renderPrint(true);
    showImages(q.map((c, i) => ({label:"問題" + (q.length > 1 ? "（" + (i + 1) + "まいめ）" : ""), canvas:c})).concat(a.map((c, i) => ({label:"答え（先生用）" + (a.length > 1 ? "（" + (i + 1) + "まいめ）" : ""), canvas:c}))));
    status("画像を表示しました。長押しして「共有」→「プリント」で印刷できます。", "ok");
    return;
  }
  status("PDFを作っています…");
  let blob;
  try{ blob = await makePdf(renderPrint(false).concat(renderPrint(true)), PAPER_NOW); }catch(err){ status("PDFを作れませんでした。「画像で保存」をためしてください。", "err"); return; }
  const r = await offer(baseName() + ".pdf", blob);
  const n = LAY.pages.length;
  if(r === "saved") status("PDFを保存しました（" + (n > 1 ? "1〜" + n + "ページ目：問題、" + (n + 1) + "〜" + (2 * n) + "ページ目：答え" : "1ページ目：問題、2ページ目：答え") + "）。印刷するときは、用紙を " + PAPER_NOW + " にしてください。", "ok");
  else status(...explain(r));
}));
async function saveImage(ans, btn){
  await withBusy(btn, async () => {
    await fontsReady; await getDl();
    const cs = renderPrint(ans);
    for(let i = 0; i < cs.length; i++){
      const blob = await new Promise(res => cs[i].toBlob(res, "image/png"));
      const r = await offer(baseName() + (ans ? "_答え" : "_問題") + (cs.length > 1 ? "_" + (i + 1) : "") + ".png", blob);
      if(r !== "saved"){ status(...explain(r)); return; }
    }
    status((ans ? "答え" : "問題") + "の画像を保存しました。", "ok");
  });
}
/* 印刷用のファイル：開くと印刷の画面が出る */
function printHtml(cs, ans){
  const [W, H] = PAPERS[PAPER_NOW];
  const imgs = cs.map(c => '<img src="' + c.toDataURL("image/png") + '" alt="">').join("");
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + baseName() + (ans ? "_答え" : "_問題") + '</title>' +
    '<style>@page{size:' + W + 'mm ' + H + 'mm;margin:0}html,body{margin:0;padding:0;background:#fff}' +
    'img{display:block;width:' + W + 'mm;height:' + H + 'mm;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}' +
    '.note{font:16px sans-serif;padding:12px 16px;background:#e1e9f5;color:#1a2b45}.note button{font:inherit;margin-left:12px;padding:4px 14px}' +
    '@media print{.note{display:none}}</style></head><body>' +
    '<div class="note">印刷の画面が出ないときは <button onclick="print()">印刷する</button> をおしてください。用紙は ' + PAPER_NOW + '、倍率は100%（またはページに合わせる）、余白なしにしてください。</div>' +
    imgs + '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},400);});<\/script></body></html>';
}
async function printPages(ans, btn){
  await withBusy(btn, async () => {
    await fontsReady;
    if(!(await getDl())){ const cs = renderPrint(ans); showImages(cs.map((c, i) => ({label:(ans ? "答え（先生用）" : "問題") + (cs.length > 1 ? "（" + (i + 1) + "まいめ）" : ""), canvas:c}))); return; }
    status("印刷用のファイルを作っています…");
    const r = await offer(baseName() + (ans ? "_答え" : "_問題") + "_印刷用.html", printHtml(renderPrint(ans), ans));
    if(r === "saved") status("印刷用のファイルを保存しました。そのファイルを開くと印刷の画面が出ます。用紙は " + PAPER_NOW + " を選んでください。", "ok");
    else status(...explain(r));
  });
}
$("printQ").addEventListener("click", e => printPages(false, e.currentTarget));
$("printA").addEventListener("click", e => printPages(true, e.currentTarget));
$("saveImgQ").addEventListener("click", e => saveImage(false, e.currentTarget));
$("saveImgA").addEventListener("click", e => saveImage(true, e.currentTarget));
$("imgClose").addEventListener("click", () => { $("imgOverlay").hidden = true; });
$("imgClose2").addEventListener("click", () => { $("imgOverlay").hidden = true; });
getDl();

/* ---------- 操作 ---------- */
function bindSeg(id, fn){ $(id).addEventListener("click", e => { const b = e.target.closest("button"); if(b && !b.disabled) fn(b.dataset.v); }); }
bindSeg("segLevel", v => { state.level = v === "mix" ? "mix" : +v; update(true); });
bindSeg("segOrder", v => { state.order = v; update(true); });
bindSeg("segPaper", v => { state.paper = v; update(false); });
bindSeg("segOver", v => { state.over = v; update(false); });
bindSeg("segSize", v => { state.size = v; update(false); });
bindSeg("segScore", v => { state.score = v; update(false); });
bindSeg("segHdr2", v => { state.hdr2 = v; update(false); });
bindSeg("segView", v => { view = v; segSet("segView", view); drawPreview(); });
const setTotal = v => { state.total = Math.max(1, Math.min(60, v | 0)); autoSplit(); update(true); };
$("cntMinus").addEventListener("click", () => setTotal(state.total - 1));
$("cntPlus").addEventListener("click", () => setTotal(state.total + 1));
$("cnt").addEventListener("change", () => setTotal(parseInt($("cnt").value, 10) || 1));
$("reSplit").addEventListener("click", () => { autoSplit(); update(true); });
$("regen").addEventListener("click", () => { state.seed = (state.seed * 7 + 12345 + Math.floor(Math.random() * 1000)) % 100000000; generate(); });
$("unitAll").addEventListener("click", () => { state.units = unitsOf(state.grade).map(u => u.id); autoSplit(); update(true); });
$("unitNone").addEventListener("click", () => { state.units = []; autoSplit(); update(true); });
$("meateOn").addEventListener("change", () => { state.meateOn = $("meateOn").checked; update(false); });
$("meate").addEventListener("input", () => { state.meate = $("meate").value; state.meateEdited = state.meate !== defaultMeate(); persist(); relayout(); });
window.addEventListener("resize", drawPreview);

/* ---------- 書体の読みこみ ----------
   日本語の書体は字ごとに分けて配られるので、プリントに出てくる字を全部読みこんでからかく */
const loadedChars = {};
async function ensureFonts(){
  if(!document.fonts || !document.fonts.load || !LAY || !groups.length) return false;
  const f = FONTS[FONT_KEY], set = loadedChars[f.web] || (loadedChars[f.web] = new Set());
  const c = document.createElement("canvas"), G = makeG(c.getContext("2d"), 0.05); G.capture = [];
  const fs = FS[state.size], opt = printOpt();
  try{ for(let i = 0; i < LAY.pages.length; i++){ drawPageAt(G, LAY, i, fs, opt, false); drawPageAt(G, LAY, i, fs, opt, true); } }catch(e){}
  let txt = "";
  for(const ch of G.capture.join("") + "（）〔〕答え先生用名前めあて点問／0123456789") if(ch.trim() && !set.has(ch)){ set.add(ch); txt += ch; }
  if(!txt) return false;
  const ws = [...new Set([f.n, f.b, 400])];
  try{ await Promise.race([Promise.all(ws.map(w => document.fonts.load(w + ' 20px "' + f.web + '"', txt))), new Promise(r => setTimeout(r, 6000))]); }catch(e){}
  return true;
}
let fontsReady = Promise.resolve();
function scheduleFonts(){
  fontsReady = fontsReady.then(ensureFonts).then(changed => { if(changed){ mG = null; clearMetrics(groups); relayout(); } }).catch(() => {});
}

function clearMetrics(o){
  const seen = new Set();
  const walk = v => { if(!v || typeof v !== "object" || seen.has(v)) return; seen.add(v); if(v.m && v.t) delete v.m; for(const k of Object.keys(v)) if(k !== "unit" && k !== "sub") walk(v[k]); };
  walk(o);
}

load();
if(!Object.keys(state.alloc).length || selUnits().some(u => state.alloc[u.id] === undefined)) autoSplit();
renderAll();
generate();

/* ---------- バージョン表示 ---------- */
(() => { const b = $("verBtn"), p = $("verLog"); if(!b || !p) return;
  b.addEventListener("click", e => { e.stopPropagation(); p.hidden = !p.hidden; b.setAttribute("aria-expanded", String(!p.hidden)); });
  document.addEventListener("click", e => { if(!p.hidden && !p.contains(e.target)){ p.hidden = true; b.setAttribute("aria-expanded", "false"); } });
})();
