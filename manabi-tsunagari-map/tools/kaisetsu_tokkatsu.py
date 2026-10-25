# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 特別活動編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_tokkatsu.py <解説 特別活動編のPDF>  → data/kaisetsu/tokkatsu.json
# PDF: https://www.mext.go.jp/content/20221213-mxt_kyoiku02-100002607_014.pdf
# 第３章の各活動・学校行事の「２ 〜の内容」から，(1)(2)…の見出し（学級活動は，さらにア・イ・ウ）ごとに説明を取り出す。
# 特別活動は観点（知識及び技能など）で分けて示されていないので，説明はまとめて出す
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 5            # PDFの6枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
norm = lambda x: re.sub(r'[\s　]', '', x)

lines = []
for book in range(46, 132):
    pg = pdf.pages[book + OFFSET]
    m = 119 if book % 2 == 0 else 80
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 15 <= o['x0'] <= m + 410 and 22 < o['top'] < pg.height - 45))
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        c = l['chars'][0]
        lines.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in c.get('fontname', ''), l['text'].startswith('\x07')))

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'tokkatsu'}
PRE = {'学級活動': 'tokkatsu-123456-GK-', '児童会活動': 'tokkatsu-123456-JK-', 'クラブ活動': 'tokkatsu-456-CL-', '学校行事': 'tokkatsu-123456-GG-'}

def paras(seg):
    """段落：右端まで届かない行で終わる。学習指導要領の引用（字下げ33の行と，その続きの短い行）は除く"""
    out, cur, q, pr = [], '', False, 0
    for L in seg:
        b, t, off, right, head, goth, start = L
        if head: continue
        # 引用の枠：右端が本文より短い（m+374）。前の行が段落の終わり（または引用）のときだけ始まる。箇条書き（ア …）の続きの字下げ33の行は本文
        q = (off >= 30 and right <= 385 and (q or pr < 390)) or (q and off >= 20 and right <= 385)
        pr = right
        if q: continue
        if goth and re.match(r'^[①-⑩]', t):          # 「① 儀式的行事のねらいと内容」などの小見出し
            if cur: out.append(cur)
            out.append(t); cur = ''; continue
        if start and cur: out.append(cur); cur = ''
        cur += t
        if right < 390:
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [p.replace('　', ' ').strip() for p in out if p.strip()]

heads, pre = [], None
for k, L in enumerate(lines):
    t, h = L[1], L[4]
    mm = re.fullmatch(r'２\s*(学級活動|児童会活動|クラブ活動|学校行事)の内容', t)
    if mm and h: pre = PRE[mm.group(1)]; continue
    if re.fullmatch(r'３\s*\S+の指導計画', t) and h: heads.append((k, None)); pre = None; continue
    mm = re.match(r'^\((\d)\)\s*(\S.*)', t)
    if mm and h == 12 and pre:
        heads.append((k, pre + mm.group(1)))
heads.append((len(lines), None))

out = {'source': '小学校学習指導要領（平成29年告示）解説 特別活動編（文部科学省，平成29年7月）', 'grades': {}, 'items': {}}
for (k, key), (k2, _) in zip(heads, heads[1:]):
    if not key: continue
    seg = lines[k + 1:k2]
    if key in ITEMS:
        out['items'][key] = {'page': lines[k][0], 'name': re.sub(r'^[⑴-⑼]　', '', ITEMS[key]['lines'][0]), 'expl': {'intro': paras(seg), 'k': [], 's': []}}
        continue
    # 学級活動：(1)〜(3) の中を ア・イ・ウ… の項目に分ける。項目の前の説明は，その (n) 全体の説明として各項目に添える
    subs = {i: it for i, it in ITEMS.items() if i.startswith(key)}
    marks = []
    for j, L in enumerate(seg):
        mm = re.match(r'^([アイウエ])\s+(\S.*)', L[1])
        if mm and L[2] <= 2 and not L[6] and not L[5]:
            iid = key + mm.group(1)
            if iid in subs and norm(subs[iid]['lines'][0])[1:9] == norm(mm.group(2))[:8]: marks.append((j, iid))
    whole = paras(seg[:marks[0][0]]) if marks else paras(seg)
    title = next(iter(subs.values()))['title']
    for (j, iid), (j2, _) in zip(marks, marks[1:] + [(len(seg), None)]):
        out['items'][iid] = {'page': seg[j][0], 'name': re.sub(r'^[アイウエ]　', '', subs[iid]['lines'][0]),
                             'expl': {'intro': paras(seg[j + 1:j2]), 'k': [], 's': [], 'x': whole, 'xh': '学級活動「' + title + '」全体について'}}
os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'tokkatsu.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for iid, x in out['items'].items():
    e = x['expl']; print(iid, x['page'], x['name'][:20], len(e['intro']), len(e.get('x', [])), (e['intro'] or ['?'])[0][:30], '…', (e['intro'] or ['?'])[-1][-20:])
