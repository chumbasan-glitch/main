# 学習指導要領まとめツール：『小学校学習指導要領（平成29年告示）解説 算数編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_sansu.py <解説 算数編のPDF>  → data/kaisetsu/sansu.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_004.pdf
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 5            # PDFの6枚目が本のp.1
KG = '０１２３４５６'
pdf = pdfplumber.open(sys.argv[1])

# ルビ（小さい文字）と余白のつまみ・ページ番号を除いて，行ごとに位置と書体を取る
# 本文の左端 m からの字下げで見分ける：0・11 は解説の文章，それ以外の明朝は学習指導要領の引用（枠の中）
from collections import Counter
lines = []   # (本のページ, 文字, 字下げ, 行の右端−m, ゴシックか)
for i, pg in enumerate(pdf.pages):
    book = i - OFFSET
    if book < 76 or book > 321: continue          # 第3章 各学年の目標及び内容
    f = pg.filter(lambda o: o.get('object_type') != 'char' or o.get('size', 10) >= 7)
    tl = f.extract_text_lines()
    m = 119 if book % 2 == 0 else 69   # 左右のページで本文の左端が違う
    f = f.filter(lambda o: o.get('object_type') != 'char' or (m - 15 <= o['x0'] <= m + 412 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines():
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t: continue
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, 'Gothic' in l['chars'][0].get('fontname', '') or 'Kaku' in l['chars'][0].get('fontname', '')))
near = lambda a, b: abs(a - b) <= 2
is_body = lambda L: not L[4] and (near(L[2], 0) or near(L[2], 11))
clean = [(L[0], L[1]) for L in lines]

def paras(seg):
    """段落にする：字下げ11の行・見出し（ゴシック）から新しい段落。右端まで届かない行で段落が終わる"""
    out, cur, prev = [], '', None
    for L in seg:
        b, t, off, right, goth = L
        cont = prev is not None and prev[4] == goth and prev[3] >= 395   # 前の行が右端まで届いていれば続き
        if not cont and (goth or near(off, 11) or off > 13):
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 395:
            out.append(cur); cur = ''
        prev = L
    if cur: out.append(cur)
    return [p for p in out if p.strip() and not re.fullmatch(r'[-―─\s\d]+', p)]

KS = re.compile(r'^(ア\s*知識及び技能|イ\s*思考力[，・、](判断力[，・、]表現力|表現力[，・、]判断力)等)(\s+[０-９\d])?$')
norm = lambda x: re.sub(r'[\s　]', '', x)

# 区切り：学年の節，学年の目標，学年の内容，各内容「Ａ（3）…」，〔数学的活動〕
heads = []
for k, (b, l) in enumerate(clean):
    m = re.match(r'^第\s*([１-６\d])節\s*第([１-６])学年の目標及び内容', l)
    if m: heads.append((k, 'grade', KG.index(m.group(2)))); continue
    if re.match(r'^1\s*第[１-６]学年の目標$', l): heads.append((k, 'goal', None)); continue
    if re.match(r'^2\s*第[１-６]学年の内容$', l): heads.append((k, 'naiyo', None)); continue
    m = re.match(r'^([ＡＢＣＤ])\s*[（(]\s*(\d+)\s*[）)]\s*(\S.*)$', l)
    if m: heads.append((k, 'item', ('ＡＢＣＤ'.index(m.group(1)), int(m.group(2)), m.group(3)))); continue
    if l in ('〔数学的活動〕',): heads.append((k, 'katsudo', None))
heads.append((len(clean), 'end', None))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'sansu'}
out = {'source': '小学校学習指導要領（平成29年告示）解説 算数編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
g = None
for (k, kind, v), (k2, _, _) in zip(heads, heads[1:]):
    seg = lines[k + 1:k2]
    page = clean[k][0]
    if kind == 'grade': g = v; out['grades'][g] = {'page': page}; continue
    if kind == 'goal':
        first = next((j for j, L in enumerate(seg) if is_body(L)), 0)
        ps = paras(seg[first:])
        # 目標の本文（⑴⑵⑶）のあとが解説。「（1）では」「（2）では」「（3）では」で観点に分ける
        body = [p for p in ps if re.match(r'^（[123]）', p) and not re.match(r'^（[123]）では', p)]
        rest = ps
        part = {'intro': [], '1': [], '2': [], '3': []}; cur = 'intro'
        for p in rest:
            m = re.match(r'^（([123])）では', p)
            if m: cur = m.group(1)
            part[cur].append(p)
        out['grades'][g]['goal'] = {'page': page, 'expl': part}
        continue
    if kind == 'katsudo':
        out['grades'][g]['katsudo'] = {'page': page, 'paras': paras(seg)}
        continue
    if kind != 'item': continue
    a, n, name = v
    iid = f'sansu-{g}-{"ABCD"[a]}-{n}'
    if iid not in ITEMS:
        print('skip', iid, name); continue
    it = ITEMS[iid]
    first = next((j for j, L in enumerate(seg) if is_body(L)), 0)
    ps = paras(seg[first:])
    # 先頭は学習指導要領の本文と内容の取扱いの引用。本文・取扱いの最後の文が出てきたところまでを除く
    # 引用かどうかは，その学年の本文と内容の取扱いの中に，段落の文字の並びがほぼそのまま出てくるかで見る
    official = norm(''.join(x for j in ITEMS.values() if j['g'] == it['g'] for x in j['lines'] + j.get('notes', []) + [j.get('title', '')]))
    official = official.translate(str.maketrans('()⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽', '（）' + '①②③④⑤⑥⑦⑧⑨⑩'))
    official = re.sub(r'([①-⑩])', lambda m: '（' + str('①②③④⑤⑥⑦⑧⑨⑩'.index(m.group(1)) + 1) + '）', official)
    def quoted(p):
        q = norm(p).translate(str.maketrans('()', '（）'))
        if q.startswith(('〔用語・記号〕', '（内容の取扱い）')) or re.fullmatch(r'[（(]\d+[）)]?', q): return True
        win = [q[i:i + 8] for i in range(0, max(1, len(q) - 7), 4)]
        return bool(win) and sum(w in official for w in win) / len(win) >= 0.6
    last = 0
    while False:   # 引用は位置（字下げ）で除いた
        last += 1
    body = [p for p in ps[last:] if not re.fullmatch(r'[-―─\s\d]+', p)]   # ページの区切り線など
    part = {'intro': [], 'k': [], 's': []}; cur = 'intro'
    for p in body:
        if re.match(r'^ア\s*知識及び技能$', p): cur = 'k'; continue
        if KS.match(p) and p.startswith('イ'): cur = 's'; continue
        part[cur].append(p)
    out['items'][iid] = {'page': page, 'name': name, 'expl': part, 'quoteEnd': last}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'sansu.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items;', 'missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in list(out['items'].items())[:66]:
    e = x['expl']; print(iid, 'p', x['page'], 'quoteEnd', x['quoteEnd'], 'intro', len(e['intro']), 'k', len(e['k']), 's', len(e['s']))
