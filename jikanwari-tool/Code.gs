/**
 * 時間割作成ツール（Googleスプレッドシート＋Webアプリ）
 *
 * シート
 *   保存データ … 質問への答え（年度ごと）
 *   時間割一覧 … 出力した時間割（上：全クラス、下：専科・講師と特別教室）
 *   チェック結果 … 手直し後のチェック結果
 */

var SAVE_SHEET = '保存データ';
var TABLE_SHEET = '時間割一覧';
var CHECK_SHEET = 'チェック結果';
var CHUNK = 40000; // 1つのセルに入れる文字数（上限5万文字より少なめ）

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('時間割作成ツール')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('時間割ツール')
    .addItem('入力画面を開く', 'showAppLink')
    .addItem('時間割をチェックする', 'showCheck')
    .addItem('A3のPDFを作る', 'showPdf')
    .addToUi();
}

function showAppLink() {
  var url = ScriptApp.getService().getUrl();
  var html = url
    ? '<p style="font-family:sans-serif">下のリンクから入力画面を開いてください。</p>' +
      '<p style="font-family:sans-serif"><a href="' + url + '" target="_blank">入力画面を開く</a></p>'
    : '<p style="font-family:sans-serif">まだWebアプリとして公開されていません。設定手順の「公開する」を行ってください。</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(360).setHeight(140), '入力画面');
}

function showCheck() {
  var html = HtmlService.createTemplateFromFile('Check').evaluate().setWidth(720).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, '時間割のチェック');
}

function showPdf() {
  var url = exportPdf();
  var html = '<p style="font-family:sans-serif">A3横のPDFを作りました。</p>' +
    '<p style="font-family:sans-serif"><a href="' + url + '" target="_blank">PDFを開く</a></p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(360).setHeight(140), 'PDF');
}

/* ---------------- 答えの保存 ---------------- */

function saveSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SAVE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SAVE_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([['名前（年度）', '更新日時', '答え（さわらないでください）']]).setFontWeight('bold');
    sh.setColumnWidth(1, 160);
    sh.setColumnWidth(2, 160);
  }
  return sh;
}

function findSaveRow_(sh, name) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var names = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < names.length; i++) if (String(names[i][0]) === name) return i + 2;
  return -1;
}

function listSaves() {
  var sh = saveSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 2).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      return { name: String(r[0]), updated: r[1] instanceof Date ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm') : String(r[1]) };
    });
}

function loadSave(name) {
  var sh = saveSheet_();
  var row = findSaveRow_(sh, name);
  if (row < 0) return null;
  var width = sh.getLastColumn();
  var vals = sh.getRange(row, 3, 1, Math.max(1, width - 2)).getValues()[0];
  return vals.join('');
}

