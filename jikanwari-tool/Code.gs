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

function writeTimetable(table, saveName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TABLE_SHEET);
  if (sh) sh.clear(); else sh = ss.insertSheet(TABLE_SHEET, 0);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();

  var D = table.days.length, MP = table.maxPeriods, N = D * MP;
  var cols = N + 1;
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());

  var rows = [];
  var formats = []; // 背景色
  function push(vals, bg) { rows.push(vals); formats.push(bg); }
  var blank = function () { var a = []; for (var i = 0; i < cols; i++) a.push(''); return a; };

  // 見出し
  var r1 = blank(); r1[0] = table.title; push(r1, null);
  var r2 = blank(); r2[0] = 'クラス';
  for (var d = 0; d < D; d++) r2[1 + d * MP] = table.days[d];
  push(r2, null);
  var r3 = blank(); r3[0] = '';
  for (d = 0; d < D; d++) for (var p = 0; p < MP; p++) r3[1 + d * MP + p] = p + 1;
  push(r3, null);

  var classStart = rows.length + 1;
  table.classRows.forEach(function (cr) {
    var v = [cr.label], bg = ['#ffffff'];
    cr.cells.forEach(function (c) {
      v.push(c.t);
      bg.push(c.k === 'fixed' ? '#e6e6e6' : c.k === 'none' ? '#9e9e9e' : c.k === 'empty' ? '#fff3c4' : '#ffffff');
    });
    push(v, bg);
  });
  var classEnd = rows.length;

  push(blank(), null);
  var tHead = rows.length + 1;
  var th = blank(); th[0] = '専科・講師'; push(th, null);
  var teacherStart = rows.length + 1;
  table.teacherRows.forEach(function (tr) {
    var v = [tr.label], bg = ['#ffffff'];
    tr.cells.forEach(function (c, i) { v.push(c); bg.push(tr.off && tr.off[i] ? '#d9d9d9' : '#ffffff'); });
    push(v, bg);
  });
  var rHead = rows.length + 1;
  var rh = blank(); rh[0] = '特別教室'; push(rh, null);
  var roomStart = rows.length + 1;
  table.roomRows.forEach(function (rr) { push([rr.label].concat(rr.cells), null); });
  var lastRow = rows.length;

  if (sh.getMaxRows() < lastRow) sh.insertRowsAfter(sh.getMaxRows(), lastRow - sh.getMaxRows());
  var all = sh.getRange(1, 1, lastRow, cols);
  all.setNumberFormat('@').setValues(rows);
  all.setFontSize(8).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
    .setFontFamily('Noto Sans JP');
  var bgs = formats.map(function (f) {
    if (f) { var a = f.slice(); while (a.length < cols) a.push('#ffffff'); return a; }
    var w = []; for (var i = 0; i < cols; i++) w.push('#ffffff'); return w;
  });
  all.setBackgrounds(bgs);

  // 見出しの形
  sh.getRange(1, 1, 1, cols).merge().setFontSize(14).setFontWeight('bold').setHorizontalAlignment('left');
  for (d = 0; d < D; d++) sh.getRange(2, 2 + d * MP, 1, MP).merge();
  sh.getRange(2, 1, 2, 1).merge();
  sh.getRange(2, 1, 2, cols).setBackground('#dfe8f5').setFontWeight('bold');
  [tHead, rHead].forEach(function (r) {
    sh.getRange(r, 1, 1, cols).merge().setBackground('#dfe8f5').setFontWeight('bold').setHorizontalAlignment('left');
  });
  sh.getRange(classStart, 1, classEnd - classStart + 1, 1).setFontWeight('bold').setHorizontalAlignment('left');
  if (lastRow >= teacherStart) sh.getRange(teacherStart, 1, lastRow - teacherStart + 1, 1).setHorizontalAlignment('left');

  // 罫線（曜日の区切りと学年の区切りを太く）
  var SOLID = SpreadsheetApp.BorderStyle.SOLID, MED = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  function grid(r, n) {
    if (n <= 0) return;
    sh.getRange(r, 1, n, cols).setBorder(true, true, true, true, true, true, '#888888', SOLID);
    for (var d = 0; d < D; d++) sh.getRange(r, 2 + d * MP, n, MP).setBorder(null, true, null, true, null, null, '#000000', MED);
    sh.getRange(r, 1, n, cols).setBorder(true, true, true, true, null, null, '#000000', MED);
  }
  grid(2, classEnd - 1);
  var prevGrade = null;
  table.classRows.forEach(function (cr, i) {
    if (prevGrade !== null && cr.grade !== prevGrade) {
      sh.getRange(classStart + i, 1, 1, cols).setBorder(true, null, null, null, null, null, '#000000', MED);
    }
    prevGrade = cr.grade;
  });
  grid(tHead, lastRow - tHead + 1);

  // 列の幅と行の高さ：タイトル以外の行はすべて同じ高さ、時間の列はすべて同じ幅にそろえる
  // （A3横に1枚でおさまるように、行の数から高さを決める）
  var LABEL_W = 96, CELL_W = 44;
  sh.setColumnWidth(1, LABEL_W);
  sh.setColumnWidths(2, N, CELL_W);
  var pageH = Math.round((LABEL_W + N * CELL_W) / 1.414);
  var rowH = Math.max(20, Math.min(40, Math.floor((pageH - 30) / Math.max(1, lastRow - 1))));
  sh.setRowHeight(1, 30);
  // 文字が多いマスがあっても高さが変わらないように、高さを固定する
  sh.setRowHeightsForced(2, lastRow - 1, rowH);
  if (sh.getMaxRows() > lastRow) sh.deleteRows(lastRow + 1, sh.getMaxRows() - lastRow);
  if (sh.getMaxColumns() > cols) sh.deleteColumns(cols + 1, sh.getMaxColumns() - cols);
  sh.setHiddenGridlines(true);

  var props = PropertiesService.getDocumentProperties();
  props.setProperty('layout', JSON.stringify({
    saveName: saveName, cols: cols,
    classStart: classStart, classCount: classEnd - classStart + 1,
    teacherStart: teacherStart, teacherCount: rHead - teacherStart,
    roomStart: roomStart, roomCount: lastRow - roomStart + 1
  }));
  ss.setActiveSheet(sh);
  return ss.getUrl() + '#gid=' + sh.getSheetId();
}

