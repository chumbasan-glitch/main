import json, re

ZEN = '０１２３４５６７８９'
KAKKO = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃'
AREA_LETTER = {'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D'}

def zen2int(t):
    return int(''.join(str(ZEN.index(c)) if c in ZEN else c for c in t))

# ---------- 算数の本文を読む ----------
lines = [l for l in open('src_sansu.txt').read().split('\n') if l.strip()]
sansu = {'goal': [], 'grades': {}, 'plan': [], 'items': []}
cur = None      # いま読んでいる場所
g = None
sec = None
area = None
item = None
for l in lines:
    m = re.match(r'〔第(.)学年〕', l)
    if l == '〔目標〕':
        cur = 'goal'; continue
    if m:
        g = zen2int(m.group(1)); cur = 'grade'
        sansu['grades'][g] = {'goal': [], 'activity': [], 'terms': [], 'notes': []}
        continue
    if l == '〔指導計画の作成と内容の取扱い〕':
        cur = 'plan'; continue
    if cur == 'goal':
        sansu['goal'].append(l); continue
    if cur == 'plan':
        sansu['plan'].append(l); continue
    G = sansu['grades'].get(g)
    if l.startswith('１　目　標'):
        sec = 'goal'; continue
    if l.startswith('２　内　容'):
        sec = 'content'; continue
    if l.startswith('３　内容の取扱い'):
        sec = 'notes'; continue
    if l == '〔数学的活動〕':
        sec = 'activity'; continue
    if l.startswith('〔用語・記号〕'):
        G['terms'] = l[len('〔用語・記号〕'):].split('　'); sec = None; continue
    if sec == 'goal':
        G['goal'].append(l)
    elif sec == 'activity':
        G['activity'].append(l)
    elif sec == 'notes':
        G['notes'].append(l)
    elif sec == 'content':
        m = re.match(r'([ＡＢＣＤ])　(.+)$', l)
        if m:
            area = {'letter': AREA_LETTER[m.group(1)], 'name': m.group(2)}; continue
        if l[0] in KAKKO:
            no = KAKKO.index(l[0]) + 1
            title = l[2:]
            item = {'id': 'sansu-%d-%s-%d' % (g, area['letter'], no), 'g': [g],
                    'area': area['letter'] + ('2' if area['name'] == '変化と関係' else ''),
                    'areaName': area['name'], 'no': no, 'title': title, 'lines': []}
            sansu['items'].append(item)
        else:
            item['lines'].append(l)

# ---------- 見出しとテーマ ----------
heads = {}
for l in open('sansu_midashi.tsv'):
    l = l.rstrip('\n')
    if not l or l.startswith('#'):
        continue
    key, head, th = l.split('\t')
    themes = {}
    for t in th.split('|'):
        k, _, lab = t.partition('=')
        themes[k] = lab or head
    heads[key] = (head, themes)
for it in sansu['items']:
    key = '%d-%s-%d' % (it['g'][0], it['area'][0], it['no'])
    it['head'], it['themes'] = heads.pop(key)
assert not heads, heads

# ---------- 内容の取扱いを、関係する内容に結びつける ----------
for g, G in sansu['grades'].items():
    for n in G['notes']:
        refs = re.findall(r'「([ＡＢＣＤ])[^」]*」(.*?)(?:について|に関連|$)', n)
        for letter, seg in refs:
            nos = [c for c in seg if c in KAKKO]
            for c in nos:
                for it in sansu['items']:
                    if it['g'][0] == g and it['area'][0] == AREA_LETTER[letter] and it['no'] == KAKKO.index(c) + 1:
                        it.setdefault('notes', [])
                        if n not in it['notes']:
                            it['notes'].append(n)

sansu['areas'] = [
    {'key': 'A', 'name': 'Ａ 数と計算', 'grades': [1, 2, 3, 4, 5, 6]},
    {'key': 'B', 'name': 'Ｂ 図形', 'grades': [1, 2, 3, 4, 5, 6]},
    {'key': 'C', 'name': 'Ｃ 測定', 'grades': [1, 2, 3]},
    {'key': 'C2', 'name': 'Ｃ 変化と関係', 'grades': [4, 5, 6]},
    {'key': 'D', 'name': 'Ｄ データの活用', 'grades': [1, 2, 3, 4, 5, 6]},
]
sansu['themes'] = [
    {'id': 'seisu', 'name': '整数のしくみ', 'area': 'A'},
    {'id': 'gaisu', 'name': 'がい数と見積もり', 'area': 'A'},
    {'id': 'kagen', 'name': 'たし算・ひき算', 'area': 'A'},
    {'id': 'jouhou', 'name': 'かけ算', 'area': 'A'},
    {'id': 'johou', 'name': 'わり算', 'area': 'A'},
    {'id': 'shousu', 'name': '小数', 'area': 'A'},
    {'id': 'bunsu', 'name': '分数', 'area': 'A'},
    {'id': 'shiki', 'name': '式と計算のきまり', 'area': 'A'},
    {'id': 'soroban', 'name': 'そろばん', 'area': 'A'},
    {'id': 'heimen', 'name': '平面図形', 'area': 'B'},
    {'id': 'rittai', 'name': '立体図形', 'area': 'B'},
    {'id': 'ichi', 'name': 'ものの位置', 'area': 'B'},
    {'id': 'kaku', 'name': '角', 'area': 'B'},
    {'id': 'menseki', 'name': '面積', 'area': 'B'},
    {'id': 'taiseki', 'name': '体積', 'area': 'B'},
    {'id': 'ryou', 'name': '量と単位', 'area': 'C'},
    {'id': 'jikan', 'name': '時刻と時間', 'area': 'C'},
    {'id': 'henka', 'name': '変わり方と比例', 'area': 'C2'},
    {'id': 'wariai', 'name': '割合・比・単位量あたり', 'area': 'C2'},
    {'id': 'data', 'name': 'データの活用', 'area': 'D'},
]
tids = {t['id'] for t in sansu['themes']}
for it in sansu['items']:
    for k in it['themes']:
        assert k in tids, (it['id'], k)
# A4のまとめ用に短くした教科の目標（Claudeによる要約）
sansu['goalShort'] = {
    'lead': '数学的な見方・考え方を働かせ，数学的活動を通して，数学的に考える資質・能力を育成する。',
    'points': [
        '知識及び技能：数量や図形の基礎的・基本的な概念や性質を理解し，日常の事象を数理的に処理する技能を身に付ける。',
        '思考力，判断力，表現力等：筋道を立てて考察する力，統合的・発展的に考察する力，数学的な表現で簡潔・明瞭・的確に表す力を養う。',
        '学びに向かう力，人間性等：数学的活動の楽しさや数学のよさに気付き，学んだことを生活や学習に活用しようとする態度を養う。',
    ],
}

data = {'sansu': sansu}
t = open('template.html').read()
t = t.replace('/*DATA*/', 'const CONTENT = ' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + ';')
# アーティファクト用（ページの外側はアーティファクトがつける）
open('page.html', 'w').write(t)
# 配る用のHTMLファイル（ダブルクリックで開ける形）
full = ('<!doctype html><html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + t + '</body></html>')
open('manabi-tsunagari-map.html', 'w').write(full)
print(len(sansu['items']), 'items', len(full.encode()), 'bytes')
