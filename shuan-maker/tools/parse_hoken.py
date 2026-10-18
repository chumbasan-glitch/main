# 東書 新しい保健：単元（章）ごとに、小単元の「目標」欄（・）と時数を取る
import pdfplumber, re, json, sys
Z = str.maketrans('０１２３４５６７８９', '0123456789')
pdf = pdfplumber.open(sys.argv[1])
units, cur, sub, hdr = [], None, None, None
for pg in pdf.pages:
    hdr = next((w for w in pg.extract_words() if w['text'] == '時数'), None) or hdr
    lines = {}
    for c in pg.chars:
        lines.setdefault(round(c['top'] / 2), []).append(c)
    for k in sorted(lines):
        cs = sorted(lines[k], key=lambda c: c['x0'])
        full = ''.join(c['text'] for c in cs).translate(Z)
        m = re.search(r'(\d)\s*単元（章）\s*(\S+)', full)
        if m and '単元（章）名' in full:
            cur = {'no': int(m.group(1)), 'name': m.group(2), 'subs': []}; units.append(cur); continue
        m = re.search(r'配当時数\s*(\d+)\s*時間', full)
        if m and cur: cur['hours'] = int(m.group(1)); continue
        if full.lstrip().startswith('●'): sub = None; continue      # 発展（時数なし）は入れない
        m = re.match(r'\s*\((\d)\)(.+?)[\s　]*（教科書', full)
        if m and cur:
            sub = {'title': m.group(2), 'goals': [], 'hours': None}; cur['subs'].append(sub); continue
        if not sub or not hdr: continue
        left = ''.join(c['text'] for c in cs if c['x0'] < hdr['x0'] - 2).strip()
        hrs = ''.join(c['text'] for c in cs if hdr['x0'] - 2 <= c['x0'] < hdr['x1'] + 2).translate(Z).strip()
        if '目標' in left and '時数' in full: continue
        if hrs.isdigit() and sub['hours'] is None: sub['hours'] = int(hrs)
        if not left: continue
        if left.startswith('・'): sub['goals'].append(left[1:])
        elif sub['goals']: sub['goals'][-1] += left
    # 単元の終わり（評価規準の表など）では小単元を閉じる
    sub = None if False else sub
for u in units:
    for sb in u['subs']: sb['goals'] = [re.sub(r'(ようにする。).*$', r'\1', g) for g in sb['goals']]
json.dump(units, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for u in units:
    print(u['no'], u['name'], u.get('hours'), sum(s['hours'] or 0 for s in u['subs']))
    for s in u['subs']: print('   ', s['title'], s['hours'], s['goals'])
