"""運動会（4色対抗）得点方式のモンテカルロ検証.

前提:
  - 6学年。各学年: 徒競走 RACES 本 → 学年種目、の順に 1年→6年。最後にリレー。
  - 徒競走は各レース4人（各色1人）。
  - 学年種目(1〜5年): 40/30/20/10。6年: 勝ち1色 40、他 20。リレー: 50/40/30/20。
  - 色の強さ: 各色に「強さ」bias を与え、個人能力 ~ N(bias, 1) の順位で着順を決める。
    学年種目・リレーも色の総合力 ~ N(bias*EVENT_SCALE, 1) で順位を決める。
"""
import numpy as np

RACES = 30          # 1学年あたりのレース数
N = 200_000         # 試行回数
EVENT_SCALE = 3.0   # 団体種目は個人より実力差が出やすい（平均化される）と仮定

GRADE_EVENT = np.array([40, 30, 20, 10])
G6_EVENT = np.array([40, 20, 20, 20])
RELAY = np.array([50, 40, 30, 20])
SCHEMES = {"現行 2-1-0-0": np.array([2, 1, 0, 0]), "変更案 3-2-1-0": np.array([3, 2, 1, 0])}


def ranks(rng, bias, shape):
    """bias(4,) の色が競う。返り値: 各色の順位(0=1位) shape+(4,)"""
    perf = rng.normal(size=shape + (4,)) + bias
    order = np.argsort(-perf, axis=-1)
    return np.argsort(order, axis=-1)


def simulate(race_pts, bias, seed=0):
    rng = np.random.default_rng(seed)
    score = np.zeros((N, 4))
    snaps = {}
    race_total = np.zeros((N, 4))
    event_total = np.zeros((N, 4))
    for g in range(1, 7):
        r = ranks(rng, bias, (N, RACES))
        rp = race_pts[r].sum(axis=1)
        score += rp
        race_total += rp
        table = G6_EVENT if g == 6 else GRADE_EVENT
        ep = table[ranks(rng, bias * EVENT_SCALE, (N,))]
        score += ep
        event_total += ep
        snaps[f"{g}年終了時"] = score.copy()
    snaps["リレー前"] = score.copy()
    score = score + RELAY[ranks(rng, bias * EVENT_SCALE, (N,))]
    return snaps, score, race_total, event_total


def leader(s):
    return np.argmax(s + np.random.default_rng(1).random(s.shape) * 1e-6, axis=1)


def report(name, race_pts, bias):
    snaps, final, race_total, event_total = simulate(race_pts, bias)
    win = leader(final)
    srt = np.sort(final, axis=1)
    print(f"  [{name}]")
    print(f"    徒競走の総配点: {race_pts.sum() * RACES * 6} 点 / 学年種目+リレー: {GRADE_EVENT.sum()*5 + G6_EVENT.sum() + RELAY.sum()} 点")
    print(f"    最終 1位-2位 平均差: {np.mean(srt[:, -1] - srt[:, -2]):.1f} 点")
    d = race_total[:, 0] - race_total[:, 1]
    print(f"    2色間の徒競走合計の差 標準偏差: {d.std():.1f} 点 (平均 {d.mean():+.1f})")
    for k in ["3年終了時", "4年終了時", "5年終了時", "リレー前"]:
        s = snaps[k]
        ss = np.sort(s, axis=1)
        gap = ss[:, -1] - ss[:, -2]
        flip = np.mean(leader(s) != win)
        print(f"    {k}: 1位の色が最終的に負ける確率 {flip*100:5.1f}%  (その時点の1-2位差 平均 {gap.mean():5.1f}, 中央値 {np.median(gap):4.0f})")
    s = snaps["リレー前"]
    ss = np.sort(s, axis=1)
    print(f"    リレー前の1-2位差が30点以内(リレーで逆転可能圏): {np.mean(ss[:, -1] - ss[:, -2] <= 30)*100:.1f}%")
    if bias.any():
        print(f"    最強色の優勝確率: {np.mean(win == np.argmax(bias))*100:.1f}%")


if __name__ == "__main__":
    scenarios = {
        "A: 4色の実力が互角": np.zeros(4),
        "B: 1色だけ少し強い (徒競走1位率 約30%)": np.array([0.12, 0, 0, 0]),
        "C: 1色がかなり強い (徒競走1位率 約35%)": np.array([0.25, 0, 0, 0]),
    }
    for sname, bias in scenarios.items():
        print(f"■ {sname}")
        if bias.any():
            r = ranks(np.random.default_rng(9), bias, (200_000,))
            print(f"   (参考: 強い色の徒競走1位率 {np.mean(r[:, 0] == 0)*100:.1f}%)")
        for name, pts in SCHEMES.items():
            report(name, pts, bias)
        print()
