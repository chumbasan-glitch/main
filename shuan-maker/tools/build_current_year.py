# 来年度用（週案シートを選べる版）から、今年度用（いつも「これまでのシート」）を作る
# 使い方: python3 build_current_year.py <来年度用のファイル> <今年度用のファイル> <今年度用の版（例 v9.8）>
import re, sys
src, dst, ver = sys.argv[1:4]
s = open(src, encoding='utf-8').read()
assert s.count('const SHEET_LOCK = false;') == 1
s = s.replace('const SHEET_LOCK = false;', 'const SHEET_LOCK = true;')
s, n = re.subn(r'const VERSION = "v[\d.]+";', f'const VERSION = "{ver}";', s)
assert n == 1
open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst, ver)
