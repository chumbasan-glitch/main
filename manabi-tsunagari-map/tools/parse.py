# src/*.txt（学習指導要領の本文）を、教科ごとの「内容のまとまり（項目）」に分ける
# 結果は data/parsed.json に書き出す（見出しやテーマは build.py で midashi/*.tsv から付ける）
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAKKO = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃'
IROHA = 'アイウエオカキクケコサシスセソ'
ZEN = '０１２３４５６７８９'
LETTER = {'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G'}

def z2i(c):
    return ZEN.index(c) if c in ZEN else int(c)

def read(sub):
    ls = [l.rstrip() for l in open(os.path.join(ROOT, 'src', sub + '.txt')) if l.strip()]
    out = []
    for l in ls:
        # 「次の」で切れた行や「⑵　に示す事項」のように、行頭の記号が文の続きになっている行をつなぐ
        if out and (out[-1].endswith('次の') or re.match('^[' + KAKKO + r']　(に示す|，)', l)):
            out[-1] += l.replace('　', '', 1) if re.match('^[' + KAKKO + ']　，', l) else l
            continue
        out.append(l)
    return out

def band_of(l):
    m = re.match(r'^〔第(.)学年(?:及び第(.)学年)?〕', l)
    if not m:
        return None
    a = z2i(m.group(1)); b = z2i(m.group(2)) if m.group(2) else a
    return list(range(a, b + 1))

def bkey(gs):
    return ''.join(str(g) for g in gs)

def split_common(lines):
    """第１ 目標 … 第２ … 第３ 指導計画 … に分ける"""
    goal, body, plan = [], [], []
    cur = goal
    for l in lines:
        if l.startswith('第１　目標'):
            rest = l[len('第１　目標'):]
            if rest: goal.append(rest)
            continue
        if l.startswith('第２　'):
            cur = body
            rest = re.sub(r'^第２　(各学年の目標及び内容|各学年の内容|内容|各言語の目標及び内容等|各学校において定める目標及び内容|各活動・学校行事の目標及び内容)', '', l)
            if rest: body.append(rest)
            continue
        if l.startswith('第３　指導計画の作成と内容の取扱い'):
            cur = plan
            rest = l[len('第３　指導計画の作成と内容の取扱い'):]
            if rest: plan.append(rest)
            continue
        cur.append(l)
    return goal, body, plan

def grade_blocks(body):
    """〔第ｎ学年…〕ごとに分ける。目標・内容・内容の取扱い"""
    blocks, cur = [], None
    for l in body:
        b = band_of(l)
        if b and (l.endswith('〕')):
            cur = {'grades': b, 'goal': [], 'content': [], 'notes': []}
            blocks.append(cur); sec = None
            continue
        if cur is None:
            continue
        if re.match(r'^１　目標', l):
            sec = 'goal'; rest = l[len('１　目標'):]
            if rest: cur['goal'].append(rest)
            continue
        if re.match(r'^[１２]　内容(?!の取扱い)', l):
            sec = 'content'; continue
        if re.match(r'^[２３]　内容の取扱い', l):
            sec = 'notes'; continue
        if sec:
            cur[sec].append(l)
    return blocks

def group_notes(lines):
    """内容の取扱いを ⑴… ごとのかたまりにする"""
    gs = []
    for l in lines:
        if l[0] in KAKKO or not gs:
            gs.append([l])
        else:
            gs[-1].append(l)
    return gs

def item(sub, gs, area, no, title, lines, areaName, **kw):
    d = {'id': '%s-%s-%s-%s' % (sub, bkey(gs), area, no), 'subject': sub, 'g': gs, 'area': area,
         'areaName': areaName, 'no': no, 'title': title, 'lines': lines}
    d.update(kw)
    return d

