# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 家庭編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_katei.py <解説 家庭編のPDF>  → data/kaisetsu/katei.json
# PDF: https://www.mext.go.jp/content/20240918-mxt_kyoiku01-100002607_02.pdf
# 家庭の解説は，項目ごとに学習指導要領の引用（本文・内容の取扱い・指導計画の作成）のあと，
# 太字の「ア …」（知識及び技能）「イ …」（思考力，判断力，表現力等）を見出しにして説明が続く
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 5            # PDFの6枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
CIRC = '⑴⑵⑶⑷⑸⑹⑺⑻⑼'
norm = lambda x: re.sub(r'[\s　]', '', x).translate(str.maketrans({'(': '（', ')': '）', **{c: '（%d）' % (i + 1) for i, c in enumerate(CIRC)}}))

lines = []   # (本のページ, 文字, 字下げ, 右端−m, 見出しの大きさ, ゴシックか)
for book in range(20, 70):
    pg = pdf.pages[book + OFFSET]
    m = 119 if book % 2 == 0 else 80
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', '')))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'katei'}
OFFICIAL = norm(''.join(l for it in ITEMS.values() for l in [it['title']] + it['lines'] + (it.get('notes') or [])))
inoff = lambda t: len(norm(t)) >= 4 and re.sub(r'^（\d）', '', norm(t)) in OFFICIAL

# 引用の枠：右端が本文（m+396）より短い（m+385）。2行目からは字下げが深い。（内容の取扱い）などの札は左にはみ出す
def isq(L):
    b, t, off, right, head, goth = L
    if head or goth: return False
    if off < 0: return True
    if off >= 20: return right <= 393
    if 9 <= off <= 13: return 378 <= right <= 393 or (right < 378 and inoff(t))
    return False

heads, area = [], None
for k, L in enumerate(lines):
    mm = re.fullmatch(r'([ＡＢＣ])\s*(家族・家庭生活|衣食住の生活|消費生活・環境)', L[1])
    if mm and L[4]: area = 'ABC'['ＡＢＣ'.index(mm.group(1))]; heads.append((k, None)); continue
    mm = re.fullmatch(r'([⑴-⑹])\s*(\S.*)', L[1])
    if mm and isq(L) and area:
        iid = f'katei-56-{area}-{CIRC.index(mm.group(1)) + 1}'
        if iid in ITEMS and norm(ITEMS[iid]['title']) == norm(mm.group(2)): heads.append((k, iid))
heads.append((len(lines), None))

def paras(seg):
    out, cur, prev = [], '', None
    for L in seg:
        b, t, off, right, head, goth = L
        hd = goth and re.match(r'^[アイウ](\s|（)', t) and off <= 2          # 太字の「ア …」「イ …」の見出し
        cont = prev is not None and prev[5] and goth and prev[3] >= 390 or (prev is not None and prev[5] and goth and re.match(r'^[アイウ](\s|（)', prev[1]) and 9 <= off <= 13)
        if head or hd or (9 <= off <= 13 and not cont):
            if cur: out.append(cur)
            cur = ''
        if head: prev = L; continue
        cur += t
        if right < 390:
            out.append(cur); cur = ''
        prev = L
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

out = {'source': '小学校学習指導要領（平成29年告示）解説 家庭編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
for (k, iid), (k2, _) in zip(heads, heads[1:]):
    if not iid: continue
    body = [L for L in lines[k:k2] if not isq(L) and not re.fullmatch(r'(食生活|衣生活|住生活)', L[1])]
    part = {'intro': [], 'k': [], 's': []}; cur = 'intro'
    for p in paras(body):
        if re.match(r'^ア[ （]', p): cur = 'k'
        elif re.match(r'^イ[ （]', p): cur = 's'
        part[cur].append(p)
    if iid == 'katei-56-A-4':   # Ａ⑷のアは〔思考力，判断力，表現力等〕の指導事項
        part['s'] = part.pop('intro'); part['intro'] = []; part['k'] = []
    out['items'][iid] = {'page': lines[k][0], 'name': ITEMS[iid]['title'], 'expl': part}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'katei.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], x['name'], {k: len(v) for k, v in e.items()})
    for kk in ('intro', 'k', 's'):
        for t in e[kk]: print('   ', kk, t[:44])
