# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 図画工作編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_zuko.py <解説 図画工作編のPDF>  → data/kaisetsu/zuko.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_008.pdf
# 解説は「第１学年及び第２学年 『Ａ表現』(1)ア」のような見出しごとに，引用のあと「この事項は，…『思考力，判断力，表現力等』…」と続く。
# 観点は事項で決まる：Ａ表現(1)（発想や構想）とＢ鑑賞は思考力等，Ａ表現(2)（技能）は技能，〔共通事項〕はアが知識，イが思考力等
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3            # PDFの4枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])

lines = []
for book in range(35, 104):
    pg = pdf.pages[book + OFFSET]
    m = 119 if book % 2 == 0 else 69
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 410 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', '')))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'zuko'}
LINEKAN = {'A-1': {'ア': 's', 'イ': 's'}, 'A-2': {'ア': 'k', 'イ': 'k'}, 'B-1': {'ア': 's', 'イ': 's'}, 'K-1': {'ア': 'k', 'イ': 's'}}
BANDS = {'第１学年及び第２学年': '12', '第３学年及び第４学年': '34', '第５学年及び第６学年': '56'}
AREA = {'「Ａ表現」': 'A', '「Ｂ鑑賞」': 'B', '〔共通事項〕': 'K'}
heads = []
for k, L in enumerate(lines):
    mm = re.search(r'第\s*\d\s*節\s*(第[１-６]学年及び第[１-６]学年)の目標と内容', L[1])
    if mm and L[4]: heads.append((k, 'band', BANDS[mm.group(1)], None)); continue
    mm = re.fullmatch(r'(第[１-６]学年及び第[１-６]学年)\s*(「Ａ表現」|「Ｂ鑑賞」|〔共通事項〕)\((\d)\)([アイ]?)', L[1])
    if mm and L[5] and L[2] <= 2:
        heads.append((k, 'sec', f'zuko-{BANDS[mm.group(1)]}-{AREA[mm.group(2)]}-{mm.group(3)}', mm.group(4)))
heads.append((len(lines), 'end', None, None))

def body(seg):
    """見出しのすぐあとの引用（字下げ11で右端が本文より短い行と，その続きの字下げ22の行）を除く"""
    k = 0
    while k < len(seg) and not seg[k][4] and (seg[k][2] >= 20 or (9 <= seg[k][2] <= 13 and seg[k][3] <= 398)):
        k += 1
    return seg[k:]

def paras(seg):
    out, cur = [], ''
    for b, t, off, right, head, goth in seg:
        if head: continue
        if 9 <= off <= 13:
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 400:
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

out = {'source': '小学校学習指導要領（平成29年告示）解説 図画工作編（文部科学省，平成29年7月）', 'bands': {}, 'items': {}}
band = None
for (k, kind, v, letter), (k2, _, _, _) in zip(heads, heads[1:]):
    seg, page = lines[k + 1:k2], lines[k][0]
    if kind == 'band':
        band = v
        stop = next((i for i, L in enumerate(seg) if re.fullmatch(r'２\s*内\s*容', L[1])), len(seg))
        # 目標の引用（(1)〜(3)）は字下げがあり右端が短い行
        g = [L for L in seg[:stop] if not (not L[5] and (L[2] >= 20 or (9 <= L[2] <= 13 and L[3] <= 398)))]
        part = {'intro': [], '1': [], '2': [], '3': []}; cur = 'intro'
        for p in paras(g):   # 「(1)は，『知識及び技能』に関する目標であり…」から観点ごと
            mm = re.fullmatch(r'学年の目標\(([123])\)', p)
            if mm: cur = mm.group(1); continue
            mm = re.match(r'^\(([123])\)は，', p)
            if mm: cur = mm.group(1)
            part[cur].append(p)
        out['bands'][band] = {'goal': {'page': page, 'expl': part}}
        continue
    if kind != 'sec': continue
    it = ITEMS[v]
    x = out['items'].setdefault(v, {'page': page, 'name': it['head'], 'expl': {'intro': [], 'k': [], 's': []}})
    ps = paras(body(seg))
    if not letter: x['expl']['intro'] += ps; continue
    kan = LINEKAN[v.split('-', 2)[2]][letter]
    x['expl'][kan] += [next(l for l in it['lines'] if l.startswith(letter + '　'))] + ps   # 事項の本文を見出しにする
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'zuko.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], {k: len(v) for k, v in e.items()})
    for kk in ('intro', 'k', 's'):
        for t in e[kk][:3]: print('   ', kk, t[:44])
for b, x in out['bands'].items(): print(b, {k: len(v) for k, v in x['goal']['expl'].items()})
