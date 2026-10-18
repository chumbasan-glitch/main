# 日文 図工 題材別カリキュラム：1ページの左右に1題材ずつ。題材名・参考時数・主な学習内容（○）を取る
import pdfplumber, re, json, sys
Z = str.maketrans('０１２３４５６７８９', '0123456789')
out = []
pdf = pdfplumber.open(sys.argv[1])
for pg in pdf.pages:
    W = pg.width / 2
    for side in (0, 1):
        x0, x1 = side * W, (side + 1) * W
        chars = [c for c in pg.chars if x0 <= c['x0'] < x1]
        ws = [w for w in pg.extract_words(x_tolerance=1.5) if x0 <= w['x0'] < x1]
        hd = next((w for w in ws if w['text'] == '主な学習内容'), None)
        if not hd: continue
        mt = next((w for w in ws if w['text'] == '主な材料・用具'), None)
        ev = next((w for w in ws if w['text'] == '評価規準の例' and w['top'] > hd['top']), None)
        pw = next((w for w in ws if re.match(r'p\.\d', w['text'])), None)
        if not (mt and ev and pw): print('skip', pg.page_number, side); continue
        top = pw['top']
        title = ''.join(c['text'] for c in sorted(chars, key=lambda c: c['x0']) if abs(c['top'] - top) < 3 and 'ShinGo' in c['fontname'] and c['size'] > 9).strip()
        sub = ''.join(c['text'] for c in sorted(chars, key=lambda c: c['x0']) if top + 8 < c['top'] < top + 20 and c['x0'] < x0 + 300)
        m = re.search(r'～([^～]+)～', sub)
        line = lambda lo, hi: ''.join(c['text'] for c in sorted(chars, key=lambda c: c['x0']) if lo < c['top'] < hi and c['x0'] < x0 + 420)
        hline = (re.sub(r'p\.[\d\-]+', '', line(top - 3, top + 3)) + '　' + line(top + 8, top + 20)).translate(Z)
        if not re.search(r'\d', hline): print('NOH', pg.page_number, side, repr(hline), repr(line(top-3,top+30)))
        hm = re.search(r'(\d+)\s*[～〜~]\s*(\d+)', hline) or re.search(r'(\d+)()', hline)
        cx = (hd['x0'] + hd['x1']) / 2
        rs = [r for r in pg.rects if r['x0'] - 1 <= cx <= r['x1'] + 1 and r['top'] - 3 <= hd['top'] <= r['bottom'] and r['x1'] - r['x0'] < 260]
        bx0, bx1 = (min(r['x0'] for r in rs), max(r['x1'] for r in rs)) if rs else (hd['x0'] - 82, mt['x0'] - 50)
        box = pg.crop((bx0 + 0.5, hd['bottom'] + 2, bx1 - 0.5, ev['top'] - 2))
        txt = box.extract_text(x_tolerance=1.5) or ''
        acts, cur = [], None
        for ln in txt.split('\n'):
            ln = ln.strip()
            if not ln: continue
            if ln[0] in '○〇': acts.append(ln[1:])
            elif acts: acts[-1] += ln
        out.append({'page': pg.page_number, 'pp': pw['text'], 'title': re.sub(r'\s+', ' ', title), 'sub': m.group(1).strip() if m else '', 'hmin': int(hm.group(1)), 'hmax': int(hm.group(2) or hm.group(1)), 'acts': acts})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for u in out: print(u['pp'], u['title'], u['sub'], u['hmin'], u['hmax'], len(u['acts']))
print(len(out), sum(u['hmin'] for u in out), sum(u['hmax'] for u in out))
