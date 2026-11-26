# PC版：PDFを作るしくみ（jsPDF 2.5.1, MITライセンス）をファイルの中に入れて1つのHTMLにする
import sys, re
tpl, lib, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(tpl, encoding='utf-8').read()
j = open(lib, encoding='utf-8').read()
j = re.sub(r'//# sourceMappingURL=.*', '', j)
assert '</script' not in j.lower()
s = s.replace('<script>/*JSPDF*/</script>', '<script>\n' + j + '\n</script>', 1)
open(out, 'w', encoding='utf-8').write(s)
print(out, len(s))
