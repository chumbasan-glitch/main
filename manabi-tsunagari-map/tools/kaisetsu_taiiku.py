# 学習指導要領まとめツール：『小学校学習指導要領（平成29年告示）解説 体育編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_taiiku.py <解説 体育編のPDF>  → data/kaisetsu/taiiku.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_010.pdf
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3            # PDFの4枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])

# ルビと余白のつまみ・ページ番号を除いて行ごとに（本のページ, 文字, 字下げ, 右端, ゴシックか）
lines = []
for i, pg in enumerate(pdf.pages):
    book = i - OFFSET
    if book < 36 or book > 160: continue          # 第2章 第2節 各学年の目標及び内容
    m = 119 if book % 2 == 0 else 80               # 左右のページで本文の左端が違う
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines():
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        fn = l['chars'][0].get('fontname', '')
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, 'Kaku' in fn or 'Gothic' in fn))
near = lambda a, b: abs(a - b) <= 2
norm = lambda x: re.sub(r'[\s　]', '', x).translate(str.maketrans({'(': '（', ')': '）', 'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ', 'ｶ': 'カ', 'ｷ': 'キ', '⑴': '（1）', '⑵': '（2）', '⑶': '（3）', '⑷': '（4）', '⑸': '（5）', '⑹': '（6）', '⑺': '（7）', '⑻': '（8）', '⑼': '（9）'}))
isq = lambda L: not L[4] and L[2] >= 20 and L[3] <= 378   # 引用の枠の中の行（字下げが深く，右端が短い）

def paras(seg):
    out, cur, prev = [], '', None
    for L in seg:
        b, t, off, right, goth = L
        cont = prev is not None and prev[4] == goth and prev[3] >= 388
        if not cont and (goth or near(off, 11) or off > 13 or t[:1] in '○◎・［'):
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 388:
            out.append(cur); cur = ''
        prev = L
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

def strip_quote(seg, official):
    """区切りの先頭にある学習指導要領の引用（本文そのままの行）を除く"""
    o = norm(''.join(official))
    k = 0
    while k < len(seg) and not seg[k][4] and len(norm(seg[k][1])) >= 2 and (norm(seg[k][1]) in o or isq(seg[k])):   # 見出し（ゴシック）は引用ではない
        k += 1
    return seg[k:]

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'taiiku'}
SUBJ = json.load(open(os.path.join(ROOT, 'data', 'items.json')))
BANDS = {'〔第１学年及び第２学年〕': '12', '〔第３学年及び第４学年〕': '34', '〔第５学年及び第６学年〕': '56'}
HOKEN = {('34', 1): 'taiiku-3-G-1', ('34', 2): 'taiiku-4-G-2', ('56', 1): 'taiiku-5-G-1', ('56', 2): 'taiiku-5-G-2', ('56', 3): 'taiiku-6-G-3'}

# 見出しを拾う
heads = []
for k, L in enumerate(lines):
    t = L[1]
    if t in BANDS: heads.append((k, 'band', BANDS[t])); continue
    if re.fullmatch(r'１\s*目\s*標', t): heads.append((k, 'goal', None)); continue
    if re.fullmatch(r'２\s*内\s*容', t): heads.append((k, 'naiyo', None)); continue
    if re.fullmatch(r'３\s*内容の取扱い', t): heads.append((k, 'toriatsukai', None)); continue
    mm = re.fullmatch(r'([ＡＢＣＤＥＦＧ])\s+(\S.*)', t)
    if mm and L[4]: heads.append((k, 'area', ('ABCDEFG'['ＡＢＣＤＥＦＧ'.index(mm.group(1))], mm.group(2).replace(' ', '')))); continue
    mm = re.fullmatch(r'\(([123])\)\s*(知識及び(技能|運動)|思考力，判断力，表現力等|学びに向かう力，人間性等|健康な生活|体の発育・発達|心の健康|けがの防止|病気の予防)(\s.*)?', t)
    if mm and L[4]: heads.append((k, 'sub', (int(mm.group(1)), mm.group(2)))); continue
heads.append((len(lines), 'end', None))

out = {'source': '小学校学習指導要領（平成29年告示）解説 体育編（文部科学省，平成29年7月）', 'bands': {}, 'items': {}}
band = area = None
for (k, kind, v), (k2, _, _) in zip(heads, heads[1:]):
    seg, page = lines[k + 1:k2], lines[k][0]
    if kind == 'band':
        band = v; out['bands'][band] = {}; continue
    if kind == 'goal':
        b = next(x for x in SUBJ['subjects'] if x['id'] == 'taiiku') if False else None
        ps = paras(seg)
        # 目標の本文（(1)〜(3)）は引用。「(1)は，」「(2)は，」「(3)は，」からが解説
        part = {'intro': [], '1': [], '2': [], '3': []}; cur = None
        for p in ps:
            mm = re.match(r'^\(([123])\)は[，、]', p)
            if mm: cur = mm.group(1)
            if cur: part[cur].append(p)
        out['bands'][band]['goal'] = {'page': page, 'expl': part}
        continue
    if kind == 'toriatsukai':
        q, j = [], 0
        while j < len(seg) and isq(seg[j]):
            t = seg[j][1]
            if re.match(r'^\(\d+\)', t) or not q: q.append(t)
            else: q[-1] += t
            j += 1
        out['bands'][band]['toriatsukai'] = {'page': page, 'quote': q, 'paras': paras(seg[j:])}
        continue
    if kind == 'area':
        area = v
        if area[0] != 'G':
            iid = f'taiiku-{band}-{area[0]}-0'
            assert iid in ITEMS, iid
            it = ITEMS[iid]
            body = strip_quote(seg, [it.get('title', '')])
            intro = [p for p in paras(body) if norm(p) != norm(it.get('title', ''))]   # 引用の「…について，次の事項を…指導する。」
            out['items'][iid] = {'page': page, 'name': area[1], 'expl': {'intro': intro, 'k': [], 's': [], 'm': []}}
        continue
    if kind == 'sub':
        n, name = v
        if area[0] == 'G':
            iid = HOKEN[(band, n)]; it = ITEMS[iid]
            body = strip_quote(seg, [name, f'({n})' + it.get('title', '')] + it['lines'])
            part = {'intro': [], 'k': [], 's': [], 'm': []}; cur = 'intro'
            for p in paras(body):
                if re.fullmatch(r'ア\s*知識(及び技能)?', p): cur = 'k'; continue
                if re.fullmatch(r'イ\s*思考力，判断力，表現力等', p): cur = 's'; continue
                part[cur].append(p)
            out['items'][iid] = {'page': page, 'name': '保健：' + name, 'expl': part}
        else:
            iid = f'taiiku-{band}-{area[0]}-0'; it = ITEMS[iid]
            mark = '⑴⑵⑶'[n - 1]
            sub = []; on = False
            for l in it['lines']:
                if l.startswith('⑴⑵⑶'[n - 1]): on = True
                elif l[:1] in '⑴⑵⑶': on = False
                if on: sub.append(l)
            body = strip_quote(seg, sub)
            out['items'][iid]['expl']['ksm'[n - 1]] = paras(body)
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'taiiku.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], {k: len(v) for k, v in e.items()}, '|', (e['intro'] or e['k'] or ['?'])[0][:40])
for b, x in out['bands'].items(): print(b, {k: len(v) for k, v in x['goal']['expl'].items()}, 'toriatsukai', len(x.get('toriatsukai', {}).get('paras', [])))
