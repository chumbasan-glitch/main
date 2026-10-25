# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 社会編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_shakai.py <解説 社会編のPDF>  → data/kaisetsu/shakai.json
# PDF: https://www.mext.go.jp/content/20230308-mxt_kyoiku02-100002607_003.pdf （令和5年3月の一部改訂版）
# 社会の解説は，内容ごとに「この内容は…」のあと，「アは，『知識及び技能』に関わる事項である。」「イは，『思考力，判断力，
# 表現力等』に関わる事項である。」と観点ごとに説明し，最後に「（内容の取扱い）」の引用とその説明が続く
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3            # PDFの4枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
CIRC = {c: '（%d）' % (i + 1) for i, c in enumerate('⑴⑵⑶⑷⑸⑹⑺⑻⑼')}
HW = str.maketrans({'(': '（', ')': '）', 'ｱ': '（ア）', 'ｲ': '（イ）', **CIRC})
norm = lambda x: re.sub(r'[\s　]', '', x).translate(HW)

lines = []   # (本のページ, 文字, 字下げ, 右端−m, 見出しの大きさ)
for i, pg in enumerate(pdf.pages):
    book = i - OFFSET
    if book < 31 or book > 134: continue          # 第3章 各学年の目標及び内容
    m = 156 if book % 2 == 0 else 106              # 左右のページで本文の左端が違う
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10 and m - 15 <= o['x0'] <= m + 412 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', '')))
# 学習指導要領の引用（枠の中）は，右端が本文より短く（m+396），2行目から字下げが深い
# 1行だけの短い引用（「ア 次のような知識及び技能を身に付けること。」など）は，学習指導要領の本文と同じ文字かで見る
P = json.load(open(os.path.join(ROOT, 'data', 'parsed.json')))['shakai']
OFFICIAL = norm(''.join(l for it in P['items'] for l in [it.get('title', '')] + it['lines'] + (it.get('notes') or [])) +
                ''.join(l for b in P['bands'].values() for l in b['goal']))
# 解説の文字では（ア）の括弧が落ちていることがあるので，括弧を除いて比べる
unp = lambda x: re.sub(r'（([ア-ン])）', r'\1', x)
OFFICIAL_U = unp(OFFICIAL)
inoff = lambda t: len(norm(t)) >= 4 and unp(re.sub(r'^（\d）', '', norm(t))) in OFFICIAL_U
# 行ごとに引用かどうかを決める：字下げ11（段落や引用の書き出し）の行は文字で見て，字下げの深い行は前の行に続く。
# 本文の太字（ゴシック）は学習指導要領の言葉をそのまま使うことが多いので，引用とはしない
QS = []
prev = None
for L in lines:
    b, t, off, right, head, goth = L
    if head or goth: q = False
    elif off >= 20: q = prev if prev is not None else inoff(t)
    elif 9 <= off <= 13: q = inoff(t)
    else: q = False
    QS.append(q); prev = None if head else q
QSET = {id(L) for L, q in zip(lines, QS) if q}
isq = lambda L: id(L) in QSET

def paras(seg):
    out, cur = [], ''
    for b, t, off, right, head, goth in seg:
        if head or 9 <= off <= 13:   # 字下げ11が段落の始まり
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 400 or head:
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'shakai'}
KG = '０１２３４５６'
heads, g = [], None
for k, L in enumerate(lines):
    t, h = L[1], L[4]
    mm = re.match(r'^第\s*\d\s*節\s*第([１-６])学年の目標及び内容', t)
    if mm and h: g = KG.index(mm.group(1)); heads.append((k, 'grade', g)); continue
    if re.fullmatch(r'１\s*第[１-６]学年の目標', t) and h: heads.append((k, 'goal', None)); continue
    if re.fullmatch(r'２\s*第[１-６]学年の内容', t) and h: heads.append((k, 'naiyo', None)); continue
    mm = re.match(r'^\((\d)\)\s*(\S.*)', t)
    if mm and not h and g:   # 内容の見出し：その学年の内容の本文の書き出しと同じ引用の行
        iid = f'shakai-{g}-X-{mm.group(1)}'
        if iid in ITEMS and norm(ITEMS[iid]['title'])[:12] == norm(mm.group(2))[:12]:
            heads.append((k, 'item', iid))
heads.append((len(lines), 'end', None))

def split_kan(ps, first_k):
    """「アは，『知識及び技能』…」「イは，『思考力…』」「（内容の取扱い）」で分ける。
    6年の歴史のように「この内容は，…」から時代ごとの説明がくり返されるときは，区切り（blocks）ごとにも分けておく"""
    part = {'intro': [], 'k': [], 's': [], 't': []}; cur = 'intro'
    blocks = [{'intro': [], 'k': [], 's': []}]
    for p in ps:
        if re.match(r'^アは，「知識及び技能」に関わる', p): cur = 'k'
        elif re.match(r'^イ(のア)?は，「思考力，判断力，表現力等」に関わる', p): cur = 's'
        elif p.startswith('（内容の取扱い）'): cur = 't'; continue
        elif p.startswith('この内容は，') and cur in ('k', 's'):
            cur = 'intro'; blocks.append({'intro': [], 'k': [], 's': []})
        if cur == 't': part['t'].append(p); continue
        blocks[-1][cur].append(p)
        if cur != 'intro' or len(blocks) == 1: part[cur].append(p)
    if len(blocks) > 1:
        for b in blocks:   # 区切りが本文のどの記号（アの（ア）など）の説明か
            ls = [m.group(1) + (m.group(3) or '') for x in b['k'] for m in [re.match(r'^アの([ア-サ])(及び([ア-サ]))?は，', x)] if m]
            b['letters'] = ''.join(dict.fromkeys(''.join(ls)))
        part['blocks'] = blocks
    return part

out = {'source': '小学校学習指導要領（平成29年告示）解説 社会編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
g = None
for (k, kind, v), (k2, _, _) in zip(heads, heads[1:]):
    seg, page = lines[k + 1:k2], lines[k][0]
    if kind == 'grade': g = v; out['grades'][g] = {}; continue
    body = [L for L in seg if not isq(L)]
    if kind == 'goal':
        ps = paras(body)
        part = {'intro': [], '1': [], '2': [], '3': []}; cur = 'intro'
        for p in ps:
            mm = re.match(r'^これは，第[１-６]学年における「(知識及び技能|思考力，判断力，表現力等|学びに向かう力，人間性等)」', p)
            if mm: cur = str(['知識及び技能', '思考力，判断力，表現力等', '学びに向かう力，人間性等'].index(mm.group(1)) + 1)
            part[cur].append(p)
        out['grades'][g]['goal'] = {'page': page, 'expl': part}
        continue
    if kind != 'item': continue
    it = ITEMS[v]
    # 「（内容の取扱い）」の見出しは引用の枠の外にあるので段落として残し，そこから先を内容の取扱いの説明にする
    out['items'][v] = {'page': page, 'name': it['head'], 'expl': split_kan(paras(body), True)}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'shakai.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], x['name'], {k: len(v) for k, v in e.items()}, '|', (e['intro'] or ['?'])[0][:25], '|', (e['k'] or ['?'])[0][:20], '|', (e['s'] or ['?'])[0][:20], '|', (e['t'] or ['-'])[0][:20])
for gg, x in out['grades'].items(): e = x['goal']['expl']; print(gg, x['goal']['page'], {k: len(v) for k, v in e.items()}, e['intro'][:1])
