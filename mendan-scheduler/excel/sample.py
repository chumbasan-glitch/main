"""35人分のテストデータを入れたファイルを作る： python3 sample.py 元のファイル 出力ファイル"""
import random, sys
from openpyxl import load_workbook

random.seed(2026)
src, out = sys.argv[1], sys.argv[2]
wb = load_workbook(src)
ros, inp = wb["名簿"], wb["×入力"]
sei = ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤", "吉田", "山田", "佐々木", "山口", "松本",
       "井上", "木村", "林", "斎藤", "清水", "山崎", "森", "池田", "橋本", "阿部", "石川", "山下", "中島", "石井", "小川",
       "前田", "岡田", "長谷川", "藤田", "後藤"]
mei = ["はると", "ゆい", "そうた", "めい", "ひなた", "さくら", "りく", "あおい", "ゆうと", "ひまり", "いつき", "りん", "そら", "ゆな",
       "たいが", "こはる", "れん", "みお", "かいと", "えま", "はやと", "つむぎ", "あさひ", "ここな", "ゆうま", "ほのか", "しょう",
       "あかり", "けんと", "ゆず", "だいち", "みゆ", "こうき", "さら", "りょう"]
special = {
    4: dict(sib="〇", memo="2年1組 弟"), 11: dict(sib="〇", memo="5年3組 兄"), 19: dict(sib="〇", memo="1年2組 妹"),
    27: dict(sib="〇", memo="3年1組 弟"),
    2: dict(hope="遅い時刻"), 8: dict(hope="早い時刻"), 15: dict(hope="早い日"), 23: dict(hope="遅い日"),
    30: dict(hope="遅い時刻"), 33: dict(hope="早い時刻"),
    6: dict(gap="必ず空けたい"), 14: dict(gap="出来れば空けたい"), 21: dict(gap="必ず空けたい"), 34: dict(gap="出来れば空けたい"),
}
status = {9: "×なし", 17: "×なし", 25: "×なし", 12: "未提出", 31: "未提出", 35: "未入力"}
D, T = 5, 9
for i in range(1, 36):
    r, b = 4 + i, 5 + (i - 1) * 15
    ros[f"A{r}"] = i
    ros[f"B{r}"] = f"{sei[i-1]} {mei[i-1]}"
    sp = special.get(i, {})
    if "sib" in sp: ros[f"C{r}"], ros[f"D{r}"] = sp["sib"], sp["memo"]
    if "hope" in sp: ros[f"E{r}"] = sp["hope"]
    if "gap" in sp: ros[f"F{r}"] = sp["gap"]
    st = status.get(i)
    if st == "×なし": inp[f"F{b}"] = "×なし（どこでもOK）"; continue
    if st == "未提出": inp[f"F{b}"] = "未提出"; continue
    if st == "未入力": continue
    ng = set()
    kind = random.random()
    if kind < 0.3:      # 都合の悪い日がまるごとある
        for d in random.sample(range(1, D + 1), random.randint(1, 3)):
            ng |= {(d, t) for t in range(1, T + 1)}
    elif kind < 0.5:    # 早い時間は無理（仕事）
        cut = random.randint(3, 6)
        ng |= {(d, t) for d in range(1, D + 1) for t in range(1, cut)}
    elif kind < 0.6:    # 遅い時間は無理
        cut = random.randint(5, 8)
        ng |= {(d, t) for d in range(1, D + 1) for t in range(cut, T + 1)}
    for _ in range(random.randint(3, 12)):   # ばらばらの×
        ng.add((random.randint(1, D), random.randint(1, T)))
    if len(ng) >= D * T - 2:
        ng = set(list(ng)[: D * T - 6])
    for d, t in ng:
        inp.cell(b + 1 + t, 2 + d).value = "×"
wb.save(out)
print("saved", out)
