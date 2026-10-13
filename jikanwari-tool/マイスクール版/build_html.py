# HTML版（1つのファイルで使う版）を作る
#   Index.html と Logic.html をまとめて「時間割作成ツール_v〇.html」にする（〇はバージョン）
#   使い方：python3 build_html.py
import glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
index = open(os.path.join(here, 'Index.html'), encoding='utf8').read()
logic = open(os.path.join(here, 'Logic.html'), encoding='utf8').read()
html = index.replace("<?!= include('Logic') ?>", '<script>window.JW_STANDALONE = true;</script>\n' + logic)
html = html.replace('<base target="_top">\n', '')
assert '<?!=' not in html
# バージョン（Index.html の data-version）をファイル名に付ける。古い版のファイルは消す
ver = re.search(r'data-version="([^"]+)"', index).group(1)
for old in glob.glob(os.path.join(here, '時間割作成ツール*.html')):
    os.remove(old)
out = os.path.join(here, '時間割作成ツール_v' + ver + '.html')
open(out, 'w', encoding='utf8').write(html)
print('作成しました：', out)
