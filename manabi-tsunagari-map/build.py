# 学びのつながりマップを組み立てる
#   1. python3 tools/extract.py <学習指導要領PDF>   … src/*.txt をつくる（算数は src/sansu.txt を手で整えたもの）
#   2. python3 tools/parse.py                        … data/parsed.json をつくる
#   3. python3 build.py                              … data/items.json をつくる
#   4. python3 tools/furoku.py <総則編解説PDF>         … 付録6の表を data/furoku_raw.json に
#   5. python3 tools/furoku_match.py                 … 付録6の抜き出しと内容を結びつけ data/furoku.json に
#   6. python3 build.py                              … page.html（アーティファクト用）と manabi-tsunagari-map.html（配布用）
import json, re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
ZEN = '０１２３４５６７８９'
KAKKO = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃'
AREA_LETTER = {'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D'}

# 教科の並び・色相・学習指導要領での学年のまとめ方
SUBJECTS = [
    ('kokugo', '国語', 0), ('shakai', '社会', 28), ('sansu', '算数', 212), ('rika', '理科', 140),
    ('seikatsu', '生活', 80), ('ongaku', '音楽', 328), ('zuko', '図画工作', 46), ('katei', '家庭', 14),
    ('taiiku', '体育', 176), ('gaikokugokatsudo', '外国語活動', 252), ('gaikokugo', '外国語', 252),
    ('doutoku', '特別の教科 道徳', 288), ('sougou', '総合的な学習の時間', 32), ('tokkatsu', '特別活動', 198),
]
SECTION = {
    'kokugo': '第２章 第１節 国語', 'shakai': '第２章 第２節 社会', 'sansu': '第２章 第３節 算数', 'rika': '第２章 第４節 理科',
    'seikatsu': '第２章 第５節 生活', 'ongaku': '第２章 第６節 音楽', 'zuko': '第２章 第７節 図画工作',
    'katei': '第２章 第８節 家庭', 'taiiku': '第２章 第９節 体育', 'gaikokugo': '第２章 第10節 外国語',
    'doutoku': '第３章 特別の教科 道徳', 'gaikokugokatsudo': '第４章 外国語活動', 'sougou': '第５章 総合的な学習の時間',
    'tokkatsu': '第６章 特別活動',
}

def z2i(t):
    return int(''.join(str(ZEN.index(c)) if c in ZEN else c for c in t))

# ---------- 算数（src/sansu.txt は形が少しちがうので、ここで読む） ----------
def parse_sansu():
    lines = [l for l in open(P('src', 'sansu.txt')).read().split('\n') if l.strip()]
    S = {'goal': [], 'bands': {}, 'plan': [], 'items': []}
    cur = g = sec = area = item = None
    for l in lines:
        m = re.match(r'〔第(.)学年〕', l)
        if l == '〔目標〕':
            cur = 'goal'; continue
        if m:
            g = z2i(m.group(1)); cur = 'grade'
            S['bands'][str(g)] = {'grades': [g], 'goal': [], 'activity': [], 'terms': [], 'notes': []}
            continue
        if l == '〔指導計画の作成と内容の取扱い〕':
            cur = 'plan'; continue
        if cur == 'goal':
            S['goal'].append(l); continue
        if cur == 'plan':
            S['plan'].append(l); continue
        G = S['bands'][str(g)]
        if l.startswith('１　目　標'): sec = 'goal'; continue
        if l.startswith('２　内　容'): sec = 'content'; continue
        if l.startswith('３　内容の取扱い'): sec = 'notes'; continue
        if l == '〔数学的活動〕': sec = 'activity'; continue
        if l.startswith('〔用語・記号〕'):
            G['terms'] = l[len('〔用語・記号〕'):].split('　'); sec = None; continue
        if sec in ('goal', 'activity', 'notes'):
            G[sec].append(l)
        elif sec == 'content':
            m = re.match(r'([ＡＢＣＤ])　(.+)$', l)
            if m:
                area = {'letter': AREA_LETTER[m.group(1)], 'name': m.group(2)}; continue
            if l[0] in KAKKO:
                no = KAKKO.index(l[0]) + 1
                akey = area['letter'] + ('2' if area['name'] == '変化と関係' else '')
                item = {'id': 'sansu-%d-%s-%d' % (g, area['letter'], no), 'subject': 'sansu', 'g': [g], 'area': akey,
                        'areaName': area['name'], 'no': str(no), 'num': no, 'title': l[2:], 'lines': []}
                S['items'].append(item)
            else:
                item['lines'].append(l)
    for k, G in S['bands'].items():
        g = int(k)
        for n in G['notes']:
            for letter, seg in re.findall(r'「([ＡＢＣＤ])[^」]*」(.*?)(?:について|に関連|$)', n):
                for c in [c for c in seg if c in KAKKO]:
                    for it in S['items']:
                        if it['g'][0] == g and it['area'][0] == AREA_LETTER[letter] and it['num'] == KAKKO.index(c) + 1:
                            it.setdefault('notes', [])
                            if n not in it['notes']: it['notes'].append(n)
        G['extra'] = [{'label': '〔数学的活動〕', 'lines': G.pop('activity')},
                      {'label': '〔用語・記号〕', 'terms': G.pop('terms')}]
        G.pop('notes')
    S['areas'] = [{'key': 'A', 'name': 'Ａ 数と計算'}, {'key': 'B', 'name': 'Ｂ 図形'}, {'key': 'C', 'name': 'Ｃ 測定'},
                  {'key': 'C2', 'name': 'Ｃ 変化と関係'}, {'key': 'D', 'name': 'Ｄ データの活用'}]
    return S

