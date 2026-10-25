# 学習指導要領まとめツール：『小学校学習指導要領（平成29年告示）解説 理科編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_rika.py <解説 理科編のPDF>  → data/kaisetsu/rika.json
# PDF: https://www.mext.go.jp/content/20211020-mxt_kyoiku02-100002607_05.pdf
# 理科の解説は，内容ごとに「本内容は…」「ここでは…」「(ｱ)…」「ここで扱う対象…」「ここでの指導に当たっては…」と続き，
# 知識及び技能・思考力，判断力，表現力等に分けて書かれていない。そのため説明はまとめて intro に入れる
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 4            # PDFの5枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
HW = str.maketrans({'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ', 'ｶ': 'カ', '(': '（', ')': '）', **{c: '（%d）' % (i + 1) for i, c in enumerate('⑴⑵⑶⑷⑸⑹⑺⑻⑼')}})
norm = lambda x: re.sub(r'[\s　]', '', x).translate(HW)

lines = []   # (本のページ, 文字, 字下げ, 右端−m, 見出しの大きさ（ゴシックなら文字の大きさ，明朝なら0）)
for i, pg in enumerate(pdf.pages):
    book = i - OFFSET
    if book < 29 or book > 93: continue          # 第3章 各学年の目標及び内容
    m = 119 if book % 2 == 0 else 80               # 左右のページで本文の左端が違う
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 7 and m - 15 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]; fn = c.get('fontname', '')
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if 'Kaku' in fn or 'Gothic' in fn else 0))

def paras(seg):
    out, cur = [], ''
    for b, t, off, right, head in seg:
        if head or t[:1] in '○◎・' or 9 <= off <= 13:   # 字下げ11が段落の始まり
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 390 or head:
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

def strip_quote(seg, official):
    """区切りの先頭にある学習指導要領の引用（本文そのままの行）を除く"""
    o = norm(''.join(official))
    k = 0
    while k < len(seg) and not seg[k][4] and len(norm(seg[k][1])) >= 2 and norm(seg[k][1]) in o:
        k += 1
    return seg[k:]

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'rika'}
KG = '０１２３４５６'
heads = []
for k, L in enumerate(lines):
    t, h = L[1], L[4]
    mm = re.match(r'^第\s*[１-４]節\s*第([１-６])学年の目標及び内容', t)
    if mm and h: heads.append((k, 'grade', KG.index(mm.group(1)))); continue
    if re.fullmatch(r'１\s*第[１-６]学年の目標', t) and h: heads.append((k, 'goal', None)); continue
    if re.fullmatch(r'２\s*第[１-６]学年の内容', t) and h: heads.append((k, 'naiyo', None)); continue
    mm = re.fullmatch(r'([ＡＢ])\s*(物質・エネルギー|生命・地球)', t)
    if mm and h: heads.append((k, 'area', 'AB'['ＡＢ'.index(mm.group(1))])); continue
    mm = re.fullmatch(r'\((\d)\)\s*(\S.*)', t)
    if mm and h == 12 and not mm.group(2).endswith('に関わる目標'): heads.append((k, 'item', (int(mm.group(1)), mm.group(2).replace(' ', '')))); continue
heads.append((len(lines), 'end', None))

out = {'source': '小学校学習指導要領（平成29年告示）解説 理科編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
g = area = None
for (k, kind, v), (k2, _, _) in zip(heads, heads[1:]):
    seg, page = lines[k + 1:k2], lines[k][0]
    if kind == 'grade': g = v; out['grades'][g] = {}; continue
    if kind == 'area': area = v; continue
    if kind == 'goal':
        # 目標の本文（①②③）は字下げが深く右端が短い行。それを除いたものが解説
        body = [L for L in seg if not (L[2] >= 20 and L[3] <= 380) and not re.match(r'^\(\d\)\s*(物質・エネルギー|生命・地球)$', L[1])]
        out['grades'][g]['goal'] = {'page': page, 'expl': {'intro': paras(body), '1': [], '2': [], '3': []}}
        continue
    if kind != 'item': continue
    n, name = v
    iid = f'rika-{g}-{area}-{n}'
    if iid not in ITEMS: print('skip', iid, name); continue
    it = ITEMS[iid]
    # 本文のあとに「（内容の取扱い）」の引用が続くことがある
    notes = [x for j in ITEMS.values() if j['g'] == it['g'] for x in j.get('notes') or []]
    body = strip_quote(seg, [it['title']] + it['lines'] + ['（内容の取扱い）'] + notes)
    # 区分の最後の内容のあとに，区分全体の「（内容の取扱い）」（ものづくりなど）の引用と説明が続く。引用は1つの段落にまとめる
    ps, fixed = paras(body), []
    for p in ps:
        if p.endswith('（内容の取扱い）') and p != '（内容の取扱い）':
            fixed += [p[:-len('（内容の取扱い）')], '（内容の取扱い）']; continue
        if fixed and (fixed[-1] == '（内容の取扱い）' or (fixed[-1].startswith('（内容の取扱い）') and not fixed[-1].endswith('。'))):
            fixed[-1] += ('' if fixed[-1].endswith('）') and fixed[-1] != '（内容の取扱い）' else ' ' if fixed[-1] == '（内容の取扱い）' else '') + p; continue
        if re.match(r'^\(\d\) 内容の「', p) and not (fixed and fixed[-1].startswith('（内容の取扱い）')):
            fixed.append('（内容の取扱い） ' + p); continue
        if fixed and fixed[-1].startswith('（内容の取扱い） (') and not fixed[-1].endswith('。'):
            fixed[-1] += p; continue
        fixed.append(p)
    out['items'][iid] = {'page': page, 'name': name, 'expl': {'intro': fixed, 'k': [], 's': []}}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'rika.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']['intro']; print(iid, 'p', x['page'], x['name'], len(e), '|', e[0][:30], '…', e[-1][-25:])
for gg, x in out['grades'].items(): e = x['goal']['expl']['intro']; print(gg, x['goal']['page'], len(e), e[0][:30], '…', e[-1][-20:])