/* ---------------- チェック ---------------- */

function layout_() {
  var s = PropertiesService.getDocumentProperties().getProperty('layout');
  if (!s) throw new Error('まだ時間割が書き出されていません。入力画面で時間割を作り、書き出してください。');
  return JSON.parse(s);
}

function readTimetable() {
  var L = layout_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABLE_SHEET);
  if (!sh) throw new Error('「' + TABLE_SHEET + '」シートがありません。');
  function rowsOf(start, n) {
    if (n <= 0) return [];
    return sh.getRange(start, 1, n, L.cols).getDisplayValues().map(function (r) {
      return { label: r[0], cells: r.slice(1) };
    });
  }
  var json = loadSave(L.saveName);
  if (!json) throw new Error('「' + L.saveName + '」の答えが保存データにありません。');
  return {
    saveName: L.saveName,
    answers: json,
    classRows: rowsOf(L.classStart, L.classCount),
    teacherRows: rowsOf(L.teacherStart, L.teacherCount)
  };
}

function writeCheckResult(result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = layout_();
  // 下の「特別教室」は上の表から作り直す
  var sh = ss.getSheetByName(TABLE_SHEET);
  if (sh && result.roomRows && result.roomRows.length === L.roomCount) {
    sh.getRange(L.roomStart, 2, L.roomCount, L.cols - 1).setValues(result.roomRows.map(function (r) { return r.cells; }));
  }
  var cs = ss.getSheetByName(CHECK_SHEET);
  if (cs) cs.clear(); else cs = ss.insertSheet(CHECK_SHEET);
  var rows = [['チェックした日時', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm')], ['', '']];
  rows.push(['必ず直すところ', result.must.length ? result.must.length + '件' : 'ありません']);
  result.must.forEach(function (t) { rows.push(['', t]); });
  rows.push(['', '']);
  rows.push(['できれば直すところ', result.better.length ? result.better.length + '件' : 'ありません']);
  result.better.forEach(function (t) { rows.push(['', t]); });
  cs.getRange(1, 1, rows.length, 2).setValues(rows);
  cs.setColumnWidth(1, 150);
  cs.setColumnWidth(2, 720);
  cs.getRange(1, 1, rows.length, 1).setFontWeight('bold');
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