function saveAnswers(name, json) {
  name = String(name || '').trim();
  if (!name) throw new Error('名前（年度）が空です。');
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sh = saveSheet_();
    var row = findSaveRow_(sh, name);
    if (row < 0) row = Math.max(2, sh.getLastRow() + 1);
    var parts = [];
    for (var i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
    var width = Math.max(sh.getLastColumn(), parts.length + 2);
    var rowVals = [name, new Date()].concat(parts);
    while (rowVals.length < width) rowVals.push('');
    if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
    sh.getRange(row, 1).setNumberFormat('@');
    sh.getRange(row, 2).setNumberFormat('yyyy/MM/dd HH:mm');
    sh.getRange(row, 3, 1, width - 2).setNumberFormat('@');
    sh.getRange(row, 1, 1, width).setValues([rowVals]);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/* ---------------- 時間割の書き出し ---------------- */

// すべてのマスを同じ大きさにそろえる（ピクセル）
var CELL_W = 42, CELL_H = 24;

// Googleスプレッドシートには「縮小して全体を表示」がないので、文字数で文字の大きさを変える
function fontSizeFor_(t) {
  var n = String(t == null ? '' : t).length;
  return n <= 2 ? 10 : n === 3 ? 9 : n <= 8 ? 7 : 6;
}

/**
 * 「時間割一覧」シートを作る
 *   上：クラスごとの時間割（曜日ごとに、その曜日にある時間の数だけ列を作る）
 *   下：専科・講師と特別教室の表（曜日×時間の小さな表を、左から詰めて並べる）
 */
function writeTimetable(table, saveName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TABLE_SHEET);
  if (sh) sh.clear(); else sh = ss.insertSheet(TABLE_SHEET, 0);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();

  var days = table.days, D = days.length, MP = table.maxPeriods;
  var dayP = table.dayPeriods;
  var maxP = Math.max.apply(null, dayP.concat([1]));
  // 上の表の列 → コマ（曜日×時間）
  var slotCols = [];
  for (var d = 0; d < D; d++) for (var p = 0; p < dayP[d]; p++) slotCols.push(d * MP + p);
  var topCols = 1 + slotCols.length;

  // 下の表：先生（全員）と、使っている特別教室
  var blocks = [];
  table.teacherRows.forEach(function (t) { blocks.push({ kind: 't', label: t.label, title: t.title || t.label, cells: t.cells, off: t.off }); });
  table.roomRows.forEach(function (r) {
    if (r.cells.some(function (c) { return c; })) blocks.push({ kind: 'r', label: r.label, title: r.label, cells: r.cells });
  });
  var blockW = 1 + D, stride = blockW + 1, blockH = 2 + maxP, bandStride = blockH + 1;
  var perBand = Math.max(1, Math.floor((topCols + 1) / stride));
  var bands = Math.ceil(blocks.length / perBand);

  var cols = Math.max(topCols, perBand * stride - 1);
  var classStart = 4, classCount = table.classRows.length;
  var bottomStart = classStart + classCount + 1;
  var lastRow = Math.max(bottomStart - 1, bottomStart + bands * bandStride - 2);

  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (sh.getMaxRows() < lastRow) sh.insertRowsAfter(sh.getMaxRows(), lastRow - sh.getMaxRows());

  var W = '#ffffff', HEAD = '#dfe8f5', FIXED = '#e6e6e6', NONE = '#9e9e9e', EMPTY = '#fff3c4', OFF = '#d9d9d9';
  var vals = [], bgs = [];
  for (var r = 0; r < lastRow; r++) {
    var v = [], b = [];
    for (var c = 0; c < cols; c++) { v.push(''); b.push(W); }
    vals.push(v); bgs.push(b);
  }
  function put(r, c, val, bg) { vals[r - 1][c - 1] = val; if (bg) bgs[r - 1][c - 1] = bg; }

  // 上の表
  put(1, 1, table.title);
  var col = 2;
  for (d = 0; d < D; d++) {
    if (!dayP[d]) continue;
    put(2, col, days[d], HEAD);
    for (p = 0; p < dayP[d]; p++) put(3, col + p, p + 1, HEAD);
    col += dayP[d];
  }
  put(2, 1, 'クラス', HEAD); put(3, 1, '', HEAD);
  table.classRows.forEach(function (cr, i) {
    var r = classStart + i;
    put(r, 1, cr.label, HEAD);
    slotCols.forEach(function (sIdx, j) {
      var cell = cr.cells[sIdx];
      put(r, 2 + j, cell.t, cell.k === 'fixed' ? FIXED : cell.k === 'none' ? NONE : cell.k === 'empty' ? EMPTY : W);
    });
  });

  // 下の表（左から詰めて並べる）
  var layoutBlocks = [];
  blocks.forEach(function (bk, i) {
    var r0 = bottomStart + Math.floor(i / perBand) * bandStride;
    var c0 = 1 + (i % perBand) * stride;
    put(r0, c0, bk.title);
    for (var d = 0; d < D; d++) put(r0 + 1, c0 + 1 + d, days[d], HEAD);
    put(r0 + 1, c0, '', HEAD);
    for (var p = 0; p < maxP; p++) {
      put(r0 + 2 + p, c0, p + 1, HEAD);
      for (d = 0; d < D; d++) {
        var sIdx = d * MP + p;
        var none = p >= dayP[d];
        put(r0 + 2 + p, c0 + 1 + d, bk.cells[sIdx] || '', none ? NONE : (bk.off && bk.off[sIdx]) ? OFF : W);
      }
    }
    layoutBlocks.push({ kind: bk.kind, label: bk.label, row: r0, col: c0 });
  });

  var all = sh.getRange(1, 1, lastRow, cols);
  all.setNumberFormat('@').setValues(vals).setBackgrounds(bgs)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setFontFamily('Noto Sans JP')
    .setFontSizes(vals.map(function (row) { return row.map(fontSizeFor_); }));

  // 見出し・結合
  sh.getRange(1, 1, 1, cols).merge().setFontSize(14).setFontWeight('bold').setHorizontalAlignment('left');
  col = 2;
  for (d = 0; d < D; d++) {
    if (!dayP[d]) continue;
    if (dayP[d] > 1) sh.getRange(2, col, 1, dayP[d]).merge();
    col += dayP[d];
  }
  sh.getRange(2, 1, 2, topCols).setFontWeight('bold');
  sh.getRange(classStart, 1, classCount, 1).setFontWeight('bold');

  // 罫線
  var SOLID = SpreadsheetApp.BorderStyle.SOLID, MED = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  sh.getRange(2, 1, classCount + 2, topCols).setBorder(true, true, true, true, true, true, '#888888', SOLID);
  col = 2;
  for (d = 0; d < D; d++) {
    if (!dayP[d]) continue;
    sh.getRange(2, col, classCount + 2, dayP[d]).setBorder(true, true, true, true, null, null, '#000000', MED);
    col += dayP[d];
  }
  sh.getRange(2, 1, classCount + 2, topCols).setBorder(true, true, true, true, null, null, '#000000', MED);
  var prevGrade = null;
  table.classRows.forEach(function (cr, i) {
    if (prevGrade !== null && cr.grade !== prevGrade) {
      sh.getRange(classStart + i, 1, 1, topCols).setBorder(true, null, null, null, null, null, '#000000', MED);
    }
    prevGrade = cr.grade;
  });
  layoutBlocks.forEach(function (bk) {
    sh.getRange(bk.row, bk.col, 1, blockW).merge().setHorizontalAlignment('left').setFontWeight('bold').setFontSize(9)
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    var g = sh.getRange(bk.row + 1, bk.col, 1 + maxP, blockW);
    g.setBorder(true, true, true, true, true, true, '#888888', SOLID);
    g.setBorder(true, true, true, true, null, null, '#000000', MED);
    sh.getRange(bk.row + 1, bk.col, 1 + maxP, 1).setFontWeight('bold');
  });

  // 高さも幅もすべて同じにする（文字が多くても高さが変わらないように固定）
  sh.setColumnWidths(1, cols, CELL_W);
  sh.setRowHeightsForced(1, lastRow, CELL_H);
  if (sh.getMaxRows() > lastRow) sh.deleteRows(lastRow + 1, sh.getMaxRows() - lastRow);
  if (sh.getMaxColumns() > cols) sh.deleteColumns(cols + 1, sh.getMaxColumns() - cols);
  sh.setHiddenGridlines(true);

  PropertiesService.getDocumentProperties().setProperty('layout', JSON.stringify({
    saveName: saveName, D: D, MP: MP, maxP: maxP, slotCols: slotCols,
    classStart: classStart, classCount: classCount, blocks: layoutBlocks
  }));
  ss.setActiveSheet(sh);
  return ss.getUrl() + '#gid=' + sh.getSheetId();
}

/* ---------------- チェック ---------------- */

function layout_() {
  var s = PropertiesService.getDocumentProperties().getProperty('layout');
  if (!s) throw new Error('まだ時間割が書き出されていません。入力画面で時間割を作り、書き出してください。');
  var L = JSON.parse(s);
  if (!L.slotCols) throw new Error('時間割の形が新しくなりました。入力画面からもう一度書き出してください。');
  return L;
}

function readTimetable() {
  var L = layout_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABLE_SHEET);
  if (!sh) throw new Error('「' + TABLE_SHEET + '」シートがありません。');
  var S = L.D * L.MP;
  var values = sh.getDataRange().getDisplayValues();
  function at(r, c) { return (values[r - 1] || [])[c - 1] || ''; }
  function emptyCells() { var a = []; for (var i = 0; i < S; i++) a.push(''); return a; }

  var classRows = [];
  for (var i = 0; i < L.classCount; i++) {
    var r = L.classStart + i, cells = emptyCells();
    L.slotCols.forEach(function (s, j) { cells[s] = at(r, 2 + j); });
    classRows.push({ label: at(r, 1), cells: cells });
  }
  var teacherRows = L.blocks.filter(function (b) { return b.kind === 't'; }).map(function (b) {
    var cells = emptyCells();
    for (var d = 0; d < L.D; d++) for (var p = 0; p < L.maxP; p++) cells[d * L.MP + p] = at(b.row + 2 + p, b.col + 1 + d);
    return { label: b.label, cells: cells };
  });
  var json = loadSave(L.saveName);
  if (!json) throw new Error('「' + L.saveName + '」の答えが保存データにありません。');
  return { saveName: L.saveName, answers: json, classRows: classRows, teacherRows: teacherRows };
}

