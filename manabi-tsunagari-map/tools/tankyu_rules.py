# 教科の内容を「探究の11ステップ」に結ぶ案（Claudeの案）を作る
# 使い方: python3 tools/tankyu_rules.py  → midashi/tankyu_steps.tsv（このファイルを確かめて手で直す）
# 意味で判断した結び付きを，項目と根拠になる行の言葉で書いておく
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS = json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items']

# 解説（総合的な学習の時間編）に例があるもの
EX6 = '解説 総合編 p.116-117'
EX7 = '解説 総合編 p.117-118'
EX9 = '解説 総合編 p.118-119'
EX96 = '解説 総合編 p.96'

# (項目のid（正規表現）, 根拠の行（正規表現）, ステップ, 解説の例)
RULES = [
    # 理科：学年ごとの問題解決の力
    (r'^rika-', r'問題を見いだし', '1,3', ''),
    (r'^rika-', r'根拠のある予想や仮説を発想', '4', ''),
    (r'^rika-', r'解決の方法を発想', '5', ''),
    (r'^rika-', r'予想や仮説を基に', '4', ''),   # 5年：予想や仮説を基に計画する
    (r'^rika-', r'より妥当な考えをつくりだし', '7,8', ''),
    (r'^rika-', r'観察，実験などに関する技能', '6', EX6),
    # 社会：調べてまとめる技能，着目して捉え考え表現する
    (r'^shakai-', r'資料で調べ|調査したり', '6,9', EX6),
    (r'^shakai-', r'着目して.*捉え.*考え，表現すること', '7,10', ''),
    # 算数：データの活用
    (r'^sansu-1-D', r'絵や図などに表したり', '7', EX7),
    (r'^sansu-2-D', r'表やグラフを用いて', '7', EX7),
    (r'^sansu-3-D', r'分類整理し，表に表したり|表やグラフを用いて考察して，見いだしたことを表現', '7,9', EX7),
    (r'^sansu-[45]-D-1', r'データを集めて分類整理し', '6,7,8', EX7),
    (r'^sansu-5-D-1', r'統計的な問題解決の方法', '3,5,6,7,8', EX7),
    (r'^sansu-6-D-1', r'統計的な問題解決の方法', '3,5,6,7,8', EX7),
    (r'^sansu-6-D-1', r'妥当性について批判的に考察', '7,8,11', EX7),
    (r'^sansu-5-D-2', r'平均する方法について考察', '7', ''),
    (r'^sansu-6-D-2', r'落ちや重なりなく調べる方法', '7', ''),
    # 国語：情報の扱い方
    (r'^kokugo-..-K2-ア', r'.', '7', EX7),
    (r'^kokugo-34-K2-イ', r'.', '6,7,9', EX7),
    (r'^kokugo-56-K2-イ', r'.', '7,9', EX7),
    (r'^kokugo-(34|56)-K3-オ', r'.', '6', ''),
    # 国語：話すこと・聞くこと
    (r'^kokugo-..-A-ア', r'.', '2,6', ''),
    (r'^kokugo-..-A-イ', r'.', '9', ''),
    (r'^kokugo-..-A-ウ', r'.', '10', EX9),
    (r'^kokugo-..-A-エ', r'.', '6', EX6),
    (r'^kokugo-..-A-オ', r'.', '7,10', ''),
    (r'^kokugo-..-A-2', r'質問するなどして情報を集め|インタビューなどをして', '6,10', EX6),
    (r'^kokugo-..-A-2', r'紹介や説明，報告|説明や報告など調べたこと|意見や提案など', '10', ''),
    # 国語：書くこと
    (r'^kokugo-..-B-ア', r'.', '2,6', ''),
    (r'^kokugo-..-B-イ', r'.', '9', ''),
    (r'^kokugo-..-B-ウ', r'.', '9', EX96),
    (r'^kokugo-56-B-エ', r'.', '9', EX96),
    (r'^kokugo-(12|34)-B-エ', r'.', '9,11', ''),
    (r'^kokugo-56-B-オ', r'.', '9,11', ''),
    (r'^kokugo-(12|34)-B-オ', r'.', '10,11', ''),
    (r'^kokugo-56-B-カ', r'.', '10,11', ''),
    (r'^kokugo-..-B-2', r'報告|記録|事象を説明', '9', EX96),
    # 国語：読むこと
    (r'^kokugo-34-C-ウ', r'.', '7', ''),
    (r'^kokugo-56-C-ウ', r'.', '6,7', ''),
    (r'^kokugo-..-C-カ', r'.', '10', ''),
    (r'^kokugo-..-C-2', r'学校図書館', '6,9,10', ''),
    # 生活
    (r'^seikatsu-12-S1-[13]', r'.', '6', ''),
    (r'^seikatsu-12-S2-5', r'.', '6', ''),
    (r'^seikatsu-12-S2-5', r'違いや特徴を見付け', '1', ''),   # 問題意識の芽（3年理科「問題を見いだす」の土台）
    (r'^seikatsu-12-S2-6', r'不思議さに気付く', '1', ''),
    (r'^seikatsu-12-S2-7', r'.', '6', ''),
    (r'^seikatsu-12-S2-6', r'.', '9', ''),
    (r'^seikatsu-12-S2-8', r'.', '10', ''),
    (r'^seikatsu-12-S3-9', r'.', '11', ''),
    # 音楽・図画工作：表現
    (r'^ongaku-..-A-', r'^ウ', '9', EX9),
    (r'^zuko-..-A-1', r'.', '2,5', ''),
    (r'^zuko-..-A-2', r'.', '9', EX9),
    (r'^zuko-..-B-1', r'.', '10', ''),
    # 家庭
    (r'^katei-56-A-4', r'.', '1,3,5,11', ''),
    (r'^katei-56-C-1', r'情報の収集・整理', '6,7', ''),
    (r'^katei-56-B-2', r'調理計画について理解', '5', ''),
    (r'^katei-56-B-5', r'製作計画について理解', '5', ''),
    (r'^katei-56-B-5', r'製作計画を考え，製作を工夫', '5,9', ''),
    # 体育
    (r'^taiiku-12-.-0', r'^⑵', '10', ''),
    (r'^taiiku-(34|56)-.-0', r'^⑵', '3,5,10', ''),
    (r'^taiiku-.-G-', r'^イ', '3,7,10', ''),
    # 外国語活動・外国語
    (r'^gaikoku.*-L-', r'.', None, ''),   # 領域ごとに下で決める
    (r'^gaikoku.*-S-2', r'^ア', '10', ''),
    # 道徳
    (r'^doutoku-56-A-06', r'.', '1', ''),
    # 特別活動
    (r'^tokkatsu-.*-GK-1ア', r'課題を見いだし', '1,3,5,10', ''),
    (r'^tokkatsu-.*-JK-1', r'計画を立て', '3,5', ''),
    (r'^tokkatsu-.*-GK-3ウ', r'学校図書館', '6,11', ''),
    (r'^tokkatsu-.*-GG-2', r'成果を発表', '10', ''),
    (r'^tokkatsu-.*-CL-3', r'発表すること', '10', ''),
]
GAIKOKU = {'聞くこと': '6', '読むこと': '6', '話すこと［やり取り］': '10', '話すこと［発表］': '10', '書くこと': '9'}

def key_phrase(l):
    """根拠として色を付ける行を，行のはじめの言葉で示す"""
    return l[:24]

rows = {}
for it in ITEMS:
    for idre, linere, steps, ex in RULES:
        if not re.search(idre, it['id']):
            continue
        for k, l in enumerate(it['lines']):
            if not re.search(linere, l):
                continue
            st = steps or GAIKOKU.get(it['head'], '')
            if not st:
                continue
            if steps is None and k > 0:
                continue
            r = rows.setdefault((it['id'], k), [set(), set(), l])
            r[0].update(st.split(','))
            if ex: r[1].add(ex)
out = ['# 教科の内容と「探究の11ステップ」の結び付き（Claudeの案。tools/tankyu_rules.py で作り，手で確かめる）',
       '# 内容\t根拠の行の書き出し\tステップ\t解説総合編の例']
for (iid, k), (st, ex, l) in sorted(rows.items(), key=lambda x: (x[0][0], x[0][1])):
    out.append('\t'.join([iid, key_phrase(l), ','.join(sorted(st, key=int)), ' '.join(sorted(ex))]))
open(os.path.join(ROOT, 'midashi', 'tankyu_steps.tsv'), 'w').write('\n'.join(out) + '\n')
print(len(rows), 'rows')