# ---------- 見出しとテーマを付ける ----------
def read_tsv(name):
    rows = []
    for l in open(P('midashi', name + '.tsv')):
        l = l.rstrip('\n')
        if not l or l.startswith('#'): continue
        rows.append(l.split('\t'))
    return rows

def split_glued(text, head):
    """「物と重さ物の性質について…」のように名前と本文がつながった行を分ける"""
    if head and text.startswith(head) and len(text) > len(head):
        return [head, text[len(head):]]
    return [text]

data = json.load(open(P('data', 'parsed.json')))
data['sansu'] = parse_sansu()
# 教科の中のテーマ（教科の系統のつながり）
THEMES = [{'id': r[0], 'name': r[1]} for r in read_tsv('themes')]
TID = {t['id'] for t in THEMES}
items = []
subjects = []
for sid, name, hue in SUBJECTS:
    S = data[sid]
    heads = {}
    for r in read_tsv(sid):
        th = {}
        for t in r[2].split('|'):
            k, _, lab = t.partition('=')
            assert k in TID, (sid, r[0], k)
            th[k] = lab
        heads[r[0]] = (r[1], th, r[3] if len(r) > 3 else None)
    for it in S['items']:
        key = it['id'][len(sid) + 1:]
        assert key in heads, (sid, key)
        head, th, area = heads.pop(key)
        if head == '-':
            head = it['autohead']
        it['head'] = head
        # 画面では教科名を別に出すので，「（理科）」のような後ろの教科名は外す
        it['themes'] = {k: re.sub(r'（[^（）]*(語|会|数|科|活|楽|工作|庭|育|保健|道徳|総合|活動)）$', '', v) if v else head for k, v in th.items()}
        if area:
            it['area'] = area
        # 本文の頭の番号（⑴など）
        if it.get('title') and it.get('num') and (sid not in ('doutoku', 'gaikokugo', 'gaikokugokatsudo', 'taiiku') or it['area'] == 'G'):
            it['mark'] = KAKKO[it['num'] - 1]
        # 名前と本文がつながった行（理科の内容の名前，特別活動の項目名）を分ける
        if it.get('title') and sid == 'rika':
            parts = split_glued(it['title'], head)
            if len(parts) == 2:
                it['title'] = parts[1]; it['name'] = parts[0]
        if it['lines'] and sid == 'tokkatsu':
            l0 = it['lines'][0]
            mk = l0[:2] if (l0[0] in KAKKO or l0[1:2] == '　') else ''
            parts = split_glued(l0[len(mk):], head)
            if len(parts) == 2:
                it['lines'] = [mk + parts[0], parts[1]] + it['lines'][1:]
        it['lines'] = [l.replace("you'rewelcome", "you're welcome") for l in it['lines']]
        it.pop('autohead', None); it.pop('itemName', None)
        items.append(it)
    assert not heads, (sid, list(heads))
    areas = S.get('areas') or []
    if sid == 'shakai':
        areas = [{'key': 'chiri', 'name': '地理的環境と人々の生活'}, {'key': 'rekishi', 'name': '歴史と人々の生活'},
                 {'key': 'koumin', 'name': '現代社会の仕組みや働きと人々の生活'}]
        for it in S['items']:
            it['areaName'] = next(a['name'] for a in areas if a['key'] == it['area'])
    for a in areas:
        a['grades'] = sorted({g for it in S['items'] if it['area'] == a['key'] for g in it['g']})
        a.pop('lead', None)
    bands = sorted(({'grades': b['grades'], 'goal': b.get('goal', []), 'extra': b.get('extra', [])}
                    for b in S['bands'].values()), key=lambda b: b['grades'][0])
    # 特別活動は活動ごとの目標を学年の欄に出す
    if sid == 'tokkatsu':
        bands[0]['extra'] = [{'label': '〔' + a['name'] + '〕の目標', 'lines': a.pop('goal')} for a in areas]
        for a in areas: a.pop('notes', None)
    plan = S.get('plan', [])
    # 音楽の「音符，休符，記号や用語」の一覧は図なので，文字にできた部分までにする
    plan = [l[:l.index('取り扱うこと。五') + 7] + '（※音符・休符・記号などの一覧は図で示されているため，ここでは省略しています）' if '取り扱うこと。五' in l else l for l in plan]
    subjects.append({'id': sid, 'name': name, 'h': hue, 'section': SECTION[sid], 'goal': S['goal'],
                     'plan': plan, 'areas': areas, 'bands': bands})

