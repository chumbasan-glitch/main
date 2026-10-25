# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 生活編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_seikatsu.py <解説 生活編のPDF>  → data/kaisetsu/seikatsu.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_006.pdf
# 生活科の内容は一文の中に「活動」「思考力，判断力，表現力等の基礎」「知識及び技能の基礎」「学びに向かう力，人間性等」が
# 組み込まれている。解説は「〜とは」で始まる太字の段落ごとにそれぞれを説明しているので，太字の言葉の終わり方で観点に分ける
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 5            # PDFの6枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
norm = lambda x: re.sub(r'[\s　]', '', x)

lines = []   # (本のページ, 文字, 字下げ, 右端−m, 見出しの大きさ, 書き出しがゴシックか)
def read(b0, b1):
    out = []
    for book in range(b0, b1 + 1):
        pg = pdf.pages[book + OFFSET]
        m = 119 if book % 2 == 0 else 80
        f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
        for l in f.extract_text_lines(y_tolerance=6):
            t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
            if not t or re.fullmatch(r'\d{1,3}', t): continue
            c = l['chars'][0]
            out.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', '')))
    return out

def paras(seg):
    """段落：字下げ11が始まり。右端まで届かない行で終わる。学習指導要領の引用（右端が短く，2行目から字下げ22）は除く"""
    out, cur, q = [], None, False
    for b, t, off, right, head, goth in seg:
        if head: continue
        if 9 <= off <= 13:
            if cur: out.append(cur)
            q = right <= 393 and re.match(r'^[⑴-⑼]', t) is not None   # 引用の枠
            cur = None if q else {'t': '', 'g': goth}
        if q: continue
        if cur is None: cur = {'t': '', 'g': goth}
        cur['t'] += t
        if right < 390:
            out.append(cur); cur = None
    if cur: out.append(cur)
    return [p for p in out if p['t'].strip()]

def segments(line):
    """内容の一文を「活動を通して，」「〜ことができ，」「〜が分かり／気付くとともに，」で4つに分ける"""
    t = norm(re.sub(r'^[⑴-⑼]', '', line))
    a, rest = t.split('通して，', 1)
    s_, rest = rest.split('ができ，', 1)
    mm = re.search(r'(分かり，|分かるとともに，|気付くとともに，)', rest)
    return {'intro': a, 's': s_, 'k': rest[:mm.end()], 'm': rest[mm.end():]}

def kan_of(lead, seg):
    """太字の言葉（「〜とは」の前）が，内容の一文のどの部分の言葉かで観点を決める"""
    x = norm(lead)
    for n in (12, 8, 5):
        hits = [k for k, v in seg.items() if x[:n] in v]
        if len(hits) == 1: return hits[0]
    return None

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'seikatsu'}
BYNO = {int(i.split('-')[-1]): i for i in ITEMS}
L = read(29, 51)
heads = []
for k, x in enumerate(L):
    mm = re.match(r'^([⑴-⑼])\s*(\S.*)', x[1])
    if mm and 9 <= x[2] <= 13 and x[3] <= 393:
        n = '⑴⑵⑶⑷⑸⑹⑺⑻⑼'.index(mm.group(1)) + 1
        it = ITEMS[BYNO[n]]
        if norm(it['lines'][0])[1:12] == norm(mm.group(2))[:11]: heads.append((k, BYNO[n]))
heads.append((len(L), None))

out = {'source': '小学校学習指導要領（平成29年告示）解説 生活編（文部科学省，平成29年7月）', 'bands': {}, 'items': {}}
for (k, iid), (k2, _) in zip(heads, heads[1:]):
    ps = paras(L[k:k2])
    part = {'intro': [], 'k': [], 's': [], 'm': [], 'x': []}; cur = 'intro'
    seg = segments(ITEMS[iid]['lines'][0])
    for p in ps:
        t = p['t'].replace('　', ' ').strip()
        if t.startswith(('この内容の取扱いに当たっては', 'この内容の学習を行うに当たっては')): cur = 'x'
        elif p['g'] and 'とは' in t[:90]: cur = kan_of(t.split('とは')[0], seg) or cur
        part[cur].append(t)
    out['items'][iid] = {'page': L[k][0], 'name': ITEMS[iid]['head'], 'expl': part}

# 学年の目標（２学年まとめ）：第２章第２節「２ 学年の目標の趣旨」
G = read(19, 22)
k0 = next(i for i, x in enumerate(G) if re.fullmatch(r'2\s*学年の目標の趣旨', x[1]))
gp = [p['t'].replace('　', ' ').strip() for p in paras(G[k0 + 1:])]
out['bands']['12'] = {'goal': {'page': 19, 'expl': {'intro': gp, '1': [], '2': [], '3': []}}}

os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'seikatsu.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], {k: len(v) for k, v in e.items()})
    for kk in ('intro', 'k', 's', 'm', 'x'):
        for t in e[kk]: print('   ', kk, t[:40])
print('goal', len(gp), gp[0][:40], '…', gp[-1][-30:])