function writeCheckResult(result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = layout_();
  // 下の「特別教室」の表は、上の表から作り直す
  var sh = ss.getSheetByName(TABLE_SHEET);
  if (sh && result.roomRows) {
    var byLabel = {};
    result.roomRows.forEach(function (r) { byLabel[r.label] = r.cells; });
    L.blocks.forEach(function (b) {
      if (b.kind !== 'r' || !byLabel[b.label]) return;
      var rows = [];
      for (var p = 0; p < L.maxP; p++) {
        var row = [];
        for (var d = 0; d < L.D; d++) row.push(byLabel[b.label][d * L.MP + p] || '');
        rows.push(row);
      }
      sh.getRange(b.row + 2, b.col + 1, L.maxP, L.D).setValues(rows)
        .setFontSizes(rows.map(function (row) { return row.map(fontSizeFor_); }));
    });
  }
  var cs = ss.getSheetByName(CHECK_SHEET);
  if (cs) cs.clear(); else cs = ss.insertSheet(CHECK_SHEET);
  var out = [['チェックした日時', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm')], ['', '']];
  out.push(['必ず直すところ', result.must.length ? result.must.length + '件' : 'ありません']);
  result.must.forEach(function (t) { out.push(['', t]); });
  out.push(['', '']);
  out.push(['できれば直すところ', result.better.length ? result.better.length + '件' : 'ありません']);
  result.better.forEach(function (t) { out.push(['', t]); });
  cs.getRange(1, 1, out.length, 2).setValues(out);
  cs.setColumnWidth(1, 150);
  cs.setColumnWidth(2, 720);
  cs.getRange(1, 1, out.length, 1).setFontWeight('bold');
  return true;
}

/* ---------------- PDF ---------------- */

function exportPdf() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TABLE_SHEET);
  if (!sh) throw new Error('まだ時間割が書き出されていません。');
  SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=pdf' +
    '&gid=' + sh.getSheetId() + '&size=A3&portrait=false&scale=4' +
    '&top_margin=0.3&bottom_margin=0.3&left_margin=0.3&right_margin=0.3' +
    '&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false&horizontal_alignment=CENTER';
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  var name = sh.getRange(1, 1).getDisplayValue() || '時間割一覧';
  var file = DriveApp.createFile(res.getBlob().setName(name + '.pdf'));
  return file.getUrl();
}