# 学年のまとめ方（マップの列のまとめ方）
for s in subjects:
    s['spans'] = [b['grades'] for b in s['bands']]
    if s['id'] == 'taiiku':
        s['spans'] = [[1, 2], [3, 4], [5, 6]]

# 付録6と照らし合わせるための内容の一覧（tools/furoku_match.py が読む）
json.dump({'items': items, 'subjects': [{'id': s['id'], 'plan': s['plan']} for s in subjects]},
          open(P('data', 'items.json'), 'w'), ensure_ascii=False)

# ---------- 教科横断のテーマ：解説 総則編 付録6 と 学校独自のテーマ ----------
BYID = {it['id']: it for it in items}
cross = []
FU = json.load(open(P('data', 'furoku.json'))) if os.path.exists(P('data', 'furoku.json')) else {}
def add_cross(tid, name, kind, rows, page=None, sosoku=(), F=None, group=None):
    T = {'id': tid, 'name': name, 'kind': kind, 'page': page, 'sosoku': list(sosoku), 'cats': [], 'plans': []}
    if group: T['group'] = group
    THEMES.append({'id': tid, 'name': name, 'cross': True})
    for cat, ids in rows:
        T['cats'].append(cat)
        for i in ids:
            if i.startswith('plan:'):
                sub, _, phrase = i[5:].partition(':')
                if phrase:   # 教科の「指導計画の作成と内容の取扱い」から，その言葉がある項目を引く
                    texts = [l for l in next(x for x in subjects if x["id"] == sub)['plan'] if phrase in l]
                else:
                    texts = [p['text'] for p in (F or {}).get('plan', []) if p['subject'] == sub]
                assert texts, (name, i)
                # 表の罫線の記号や，行の折り返しで入った空白を取る
                texts = [re.sub(r'(?<=[^\x00-\x7f]) +(?=[^\x00-\x7f])', '', re.sub(r'[⎧⎫⎨⎬⎩⎭⎜]', '', x)).strip() for x in texts]
                T['plans'].append({'subject': sub, 'cat': cat, 'lines': list(dict.fromkeys(texts))})
                continue
            i, _, phrase = i.partition(':')
            assert i in BYID, (name, i)
            it = BYID[i]
            it['themes'][tid] = it['head']
            hl = (F or {}).get('items', {}).get(i, {})
            if phrase:   # 根拠の言葉が入っている行に色を付ける
                hl = {'lines': [k for k, l in enumerate(it['lines']) if phrase in l],
                      'notes': [k for k, l in enumerate(it.get('notes', [])) if phrase in l]}
                assert hl['lines'] or hl['notes'], (name, i, phrase)
            # 1つの内容が2つの小見出しにまたがることがある（例：けがの防止 → 生活安全と交通安全）
            c = it.setdefault('cross', {}).setdefault(tid, {'cats': [], 'lines': hl.get('lines', []), 'notes': hl.get('notes', [])})
            c['cats'].append(cat)
    cross.append(T)
