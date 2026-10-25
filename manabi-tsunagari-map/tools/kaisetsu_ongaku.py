# 学習指導要領まとめツール：『小学校学習指導要領（平成29年告示）解説 音楽編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_ongaku.py <解説 音楽編のPDF>  → data/kaisetsu/ongaku.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_007.pdf
# 音楽の内容は，アが「思考力，判断力，表現力等」，イが「知識」，ウが「技能」（〔共通事項〕はアが思考力等，イが知識）。
# 解説は事項（ア・イ・ウ）ごとに引用のあと「この事項は，…における『○○』に関する資質・能力である…」と説明が続く
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3            # PDFの4枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
HW = str.maketrans({'(': '（', ')': '）', 'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ', **{c: '（%d）' % (i + 1) for i, c in enumerate('⑴⑵⑶⑷⑸⑹')}})
norm = lambda x: re.sub(r'[\s　]', '', x).translate(HW)

lines = []
for book in range(29, 114):
    pg = pdf.pages[book + OFFSET]
    m = 119 if book % 2 == 0 else 80
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', '')))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'ongaku'}
OFFICIAL = norm(''.join(l for it in ITEMS.values() for l in [it['title']] + it['lines'] + (it.get('notes') or [])))
inoff = lambda t: len(norm(t)) >= 4 and re.sub(r'^（\d）', '', norm(t)) in OFFICIAL

# 引用の枠（右端が本文より短い）。前の行が引用なら，字下げのある短い行も引用の続き
QS, prev = [], False
for L in lines:
    b, t, off, right, head, goth = L
    if head or goth: q = False
    elif off < 0: q = True                                   # （指導計画の作成と内容の取扱い）などの札
    elif off >= 20: q = right <= 390
    elif 9 <= off <= 13: q = 378 <= right <= 390 or (right < 378 and (prev or inoff(t)))
    else: q = False
    QS.append(q); prev = q
isq = {id(L) for L, q in zip(lines, QS) if q}

BANDS = {'第１学年及び第２学年': '12', '第３学年及び第４学年': '34', '第５学年及び第６学年': '56'}
heads, band, area = [], None, None
for k, L in enumerate(lines):
    t, h = L[1], L[4]
    mm = re.search(r'第[１-３]節\s*(第[１-６]学年及び第[１-６]学年)の目標と内容', t)
    if mm and h: band = BANDS[mm.group(1)]; heads.append((k, 'band', band)); continue
    if re.fullmatch(r'１\s*目\s*標', t) and h: heads.append((k, 'goal', None)); continue
    if re.fullmatch(r'３\s*内容の取扱い', t) and h: heads.append((k, 'tori', None)); continue
    if re.fullmatch(r'Ａ\s*表\s*現', t) and h: area = 'A'; continue
    if re.fullmatch(r'Ｂ\s*鑑\s*賞', t) and h: area = 'B'; continue
    if re.fullmatch(r'〔共通事項〕', t) and h >= 13: area = 'K'; continue
    mm = re.match(r'^\((\d)\)\s*(\S.*)', t)
    if mm and h == 12 and area and heads and heads[-1][1] != 'tori':
        iid = f'ongaku-{band}-{area}-{mm.group(1)}'
        if iid in ITEMS and norm(ITEMS[iid]['title'])[:10] == norm(mm.group(2))[:10]: heads.append((k, 'item', iid))
heads.append((len(lines), 'end', None))

def paras(seg):
    out, cur = [], ''
    for b, t, off, right, head, goth in seg:
        if head: continue
        if 9 <= off <= 13:
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 390:
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

KAN = {'思考力，判断力，表現力等': 's', '知識': 'k', '技能': 'k', '知識及び技能': 'k'}
out = {'source': '小学校学習指導要領（平成29年告示）解説 音楽編（文部科学省，平成29年7月）', 'bands': {}, 'items': {}}
for (k, kind, v), (k2, _, _) in zip(heads, heads[1:]):
    seg, page = lines[k + 1:k2], lines[k][0]
    if kind == 'band': band = v; out['bands'][band] = {}; continue
    if kind == 'goal':
        out['bands'][band]['goal'] = {'page': page, 'expl': {'intro': paras([L for L in seg if id(L) not in isq]), '1': [], '2': [], '3': []}}
        continue
    if kind == 'tori':
        qs = [L[1] for L in seg if L[4] == 12 or id(L) in isq]
        out['bands'][band]['toriatsukai'] = {'page': page, 'quote': [x for x in qs if re.match(r'^\(\d\)', x)], 'paras': paras([L for L in seg if id(L) not in isq and L[4] != 12])}
        continue
    if kind != 'item': continue
    it = ITEMS[v]
    tops = {l[0]: l for l in it['lines'] if re.match(r'^[アイウ]　', l)}
    part = {'intro': [], 'k': [], 's': []}; cur = 'intro'
    started, pend, buf = False, None, []   # started：はじめの引用（内容の本文全体）が終わったか
    for L in seg:
        if id(L) in isq:
            mm = re.match(r'^([アイウ])\s*(\S.*)', L[1])
            if started and mm and mm.group(1) in tops and norm(tops[mm.group(1)])[1:9] == norm(mm.group(2))[:8]:
                part[cur].extend(paras(buf)); buf = []; pend = tops[mm.group(1)]
            continue
        if L[4]: continue   # 内容の見出し（太字）の2行目など
        started = True
        buf.append(L)
        if pend:   # 事項の引用のあと最初の段落「この事項は，…『○○』に関する…」で観点を決める
            mm = re.search(r'「(思考力，判断力，表現力等|知識及び技能|知識|技能)」に関する', ''.join(x[1] for x in buf))
            if mm or len(buf) > 6:
                cur = KAN[mm.group(1)] if mm else cur
                part[cur].append(pend); pend = None
    part[cur].extend(paras(buf))
    out['items'][v] = {'page': page, 'name': it['head'], 'expl': part}

os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'ongaku.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, 'p', x['page'], x['name'], {k: len(v) for k, v in e.items()})
    for kk in ('intro', 'k', 's'):
        for t in e[kk]:
            if re.match(r'^[アイウ]　|^この事項', t) or kk == 'intro': print('   ', kk, t[:40])
for b, x in out['bands'].items(): print(b, len(x['goal']['expl']['intro']), x['toriatsukai']['page'], x['toriatsukai']['quote'][:3], len(x['toriatsukai']['paras']))
