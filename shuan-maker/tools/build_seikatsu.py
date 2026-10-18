# 生活科：単元指導計画の読み取り結果から、1時間ずつの学習活動を作る（活動が時数より少ない小単元は、1つの活動を何時間かに分ける）
import json, re, sys
d = json.load(open(sys.argv[1]))
Z = str.maketrans('０１２３４５６７８９', '0123456789')
out = {1: [], 2: []}
for u in d:
    g = 1 if u['when'].startswith('1年') else 2
    m = re.search(r'(\d+)月', u['when'].translate(Z)); month = int(m.group(1)) if m else None
    name = re.sub(r'\s+', ' ', u['name'].translate(Z)).strip()
    lessons = []
    if not any(s['hours'] for s in u['subs']):
        # スタートカリキュラム（いちねんせいが はじまるよ）：生活科の時間だけ
        lessons = ['「いちねんせいが はじまるよ」のイラストを見て、学校にいる人やあるものについて話し、小学校生活への期待をもつ。',
                   '学校の中をたんけんし、いろいろなものを見たり、学校の人と関わったりする。（1/3）',
                   '学校の中をたんけんし、いろいろなものを見たり、学校の人と関わったりする。（2/3）',
                   '学校の中をたんけんし、いろいろなものを見たり、学校の人と関わったりする。（3/3）',
                   '校庭をたんけんし、春の植物や生き物を見つけたり、みんなで遊んだりする。',
                   '「わたし できるよ」を見て、これまでの生活で身につけたことを生かして学校生活を送る。']
    else:
        for s in u['subs']:
            h = s['hours'] or 0
            if h == 0: continue          # 配当外の小単元は入れない
            acts = s['acts'] or [s['title'] + 'の活動をする。']
            k = len(acts)
            if k >= h:                   # 活動のほうが多いときは、あまりを最後の時間にまとめる
                per = [[a] for a in acts[:h - 1]] + [acts[h - 1:]]
                for x in per: lessons.append('\n'.join(x))
            else:                        # 活動が少ないときは、前の活動から順に時間を多めに割り当てる
                base, extra = divmod(h, k)
                for i, a in enumerate(acts):
                    n = base + (1 if i < extra else 0)
                    for j in range(n): lessons.append(a + (f'（{j + 1}/{n}）' if n > 1 else ''))
    hours = len(lessons)
    out[g].append({'name': name, 'month': month, 'hours': hours, 'aim': u['aim'], 'lessons': lessons, 'short': lessons})
for g in (1, 2):
    json.dump({'units': out[g]}, open(sys.argv[2].replace('{g}', str(g)), 'w'), ensure_ascii=False, indent=1)
    print(g, len(out[g]), sum(u['hours'] for u in out[g]), [(u['name'], u['hours']) for u in out[g]])