rows = {}
for r in read_tsv('furoku'):
    rows.setdefault(r[0], []).append((r[1], r[2].split()))
for k, (tp, F) in enumerate(FU.items()):
    miss = [i for i in F['items'] if i not in {x for c, ids in rows[tp] for x in ids}]
    assert not miss, (tp, miss)
    sos = [s for s in F['sosoku'] if len(s) > 12]
    add_cross('f%02d' % (k + 1), tp + 'に関する教育', 'furoku', rows[tp], F['page'], sos, F)
srows = {}
for r in read_tsv('school_themes'):
    srows.setdefault(r[0], []).append((r[1], r[2].split()))
for k, (name, rs) in enumerate(srows.items()):
    add_cross('x%02d' % (k + 1), name, 'school', rs)

# ---------- 探究とのつながり（Claudeの案） ----------
STEPS = ['問題意識を形成する', 'テーマを決定する', '問いを設定する', '仮説を立てる', '計画を立てる', '情報を収集する',
         '情報を整理・分析する', '仮説を検証する', '成果物を作成する', '共有する', '成果を評価する']
PROCS = ['課題の設定', '情報の収集', '整理・分析', 'まとめ・表現', '学習の振り返り']
STEP_PROC = [0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 4]   # 11ステップ → 学習指導要領の探究の過程
for r in read_tsv('tankyu_steps'):
    it = BYID[r[0]]
    k = next(k for k, l in enumerate(it['lines']) if l.startswith(r[1]))
    it.setdefault('steps', []).append({'k': k, 's': [int(x) for x in r[2].split(',')], 'ex': r[3] if len(r) > 3 else ''})
levels = [{'g': int(r[0]), 'level': int(r[1]), 'name': r[2], 'steps': [int(x) for x in r[3].split(',')]} for r in read_tsv('tankyu_levels')]
# 探究課題：付録6と重なるものはその結び付きを使う
kgroups, krows = [], {}
for r in read_tsv('tankyu_kadai'):
    if r[0] not in kgroups: kgroups.append(r[0])
    krows.setdefault((r[0], r[1]), []).append(r[2:])
for k, ((grp, name), rs) in enumerate(krows.items()):
    tid = 'k%02d' % (k + 1)
    if rs[0][0].startswith('='):
        src, _, only = rs[0][0][1:].partition(':')
        X = next(x for x in cross if x['name'] == src + 'に関する教育')
        T = {'id': tid, 'name': name, 'kind': 'tankyu', 'group': grp, 'page': X['page'], 'sosoku': [], 'from': X['name'],
             'cats': [c for c in X['cats'] if not only or c == only], 'plans': [p for p in X['plans'] if not only or p['cat'] == only]}
        THEMES.append({'id': tid, 'name': name, 'cross': True})
        for it in items:
            c = it.get('cross', {}).get(X['id'])
            if c and (not only or only in c['cats']):
                it['themes'][tid] = it['head']
                it['cross'][tid] = {'cats': [x for x in c['cats'] if not only or x == only], 'lines': c['lines'], 'notes': c['notes']}
        cross.append(T)
    else:
        add_cross(tid, name, 'tankyu', [(c, ids.split()) for c, ids in rs], group=grp)
