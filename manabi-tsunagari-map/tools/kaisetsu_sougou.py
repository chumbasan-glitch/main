# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 総合的な学習の時間編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_sougou.py <解説 総合的な学習の時間編のPDF>  → data/kaisetsu/sougou.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_013_1.pdf
# 第３章第３節「各学校において定める目標及び内容の取扱い」の(1)〜(7)ごとに，引用のあとの説明を取り出す（観点で分けて示されていない）
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 7            # PDFの8枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
norm = lambda x: re.sub(r'[\s　]', '', x).translate(str.maketrans({'(': '（', ')': '）', **{c: '（%d）' % (i + 1) for i, c in enumerate('⑴⑵⑶⑷⑸⑹⑺')}}))

lines = []
for book in range(23, 35):
    pg = pdf.pages[book + OFFSET]
    m = 119 if book % 2 == 0 else 80
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 410 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', ''), l['text'].startswith('\x07')))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'sougou'}
heads = []
for k, L in enumerate(lines):
    mm = re.match(r'^\((\d)\)\s*(\S.*)', L[1])
    if mm and L[2] >= 20 and L[3] <= 390:
        iid = f'sougou-3456-X-{mm.group(1)}'
        if iid in ITEMS and norm(ITEMS[iid]['lines'][0])[3:12] == norm(mm.group(2))[:9]: heads.append((k, iid))
    if L[4] >= 19 and k > 5: heads.append((k, None))   # 次の章
heads.append((len(lines), None))

def paras(seg):
    out, cur, q = [], '', True
    for L in seg:
        b, t, off, right, head, goth, start = L
        if head: continue
        q = off >= 20 and right <= 390 and (q or not cur)     # 内容の見出しのあとの引用の枠
        if q: continue
        if (start or 9 <= off <= 13) and cur: out.append(cur); cur = ''
        cur += t
        if right < 390: out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

out = {'source': '小学校学習指導要領（平成29年告示）解説 総合的な学習の時間編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
for (k, iid), (k2, _) in zip(heads, heads[1:]):
    if not iid: continue
    out['items'][iid] = {'page': lines[k][0], 'name': ITEMS[iid]['head'], 'expl': {'intro': paras(lines[k:k2]), 'k': [], 's': []}}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'sougou.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']['intro']; print(iid, x['page'], len(e), e[0][:40], '…', e[-1][-25:])
