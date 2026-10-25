# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 特別の教科 道徳編』から，内容項目ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_doutoku.py <解説 道徳編のPDF>  → data/kaisetsu/doutoku.json
# PDF: https://www.mext.go.jp/content/20260318-mxt_kyoiku01-100002607_12.pdf
# 第３章第２節は，内容項目ごとに学年段階の引用のあと「(1) 内容項目の概要」「(2) 指導の要点」（■ 第１学年及び第２学年 など）が続く。
# 道徳科は観点（知識及び技能など）で分けて示されていないので，概要を「解説の説明」に，学年段階の指導の要点を別の見出しに入れる
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 5            # PDFの6枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])

lines = []
for book in range(28, 72):
    pg = pdf.pages[book + OFFSET]
    m = 156 if book % 2 == 0 else 117
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 410 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, 'Kaku' in c.get('fontname', ''), l['text'].startswith('\x07')))   # \x07 は段落の書き出しの印

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'doutoku'}
BANDS = {'第１学年及び第２学年': '12', '第３学年及び第４学年': '34', '第５学年及び第６学年': '56'}

def paras(seg):
    """段落：\x07 の印があればそれで，なければ字下げ11で分ける。右端まで届かない行で終わる。ページの切れ目で切れた段落はつなぐ"""
    marked = any(L[5] for L in seg)
    out, cur = [], ''
    for b, t, off, right, goth, start in seg:
        if (start if marked else 9 <= off <= 13):
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 390 and t.endswith('。'):
            out.append(cur); cur = ''
    if cur: out.append(cur)
    res = []
    for p in (p.replace('　', ' ').strip() for p in out if p.strip()):
        if res and not res[-1].endswith(('。', '」', '）')): res[-1] += p
        else: res.append(p)
    return res

heads, area = [], None
for k, L in enumerate(lines):
    mm = re.fullmatch(r'([ＡＢＣＤ])\s*主として.*', L[1])
    if mm and L[4]: area = 'ABCD'['ＡＢＣＤ'.index(mm.group(1))]; heads.append((k, None)); continue
    mm = re.fullmatch(r'([０-９\d]+)\s+(\S.*)', L[1])
    if mm and L[4] and area:
        n = int(mm.group(1).translate(str.maketrans('０１２３４５６７８９', '0123456789')))
        heads.append((k, (area, n, mm.group(2))))
heads.append((len(lines), None))

out = {'source': '小学校学習指導要領（平成29年告示）解説 特別の教科 道徳編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
for (k, h), (k2, _) in zip(heads, heads[1:]):
    if not h: continue
    area, n, name = h
    seg = lines[k + 1:k2]
    i1 = next(i for i, L in enumerate(seg) if L[4] and re.match(r'^\(1\)\s*内容項目の概要', L[1]))
    i2 = next(i for i, L in enumerate(seg) if L[4] and re.match(r'^\(2\)\s*指導の要点', L[1]))
    gaiyo = paras(seg[i1 + 1:i2])
    bands, cur = {}, None
    for L in seg[i2 + 1:]:
        mm = re.match(r'^■\s*(第[１-６]学年及び第[１-６]学年)', L[1])
        if mm and L[4]: cur = BANDS[mm.group(1)]; bands[cur] = []; continue
        if cur: bands[cur].append(L)
    for b, ls in bands.items():
        iid = f'doutoku-{b}-{area}-{n:02d}'
        if iid not in ITEMS: print('skip', iid, name); continue
        out['items'][iid] = {'page': lines[k][0], 'name': name, 'expl': {'intro': gaiyo, 'k': [], 's': [], 'x': paras(ls), 'xh': '指導の要点（' + {'12': '第１学年及び第２学年', '34': '第３学年及び第４学年', '56': '第５学年及び第６学年'}[b] + '）'}}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'doutoku.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in list(out['items'].items())[:6] + list(out['items'].items())[-3:]:
    e = x['expl']; print(iid, x['page'], x['name'], len(e['intro']), len(e['x']), e['intro'][0][:30], '|', e['x'][0][:30], '…', e['x'][-1][-20:])
