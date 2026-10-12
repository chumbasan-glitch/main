# HTML版（1つのファイルで使う版）を作る
#   Index.html と Logic.html をまとめて「時間割作成ツール.html」にする
#   使い方：python3 build_html.py
import os, re
here = os.path.dirname(os.path.abspath(__file__))
index = open(os.path.join(here, 'Index.html'), encoding='utf8').read()
logic = open(os.path.join(here, 'Logic.html'), encoding='utf8').read()
html = index.replace("<?!= include('Logic') ?>", '<script>window.JW_STANDALONE = true;</script>\n' + logic)
html = html.replace('<base target="_top">\n', '')
assert '<?!=' not in html
out = os.path.join(here, '時間割作成ツール.html')
open(out, 'w', encoding='utf8').write(html)
print('作成しました：', out)