def attach_letter_notes(items, gs, notes, letter_of=None):
    """「内容の「Ａ…」の⑴」のような書き方から、関係する項目に内容の取扱いをつける"""
    for grp in group_notes(notes):
        head = grp[0]
        refs = re.findall(r'「([ＡＢＣＤＥＦＧ])[^」]*」(?:の([' + KAKKO + r'及び，]+))?', head)
        targets = []
        for letter, nos in refs:
            L = LETTER[letter]
            ns = [KAKKO.index(c) + 1 for c in (nos or '') if c in KAKKO]
            for it in items:
                if it['g'] != gs and not set(it['g']) <= set(gs):
                    continue
                if (letter_of(it) if letter_of else it['area'][0]) != L:
                    continue
                if ns and it.get('num') not in ns:
                    continue
                targets.append(it)
        for it in targets:
            it.setdefault('notes', [])
            for l in grp:
                if l not in it['notes']:
                    it['notes'].append(l)

# ---------------- 教科ごとの読み取り ----------------

def p_kokugo(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    AREA = {'K1': '知識及び技能 ⑴ 言葉の特徴や使い方', 'K2': '知識及び技能 ⑵ 情報の扱い方',
            'K3': '知識及び技能 ⑶ 我が国の言語文化', 'A': 'Ａ 話すこと・聞くこと', 'B': 'Ｂ 書くこと', 'C': 'Ｃ 読むこと'}
    S['areas'] = [{'key': k, 'name': v} for k, v in AREA.items()]
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        part = 'K'; area = None; head = None; cur = None; n = 0
        for l in b['content']:
            if l.startswith('〔知識及び技能〕'):
                part = 'K'; continue
            if l.startswith('〔思考力'):
                part = 'S'; continue
            m = re.match(r'^([ＡＢＣ])　(.+)$', l)
            if m:
                area = LETTER[m.group(1)]; continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1; head = l
                if part == 'K':
                    area = 'K%d' % n
                elif n == 2:   # 言語活動例はひとまとめ
                    cur = item('kokugo', gs, area, '2', l[2:], [], AREA[area], num=2, kind='act')
                    S['items'].append(cur)
                continue
            if part == 'S' and n == 2:
                cur['lines'].append(l); continue
            if l[0] in IROHA and l[1] == '　':
                cur = item('kokugo', gs, area, l[0], head[2:], [l], AREA[area], num=n)
                S['items'].append(cur)
            else:
                cur['lines'].append(l)
    return S

def p_shakai(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        cur = None; its = []
        for l in b['content']:
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                cur = item('shakai', gs, 'X', str(n), l[2:], [], '', num=n); its.append(cur)
            else:
                cur['lines'].append(l)
        for grp in group_notes(b['notes']):
            m = re.match(r'^.　内容の([' + KAKKO + r'])', grp[0])
            for it in its:
                if m and it['num'] == KAKKO.index(m.group(1)) + 1:
                    it['notes'] = grp
        S['items'] += its
    return S

def p_rika(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    AREA = {'A': 'Ａ 物質・エネルギー', 'B': 'Ｂ 生命・地球'}
    S['areas'] = [{'key': k, 'name': v} for k, v in AREA.items()]
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        area = None; cur = None; its = []
        for l in b['content']:
            m = re.match(r'^([ＡＢ])　', l)
            if m:
                area = LETTER[m.group(1)]; continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                cur = item('rika', gs, area, str(n), l[2:], [], AREA[area], num=n); its.append(cur)
            else:
                cur['lines'].append(l)
        attach_letter_notes(its, gs, b['notes'])
        S['items'] += its
    return S

def p_seikatsu(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': [], 'areas': []}
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        area = None
        for l in b['content']:
            if l.startswith('〔'):
                area = 'S%d' % (len(S['areas']) + 1); S['areas'].append({'key': area, 'name': l.strip('〔〕')}); continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                S['items'].append(item('seikatsu', gs, area, str(n), '', [l], S['areas'][-1]['name'], num=n))
    return S

def p_ongaku(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    S['areas'] = [{'key': 'A', 'name': 'Ａ 表現'}, {'key': 'B', 'name': 'Ｂ 鑑賞'}, {'key': 'K', 'name': '〔共通事項〕'}]
    AN = {a['key']: a['name'] for a in S['areas']}
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        area = None; cur = None; its = []
        for l in b['content']:
            if l.startswith('Ａ　'): area = 'A'; continue
            if l.startswith('Ｂ　'): area = 'B'; continue
            if l.startswith('〔共通事項〕'): area = 'K'; continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                cur = item('ongaku', gs, area, str(n), l[2:], [], AN[area], num=n); its.append(cur)
            else:
                cur['lines'].append(l)
        # 内容の取扱い：⑴歌唱教材 ⑵器楽教材 ⑶鑑賞教材
        tgt = {'⑴': ('A', 1), '⑵': ('A', 2), '⑶': ('B', 1)}
        for grp in group_notes(b['notes']):
            a, n = tgt[grp[0][0]]
            for it in its:
                if it['area'] == a and it['num'] == n:
                    it['notes'] = grp
        S['items'] += its
    return S

def p_zuko(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    S['areas'] = [{'key': 'A', 'name': 'Ａ 表現'}, {'key': 'B', 'name': 'Ｂ 鑑賞'}, {'key': 'K', 'name': '〔共通事項〕'}]
    AN = {a['key']: a['name'] for a in S['areas']}
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        area = None; cur = None
        for l in b['content']:
            if l.startswith('Ａ　'): area = 'A'; continue
            if l.startswith('Ｂ　'): area = 'B'; continue
            if l.startswith('〔共通事項〕'): area = 'K'; continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                cur = item('zuko', gs, area, str(n), l[2:], [], AN[area], num=n); S['items'].append(cur)
            else:
                cur['lines'].append(l)
    return S

def p_katei(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': [], 'areas': []}
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': []}
        area = None; cur = None
        for l in b['content']:
            m = re.match(r'^([ＡＢＣ])　(.+?)(次の.*)$', l)
            if m:
                area = LETTER[m.group(1)]
                S['areas'].append({'key': area, 'name': m.group(1) + ' ' + m.group(2), 'lead': m.group(3)}); continue
            if l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                cur = item('katei', gs, area, str(n), l[2:], [], S['areas'][-1]['name'], num=n, autohead=l[2:]); S['items'].append(cur)
            else:
                cur['lines'].append(l)
        # 内容の取扱い：「Ａ…」については → ア ⑴のアについては …
        for grp in group_notes(b['notes']):
            m = re.search(r'「([ＡＢＣ])', grp[0])
            if not m: continue
            L = LETTER[m.group(1)]
            for l in grp[1:]:
                ns = [KAKKO.index(c) + 1 for c in re.findall('[' + KAKKO + ']', l.split('については')[0])]
                for it in S['items']:
                    if it['area'] == L and (it['num'] in ns or not ns):
                        it.setdefault('notes', [grp[0]])
                        it['notes'].append(l)
    return S

def p_taiiku(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    S['areas'] = [{'key': k, 'name': v} for k, v in
                  [('A', 'Ａ 体つくり'), ('B', 'Ｂ 器械運動系'), ('C', 'Ｃ 陸上運動系'), ('D', 'Ｄ 水泳運動系'),
                   ('E', 'Ｅ ボール運動系'), ('F', 'Ｆ 表現運動系'), ('G', 'Ｇ 保健')]]
    for b in grade_blocks(body):
        gs = b['grades']; S['bands'][bkey(gs)] = {'grades': gs, 'goal': b['goal']}
        cur = None; its = []
        for l in b['content']:
            m = re.match(r'^([ＡＢＣＤＥＦＧ])　(.+)$', l)
            if m:
                L = LETTER[m.group(1)]; rest = m.group(2)
                if L == 'G':
                    area = 'G'; cur = None; continue
                # 「体つくり運動体つくり運動について，…」→ 名前と前置きに分ける
                name = next(rest[:k] for k in range(1, len(rest)) if rest[k:].startswith(rest[:k] + 'について'))
                area = L
                cur = item('taiiku', gs, L, '0', rest[len(name):], [], name, num=0, autohead=name); its.append(cur)
                continue
            if area == 'G' and l[0] in KAKKO:
                n = KAKKO.index(l[0]) + 1
                g2 = gs
                if gs == [3, 4]: g2 = [3] if n == 1 else [4]
                if gs == [5, 6]: g2 = [5] if n <= 2 else [6]
                cur = item('taiiku', g2, 'G', str(n), l[2:], [], '保健', num=n); its.append(cur)
                continue
            cur['lines'].append(l)
        for grp in group_notes(b['notes']):
            refs = re.findall(r'「([ＡＢＣＤＥＦＧ])[^」]*」(?:の([' + KAKKO + r']))?', grp[0])
            for letter, no in refs:
                for it in its:
                    if it['area'] == LETTER[letter] and (letter != 'Ｇ' or not no or it['num'] == KAKKO.index(no) + 1):
                        it.setdefault('notes', [])
                        it['notes'] += [x for x in grp if x not in it['notes']]
            if re.search(r'「Ｇ保健」については', grp[0]):
                pass
        S['items'] += its
    return S

def p_gaikoku(lines, sub):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': []}
    # １ 目標（五つ／三つの領域）
    i = 0; aims = {}; cur = None
    while not body[i].startswith('２　内容'):
        l = body[i]
        m = re.match(r'^[' + KAKKO + r']　(.+)$', l)
        if m: cur = m.group(1); aims[cur] = []
        elif cur: aims[cur].append(l)
        i += 1
    rest = body[i + 1:]
    gs = band_of(rest[0]); rest = rest[1:]
    S['bands'][bkey(gs)] = {'grades': gs, 'goal': [l for l in body[:i] if not l.startswith('英語')]}
    AREA = [('K', '知識及び技能'), ('S', '思考力，判断力，表現力等'), ('L', '言語活動（領域別）'), ('H', '言語の働き')]
    S['areas'] = [{'key': k, 'name': v} for k, v in AREA]
    AN = dict(AREA)
    part = None; cur = None; its = []
    for l in rest:
        if l.startswith('３　指導計画'):
            break
        if l.startswith('〔知識及び技能〕'): part = 'K'; continue
        if l.startswith('〔思考力'): part = 'S'; continue
        if l.startswith('⑶　言語活動'): part = 'L0'; continue
        if l.startswith('①'): part = 'L'; lead = l[2:].replace('言語活動に関する事項', '', 1).replace('⑵　に示す', '⑵に示す'); continue
        if l.startswith('②'):
            part = 'H'; cur = item(sub, gs, 'H', '1', l[2:], [], AN['H'], num=1); its.append(cur); continue
        if part == 'K' and l[0] in KAKKO:
            head = l[2:]
            if sub == 'gaikokugokatsudo':
                cur = item(sub, gs, 'K', '1', head, [], AN['K'], num=1); its.append(cur)
            continue
        if part == 'K' and sub == 'gaikokugo' and l[0] in IROHA and l[1] == '　':
            cur = item(sub, gs, 'K', l[0], head, [l], AN['K'], num=1); its.append(cur); continue
        if part == 'S' and l[0] in KAKKO:
            cur = item(sub, gs, 'S', '2', l[2:], [], AN['S'], num=2); its.append(cur); continue
        if part == 'L' and l[0] in KAKKO:
            lead = l; continue
        if part == 'L' and l[0] in IROHA and l[1] == '　':
            name = l[2:]
            cur = item(sub, gs, 'L', l[0], lead, [], AN['L'], num=3, autohead=name)
            cur['extra'] = [{'label': '領域別の目標「' + name + '」', 'lines': aims.get(name, [])}]
            its.append(cur); continue
        cur['lines'].append(l)
    S['items'] += its
    return S

def p_doutoku(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal + [body[0]], 'plan': plan, 'bands': {}, 'items': [], 'areas': []}
    area = None; name = None; k = 0
    for l in body[1:]:
        m = re.match(r'^([ＡＢＣＤ])　(.+)$', l)
        if m:
            area = LETTER[m.group(1)]; S['areas'].append({'key': area, 'name': m.group(1) + ' ' + m.group(2)}); continue
        if l.startswith('［'):
            name = l.strip('［］'); k += 1; continue
        gs = band_of(l)
        if gs:
            text = l[l.index('〕') + 1:]
            S['bands'].setdefault(bkey(gs), {'grades': gs, 'goal': []})
            S['items'].append(item('doutoku', gs, area, '%02d' % k, '［' + name + '］', [text], S['areas'][-1]['name'],
                                   num=k, autohead=text, itemName=name))
    return S

def p_sougou(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {'3456': {'grades': [3, 4, 5, 6], 'goal': []}}, 'items': []}
    S['areas'] = [{'key': 'X', 'name': '各学校において定める目標及び内容の取扱い'}]
    pre = []; cur = None
    for l in body:
        if l[0] in KAKKO:
            n = KAKKO.index(l[0]) + 1
            cur = item('sougou', [3, 4, 5, 6], 'X', str(n), '', [l], S['areas'][0]['name'], num=n); S['items'].append(cur)
        elif cur:
            cur['lines'].append(l)
        else:
            pre.append(l)
    S['bands']['3456']['goal'] = pre
    return S

def p_tokkatsu(lines):
    goal, body, plan = split_common(lines)
    S = {'goal': goal, 'plan': plan, 'bands': {}, 'items': [], 'areas': []}
    KEY = {'学級活動': 'GK', '児童会活動': 'JK', 'クラブ活動': 'CL', '学校行事': 'GG'}
    area = None; sec = None; cur = None; sub = None
    for l in body:
        if l.startswith('〔') and l.strip('〔〕') in KEY:
            name = l.strip('〔〕'); area = KEY[name]
            S['areas'].append({'key': area, 'name': name, 'goal': [], 'notes': []}); continue
        A = S['areas'][-1]
        if l.startswith('１　目標'):
            sec = 'goal'; A['goal'].append(l[len('１　目標'):]); continue
        if l.startswith('２　内容'):
            sec = 'content'; continue
        if l.startswith('３　内容の取扱い'):
            sec = 'notes'; continue
        if sec == 'goal':
            A['goal'].append(l); continue
        if sec == 'notes':
            A['notes'].append(l); continue
        gs = [4, 5, 6] if area == 'CL' else [1, 2, 3, 4, 5, 6]
        if area == 'GK':
            if l[0] in KAKKO:
                sub = l; continue
            if l[0] in IROHA and l[1] == '　':
                n = KAKKO.index(sub[0]) + 1
                cur = item('tokkatsu', gs, area, '%d%s' % (n, l[0]), sub[2:], [l], name, num=n); S['items'].append(cur); continue
        elif l[0] in KAKKO:
            n = KAKKO.index(l[0]) + 1
            cur = item('tokkatsu', gs, area, str(n), '', [l], name, num=n); S['items'].append(cur); continue
        if cur: cur['lines'].append(l)
    for a in S['areas']:
        for it in S['items']:
            if it['area'] == a['key'] and a['notes']:
                it['notes'] = a['notes']
    S['bands'] = {'123456': {'grades': [1, 2, 3, 4, 5, 6], 'goal': []}}
    return S

PARSERS = {
    'kokugo': p_kokugo, 'shakai': p_shakai, 'rika': p_rika, 'seikatsu': p_seikatsu, 'ongaku': p_ongaku,
    'zuko': p_zuko, 'katei': p_katei, 'taiiku': p_taiiku,
    'gaikokugo': lambda ls: p_gaikoku(ls, 'gaikokugo'),
    'gaikokugokatsudo': lambda ls: p_gaikoku(ls, 'gaikokugokatsudo'),
    'doutoku': p_doutoku, 'sougou': p_sougou, 'tokkatsu': p_tokkatsu,
}

if __name__ == '__main__':
    out = {}
    for sub, f in PARSERS.items():
        out[sub] = f(read(sub))
        ids = [it['id'] for it in out[sub]['items']]
        assert len(ids) == len(set(ids)), (sub, [i for i in ids if ids.count(i) > 1])
        print(sub, len(ids), 'items', list(out[sub]['bands']))
    os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, 'data', 'parsed.json'), 'w'), ensure_ascii=False, indent=1)
