import pdfplumber, re, json, sys
Z = str.maketrans('０１２３４５６７８９', '0123456789')
MON = re.compile(r'^([0-9０-９]+)月$|^[～〜~]$')
pdf = pdfplumber.open(sys.argv[1])
lines = []
for pg in pdf.pages:
    ws = [w for w in pg.extract_words() if 60 < w['top'] < 800]
    ws.sort(key=lambda w: (round(w['top']), w['x0']))
    rows = []
    for w in ws:
        if rows and abs(rows[-1][0] - w['top']) < 3: rows[-1][1].append(w)
        else: rows.append([w['top'], [w]])
    for top, r in rows:
        if any(w['text'] == '単元名・教材名・時数・指導目標' for w in r): continue
        L = {'mon': [], 'unit': [], 'title': False, 'ji': [], 'act': []}
        for w in sorted(r, key=lambda w: w['x0']):
            t = w['text']; x = w['x0']
            if x < 66 and MON.match(t): L['mon'].append(t)
            elif x < 205:
                L['unit'].append(t)
                if w['x1'] > 215: L['title'] = True
            elif x < 232: L['ji'].append(t)
            elif x < 415: L['act'].append((x, t))
        lines.append(L)
units = []; cur = None; last_mon = None
for L in lines:
    for m in L['mon']:
        if m in '～〜~': last_mon = '～'; continue
        if last_mon == '～': last_mon = m; continue   # 「５月～６月」の終わりの月
        last_mon = m
        cur = {'month': int(m[:-1].translate(Z)), 'ulines': [], 'title': None, 'blocks': [], 'pending': False, 'first': True}
        units.append(cur)
    if cur is None: continue
    u = ' '.join(L['unit']).strip()
    # 月の欄がない単元（同じ月が続くとき）：1時間目の印があり、前の単元の時数がもう出ていれば新しい単元
    if not L['mon'] and any(t.translate(Z) == '1' for t in L['ji']) and any(re.match(r'^[0-9０-９]+時間（', x) for x in cur['ulines']) and u and u[0] not in '◎○〇・■☆':
        cur = {'month': cur['month'], 'ulines': [], 'title': None, 'blocks': [], 'pending': False, 'first': False}
        units.append(cur)
    if u:
        if cur['first'] and not L['ji'] and L['mon'] and not cur['ulines']: cur['title'] = u
        elif L['title'] and not cur['ulines'] and cur['title'] is None: cur['title'] = u
        else: cur['ulines'].append(u)
    cur['first'] = False
    for t in L['ji']:
        if t == '～': cur['pending'] = True; continue
        n = int(t.translate(Z))
        if cur['pending'] and cur['blocks']: cur['blocks'][-1]['to'] = n; cur['pending'] = False
        else: cur['blocks'].append({'from': n, 'to': n, 'acts': [], 'subs': []})
    for x, t in L['act']:
        if not cur['blocks']: cur['blocks'].append({'from': 1, 'to': 1, 'acts': [], 'subs': []})
        b = cur['blocks'][-1]
        if x < 239 and re.match(r'^[0-9０-９]', t):
            # 活動の番号は単元の中で1から順に増える。次の番号の分だけ消す（「１３編の詩」→「３編の詩」）
            run = re.match(r'^[0-9０-９]+', t).group(0)
            exp = str(cur.get('actno', 0) + 1)
            k = len(exp) if run.translate(Z).startswith(exp) else len(run)
            cur['actno'] = int(run[:k].translate(Z))
            b['acts'].append(t[k:]); b['state'] = 'main'
        elif t.startswith('・'):
            b['subs'].append(t[1:]); b['state'] = 'sub'
        elif b.get('state') == 'main' and x < 247 and b['acts']: b['acts'][-1] += t
        elif b.get('state') == 'sub' and b['subs']: b['subs'][-1] += t
        elif b['acts']: b['acts'][-1] += t
out = []
for c in units:
    ul = c['ulines']
    hi = next((i for i, s in enumerate(ul) if re.match(r'^[0-9０-９]+時間（', s)), None)
    if hi is None: print('NO HOURS', c['title'], ul[:3], file=sys.stderr); continue
    hours = int(re.match(r'^([0-9０-９]+)', ul[hi]).group(1).translate(Z))
    names = [s.replace(' ', '') if not re.search(r'[ぁ-ん]\s+[ぁ-ん]', s) else s.replace('   ', '　') for s in ul[:hi]]
    names = [re.sub(r'\s+', '　', n) for n in names]
    merged = []
    for n in names:
        if merged and len(n) <= 2: merged[-1] += n
        else: merged.append(n)
    names = merged
    goals, cur_g = [], None
    for s in ul[hi + 1:]:
        if s[0] in '◎○〇・■☆':
            cur_g = s; goals.append(s)
        elif goals: goals[-1] += s.replace(' ', '')
    lessons = [''] * hours
    for b in c['blocks']:
        txt = ''.join(a if a.endswith('。') else a + '。' for a in b['acts']) or ''.join(s if s.endswith('。') else s + '。' for s in b['subs'][:2])
        txt = re.sub(r'\s+', '', txt)
        for h in range(b['from'], min(b['to'], hours) + 1):
            k = b['to'] - b['from'] + 1
            lessons[h - 1] = txt + (f'（{h - b["from"] + 1}/{k}）' if k > 1 else '')
    title = (c['title'] or '').replace(' ', '')
    main = [n for n in names if not n.startswith('【')] or names
    if len(names) == 1: nm = re.sub(r'^【[^】]*】', '', names[0])
    elif title and len(title) <= 12: nm = title
    else: nm = '・'.join(main)
    aim = ''.join(g[1:] for g in goals if g[0] == '◎') or ''.join(g[1:] for g in goals if g[0] in '○〇')
    out.append({'month': c['month'], 'name': nm, 'title': title, 'materials': names, 'hours': hours, 'kind': re.search(r'（(.*)）', ul[hi]).group(1), 'aim': re.sub(r'\s+', '', aim), 'lessons': lessons})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(out), 'units', sum(u['hours'] for u in out), 'hours')
for u in out: print(u['month'], u['hours'], u['name'], '|', u['kind'], '| empty:', sum(1 for l in u['lessons'] if not l))
