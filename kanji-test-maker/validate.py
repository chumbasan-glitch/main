"""例文データ（sent6.txt）の点検。
- 書式、問題の言葉に未習の漢字がないか、答えの漢字が問題の外に出ていないか
- 例文の数が max(3, 教科書の読み方の数) か、すべての読み方に例文があるか
"""
import re

def iskanji(c): return '一' <= c <= '鿿' or c == '々'

grade = {}
for l in open('grades.txt'):
    g, v = l.strip().split(':')
    for c in v: grade[c] = int(g)
unit = {}
for l in open('units6.txt'):
    n, rest = l.strip().split(' ', 1); name, ks = rest.split('：')
    for c in ks.split(): unit[c] = int(n); grade[c] = 6
READ = {}
for l in open('readings6.txt'):
    for t in l.split():
        if ':' in t: cur, r = t.split(':'); READ[cur] = [r]
        else: READ[cur].append(t)

def learned(c, u): return c in grade and (grade[c] < 6 or (grade[c] == 6 and unit[c] <= u))
def hira(x): return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in x)
SEI = str.maketrans('がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ', 'かきくけこさしすせそたちつてとはひふへほはひふへほ')
def norm(x): return x.translate(SEI)

def reading_of(items, k):
    """問題の言葉のうち、漢字 k の読み（訓は送りがなまで）。"""
    for i, it in enumerate(items):
        if it[0] == 'r' and k in it[1]:
            rd = it[2].split('/')[0]
            if len(it[1]) > 1: return None
            ok = ''
            for j in items[i + 1:]:
                if j[0] == 'k' and j[3]: ok += j[1]
                else: break
            return rd, ok
    return None

def covers(r, got):
    r = hira(r)
    for rd, ok in got:
        full = rd + ok
        if full == r or norm(rd) == norm(r) or (r, rd) == ('おう', 'のう'): return True  # 天皇（オウの連声）
        if rd.endswith('っ') and norm(r).startswith(norm(rd[:-1])) and len(r) == len(rd): return True
        if ok and r.startswith(rd) and len(r) > len(rd) and full[:len(r) - 1] == r[:-1]: return True
    return False

tok = re.compile(r'\{([^{}|]+)\|([^{}|]+)\}|\[|\]|([^{}\[\]])')
errs = 0; seen = set(); maxlen = 0; total = 0
for ln, l in enumerate(open('sent6.txt'), 1):
    l = l.rstrip('\n')
    if not l.strip(): continue
    parts = l.split('\t'); k = parts[0]; seen.add(k); u = unit[k]
    need = max(3, len(READ[k]))
    if len(parts) - 1 != need: print(ln, k, 'need', need, 'got', len(parts) - 1); errs += 1
    got = []
    for s in parts[1:]:
        total += 1
        intgt = False; items = []; vis = ''; ntgt = 0; pos = 0
        for m in tok.finditer(s):
            if m.start() != pos: print(ln, 'BAD', s); errs += 1
            pos = m.end(); t = m.group(0)
            if t == '[': intgt = True; ntgt += 1; continue
            if t == ']': intgt = False; continue
            if m.group(1):
                base, rd = m.group(1), m.group(2)
                items.append(('r', base, rd, intgt))
                if not all(iskanji(c) for c in base): print(ln, 'base non-kanji', base, s); errs += 1
                if intgt:
                    for c in base:
                        if not learned(c, u): print(ln, k, 'target has unlearned', c, s); errs += 1
                    vis += base
                else:
                    if k in base: print(ln, k, 'target kanji outside target', s); errs += 1
                    vis += base if all(learned(c, u) for c in base) else rd.split('/')[0]
            else:
                c = m.group(3); items.append(('k', c, None, intgt))
                if iskanji(c): print(ln, 'bare kanji', c, s); errs += 1
                vis += c
        if pos != len(s): print(ln, 'BAD tail', s); errs += 1
        if ntgt != 1: print(ln, k, 'targets', ntgt, s); errs += 1
        if not any(it[3] and k in it[1] for it in items): print(ln, k, 'target missing kanji', s); errs += 1
        r = reading_of(items, k)
        if r: got.append(r)
        maxlen = max(maxlen, len(vis))
    lack = [r for r in READ[k] if not covers(r, got)]
    if lack: print('reading not covered', k, lack, got); errs += 1
print('missing', set(unit) - seen, 'errors', errs, 'sentences', total, 'maxlen', maxlen)
