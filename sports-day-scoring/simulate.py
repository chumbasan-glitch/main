"""運動会（4色対抗）得点方式のモンテカルロ検証.

前提:
  - 徒競走のレース数（学年別）: 1年35 2年34 3年33 4年32 5年28 6年33。各レース4人（各色1人）。
  - 競技順: 徒競走2年→学年種目3年→徒競走1年→学年種目2年→徒競走3年→学年種目1年
            →徒競走5年→学年種目6年→徒競走4年→学年種目5年→徒競走6年→学年種目4年→リレー
  - 学年種目(1〜5年): 40/30/20/10。6年: 勝ち2色が40、負け2色が20。リレー: 50/40/30/20。
  - 色の強さ: 個人能力 ~ N(bias, 1) の順位で着順。団体種目は N(bias*EVENT_SCALE, 1)。
"""
import numpy as np

RACES = {1: 35, 2: 34, 3: 33, 4: 32, 5: 28, 6: 33}
ORDER = [("徒", 2), ("学", 3), ("徒", 1), ("学", 2), ("徒", 3), ("学", 1),
         ("徒", 5), ("学", 6), ("徒", 4), ("学", 5), ("徒", 6), ("学", 4), ("リ", 0)]
N = 100_000
EVENT_SCALE = 3.0

GRADE_EVENT = np.array([40, 30, 20, 10])
G6_EVENT = np.array([40, 40, 20, 20])
RELAY = np.array([50, 40, 30, 20])
SCHEMES = {"現行 2-1-0-0": np.array([2, 1, 0, 0]), "変更案 3-2-1-0": np.array([3, 2, 1, 0])}


def ranks(rng, bias, shape):
    perf = rng.normal(size=shape + (4,)) + bias
    return np.argsort(np.argsort(-perf, axis=-1), axis=-1)


def label(kind, g):
    return {"徒": f"{g}年徒競走", "学": f"{g}年学年種目", "リ": "リレー"}[kind]


def simulate(race_pts, bias, seed=0):
    rng = np.random.default_rng(seed)
    score = np.zeros((N, 4))
    after = []  # 各競技 終了後の得点
    for kind, g in ORDER:
        if kind == "徒":
            score = score + race_pts[ranks(rng, bias, (N, RACES[g]))].sum(axis=1)
        else:
            table = RELAY if kind == "リ" else (G6_EVENT if g == 6 else GRADE_EVENT)
            score = score + table[ranks(rng, bias * EVENT_SCALE, (N,))]
        after.append(score.copy())
    return after


def leader(s):
    return np.argmax(s + np.random.default_rng(1).random(s.shape) * 1e-6, axis=1)


def gap12(s):
    ss = np.sort(s, axis=1)
    return ss[:, -1] - ss[:, -2]


def run(bias):
    out = {}
    for name, pts in SCHEMES.items():
        after = simulate(pts, bias)
        final = after[-1]
        win = leader(final)
        rows = []
        for i, (kind, g) in enumerate(ORDER[:-1]):
            s = after[i]
            rows.append((label(*ORDER[i + 1]) + "の前", np.mean(leader(s) != win) * 100, np.median(gap12(s))))
        out[name] = dict(rows=rows, final_gap=np.median(gap12(final)),
                         close10=np.mean(gap12(final) <= 10) * 100,
                         relay_zone=np.mean(gap12(after[-2]) <= 30) * 100,
                         strong=np.mean(win == 0) * 100)
    return out


if __name__ == "__main__":
    scenarios = {
        "A: 4色の実力が互角": np.zeros(4),
        "B: 1色だけ少し強い (徒競走1位率 約28%)": np.array([0.12, 0, 0, 0]),
    }
    for sname, bias in scenarios.items():
        print(f"■ {sname}")
        res = run(bias)
        names = list(SCHEMES)
        print(f"  {'時点':<14}" + "".join(f"| {n}: 逆転率 / 1-2位差(中央値) " for n in names))
        for k in range(len(ORDER) - 1):
            line = f"  {res[names[0]]['rows'][k][0]:<14}"
            for n in names:
                _, flip, gap = res[n]["rows"][k]
                line += f"|   {flip:5.1f}% / {gap:4.0f}点                    "
            print(line)
        for n in names:
            r = res[n]
            print(f"  [{n}] 最終1-2位差 中央値 {r['final_gap']:.0f}点 / 最終差10点以内 {r['close10']:.1f}%"
                  f" / リレー前の差30点以内 {r['relay_zone']:.1f}%"
                  + (f" / 強い色の優勝率 {r['strong']:.1f}%" if bias.any() else ""))
        print()