tankyu = {'steps': STEPS, 'procs': PROCS, 'stepProc': STEP_PROC, 'levels': levels, 'groups': kgroups}

used = {k for it in items for k in it['themes']}
THEMES = [t for t in THEMES if t['id'] in used]
print(len(items), 'items,', len(THEMES), 'themes,', len(cross), 'cross themes')
for s in subjects:
    print(' ', s['name'], sum(1 for it in items if it['subject'] == s['id']))

content = {'subjects': subjects, 'themes': THEMES, 'items': items, 'cross': cross, 'tankyu': tankyu}
t = open(P('template.html')).read()
t = t.replace('/*DATA*/', 'const CONTENT = ' + json.dumps(content, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + ';')
open(P('page.html'), 'w').write(t)
full = ('<!doctype html><html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + t + '</body></html>')
open(P('manabi-tsunagari-map.html'), 'w').write(full)
print(len(full.encode()), 'bytes')

# ---------- 品川区版：品川区が採択した教科書（令和6〜9年度）の単元を添える ----------
import copy
BOOKS = {'kokugo': '光村図書（国語・書写）', 'shakai': '東京書籍', 'sansu': '学校図書', 'rika': '学校図書', 'seikatsu': '光村図書',
         'ongaku': '教育芸術社', 'zuko': '日本文教出版', 'katei': '東京書籍', 'taiiku': '東京書籍（保健）',
         'gaikokugo': '東京書籍（NEW HORIZON Elementary）', 'doutoku': '東京書籍'}
SHIMIN = ('doutoku', 'tokkatsu', 'sougou')
sc = copy.deepcopy(content)
SB = {it['id']: it for it in sc['items']}
srcs = []
for fn in ('units_pub', 'units_manual'):
    p = P('midashi', 'shinagawa', fn + '.tsv')
    if not os.path.exists(p): continue
    for l in open(p):
        if l.startswith('#') or not l.strip(): continue
        iid, u, b, src = l.rstrip('\n').split('\t')
        if src not in srcs: srcs.append(src)
        SB[iid].setdefault('units', []).append({'u': u, 'b': b, 's': srcs.index(src)})
for s in sc['subjects']:
    if s['id'] in BOOKS: s['textbook'] = BOOKS[s['id']]
    if s['id'] in SHIMIN: s['name'] += '（市民科）'
SH = json.load(open(P('data', 'shiminka.json')))
k = next(i for i, x in enumerate(sc['subjects']) if x['id'] == 'tokkatsu') + 1
sc['subjects'].insert(k, SH['subject'])
sc['items'] += SH['items']
sc['themes'] += SH['themes']
EN = json.load(open(P('data', 'eigo_shinagawa.json')))
k = next(i for i, x in enumerate(sc['subjects']) if x['id'] == 'gaikokugo') + 1
sc['subjects'].insert(k, EN['subject'])
sc['items'] += EN['items']
sc['themes'] += EN['themes']
sc['edition'] = {'name': '品川区版', 'sources': srcs,
                 'note': '品川区立学校が令和6〜9年度に使う教科書（品川区教育委員会の採択）の単元を添えています。'}
st = open(P('template.html')).read()
st = st.replace('<title>学びのつながりマップ</title>', '<title>学びのつながりマップ 品川区版</title>')
st = st.replace('<h1>学びのつながりマップ</h1>', '<h1>学びのつながりマップ<small class="ed">品川区版</small></h1>')
st = st.replace('学びのつながりマップ　第1版', '学びのつながりマップ 品川区版　第1版')
st = st.replace('/*DATA*/', 'const CONTENT = ' + json.dumps(sc, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + ';')
os.makedirs(P('shinagawa'), exist_ok=True)
open(P('shinagawa', 'page.html'), 'w').write(st)
sfull = full.replace(t, st)
open(P('shinagawa', 'manabi-tsunagari-map-shinagawa.html'), 'w').write(sfull)
print('品川区版', sum(len(it.get('units', [])) for it in sc['items']), 'units,', len(sfull.encode()), 'bytes')
