# 光村図書 生活「単元指導計画」（Word）から、単元・時数・小単元ごとの学習活動（①②…）を読む
import zipfile, re, json, sys, glob
CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
Z = str.maketrans('０１２３４５６７８９', '0123456789')
def cells_of(tr):
    out = []
    for tc in re.findall(r'<w:tc>(.*?)</w:tc>', tr, re.S):
        out.append([''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)).strip() for p in re.findall(r'<w:p[ >].*?</w:p>', tc, re.S)])
    return out
res = []
for f in sorted(glob.glob(sys.argv[1] + '/*.docx')):
    x = zipfile.ZipFile(f).read('word/document.xml').decode()
    tbls = re.findall(r'<w:tbl>(.*?)</w:tbl>', x, re.S)
    name = ' '.join(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', tbls[0])).split())
    info = {'file': f.split('/')[-1], 'name': name, 'subs': [], 'aim': '', 'when': '', 'total': ''}
    for tr in re.findall(r'<w:tr[ >].*?</w:tr>', tbls[1], re.S):
        c = cells_of(tr)
        for i in range(0, len(c) - 1, 2):
            k, v = ''.join(c[i]), ' '.join(p for p in c[i + 1] if p)
            if k.startswith('配当時数'): info['total'] = v
            if k.startswith('配当時期'): info['when'] = v
            if k.startswith('単元の目標') or k.startswith('活動の目標'): info['aim'] = v
    for tbl in tbls[2:]:
        rows = re.findall(r'<w:tr[ >].*?</w:tr>', tbl, re.S)
        if not rows or '学習活動' not in ''.join(sum(cells_of(rows[0]), [])): continue
        cur = None
        for tr in rows[1:]:
            c = cells_of(tr)
            if not c: continue
            left = [p for p in c[0] if p]
            acts = c[1] if len(c) > 1 else []
            hp = next((p for p in left if re.search(r'(時間|配当外)／', p)), None)
            title = []
            for p in left:
                if re.search(r'(時間|配当外)／', p) or p == '目標': break
                title.append(p)
            if title:   # 小単元の名前がある行から、新しい小単元
                cur = {'title': ' '.join(title).strip(), 'hours': None, 'acts': []}
                info['subs'].append(cur)
            if hp and cur is not None:   # 「7時間／上p20-23」の行で時数が決まる
                mh = re.search(r'(\d+)時間', hp.translate(Z))
                cur['hours'] = int(mh.group(1)) if mh else 0
            if cur is None: continue
            for p in acts:
                if p and p[0] in CIRC: cur['acts'].append(p[1:].strip())
    res.append(info)
json.dump(res, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for u in res:
    print(u['file'], u['name'], '|', u['total'], '|', u['when'])
    for s in u['subs']: print('    ', s['hours'], len(s['acts']), s['title'][:24], ('★' if s['hours'] and len(s['acts']) != s['hours'] else ''))
