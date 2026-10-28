' ===== 面談日程ツール Ver.3.0 マクロ（ThisWorkbook に貼り付け） =====
' 自動案（A：詰める／B：散らす）を作る・調整・決定へ写す・×のダブルクリック入力・入れ替え・ひとつ前に戻す・印刷・PDF
Option Explicit

Private Const NS As Long = 40            ' 児童の上限
Private Const ND As Long = 6             ' 日数の上限
Private Const NT As Long = 24            ' 1日の枠の上限
Private Const NN As Long = 144           ' 枠の総数（ND×NT）
Private Const BIGV As Double = 1000000000#
Private Const BLK As Long = 28           ' ×入力の1人分の行数
Private Const HIST As Long = 10          ' 「ひとつ前に戻す」でとっておく数

Private mBusy As Boolean                 ' マクロが書いているあいだは、変更の合図を無視する
Public gNoRepair As Boolean              ' 確かめ用（入れ替えでなおさない）

' ---- 計算Aから読むもの ----
Private rDay() As Double, rTime() As Double, rAvoid() As Double, rOcc0() As Double, rNext() As Double
Private rNB() As Double, rNoGap() As Double, rPrio() As Double, rOcc() As Double
Private okM() As Double, xM() As Double
Private sElig() As Double, sGap() As Double, sHope() As Double, sSibFlag() As Double, sNoGap() As Double, sSibT() As Double
Private sS() As Double, sD() As Double, sT() As Double, sPre() As Double, sPost() As Double, sPref() As Double
Private nAM As Double, nPM As Double

' ---- 結果 ----
Private outB() As Long, outC() As Long, outG() As Long

' =====================================================================
'  Excel の出来事
' =====================================================================
Private Sub Workbook_Open()
    On Error Resume Next
    If Application.Calculation <> xlCalculationAutomatic Then Application.Calculation = xlCalculationAutomatic
    mBusy = True
    Me.Worksheets("calcA").Range("A5:B5").ClearContents      ' 入れ替えで選んでいたマス
    mBusy = False
    SaveShadow
    AdjustRows
    SiblingColumns
End Sub

Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
    If mBusy Then Exit Sub
    On Error GoTo Done
    Select Case Sh.Name
        Case "設定"
            If Not Intersect(Target, Sh.Range("B3:D5")) Is Nothing Then AdjustRows
        Case "名簿"
            If Not Intersect(Target, Sh.Range("E5:E44")) Is Nothing Then SiblingColumns
        Case "×入力"
            If Not Intersect(Target, Sh.Range("D3")) Is Nothing Then JumpToChild
        Case "調整・決定"
            If Not Intersect(Target, Sh.Range("C6:H29")) Is Nothing Then PushHistoryFromShadow: SaveShadow
    End Select
Done:
End Sub

Private Sub Workbook_SheetSelectionChange(ByVal Sh As Object, ByVal Target As Range)
    If mBusy Then Exit Sub
    On Error GoTo Done
    If Sh.Name = "調整・決定" Then
        If Target.CountLarge = 1 Then
            If Not Intersect(Target, Sh.Range("C6:H29")) Is Nothing Then
                If CStr(Target.Value) <> "" And CStr(Target.Value) <> CStr(Sh.Range("J5").Value) Then
                    mBusy = True
                    Sh.Range("J5").Value = Target.Value          ' 「児童を選ぶ」に入れる → 入れられる枠に色がつく
                    mBusy = False
                End If
            End If
        End If
    End If
Done:
    mBusy = False
End Sub

Private Sub Workbook_SheetBeforeDoubleClick(ByVal Sh As Object, ByVal Target As Range, Cancel As Boolean)
    If mBusy Then Exit Sub
    On Error GoTo Done
    Select Case Sh.Name
        Case "×入力": ToggleX Sh, Target, Cancel
        Case "調整・決定": SwapPick Sh, Target, Cancel
    End Select
Done:
    mBusy = False
End Sub

Private Sub Workbook_SheetFollowHyperlink(ByVal Sh As Object, ByVal Target As Hyperlink)
    Dim a As String
    On Error GoTo Done
    a = Sh.Name & "!" & Target.Range.Cells(1, 1).Address(False, False)
    Select Case a
        Case "自動案A!J3", "自動案B!J3": MakePlans
        Case "自動案A!K3": CopyPlan "自動案A"
        Case "自動案B!K3": CopyPlan "自動案B"
        Case "×入力!G3": NextUnentered
        Case "調整・決定!J3": UndoGrid
        Case "兄弟確認用!J3": Preview "兄弟確認用"
        Case "兄弟確認用!K3": SavePDF "兄弟確認用"
        Case "お手紙（秋）!M4", "お手紙（夏）!J4": Preview LetterSheet()
        Case "お手紙（秋）!M6", "お手紙（夏）!J6": SavePDF LetterSheet()
    End Select
    Exit Sub
Done:
    mBusy = False
    Application.ScreenUpdating = True
    MsgBox "うまく動きませんでした（" & Err.Description & "）", vbExclamation
End Sub

' =====================================================================
'  設定・名簿・×入力
' =====================================================================
Public Sub AdjustRows()
    ' 設定の枠の数に合わせて、×入力・お手紙の「使わない時刻の行」を隠す／出す（フィルターをかけ直す）
    Dim nm As Variant, ws As Worksheet
    On Error Resume Next
    Application.Calculate
    For Each nm In Array("×入力", "お手紙（夏）", "お手紙（秋）")
        Set ws = Me.Worksheets(CStr(nm))
        If ws.AutoFilterMode Then ws.AutoFilter.ApplyFilter
    Next
End Sub

Public Sub SiblingColumns()
    ' 兄弟が〇の子がいれば、兄弟①〜③の列を開く。いなければたたむ
    Dim ws As Worksheet, n As Long
    On Error Resume Next
    Set ws = Me.Worksheets("名簿")
    n = Application.WorksheetFunction.CountIf(ws.Range("E5:E44"), "?*")
    If n > 0 Then
        ws.Outline.ShowLevels ColumnLevels:=2
    Else
        ws.Outline.ShowLevels ColumnLevels:=1
    End If
End Sub

Private Sub ToggleX(ByVal ws As Worksheet, ByVal Target As Range, Cancel As Boolean)
    ' ×入力：表のマス・「この日全部」・「この時間全部」をダブルクリックすると、×が付く／消える
    Dim r As Long, c As Long, off As Long, hit As Boolean
    If Target.Cells.Count <> 1 Then Exit Sub
    r = Target.Row: c = Target.Column
    If r < 5 Then Exit Sub
    off = (r - 5) Mod BLK
    If c >= 3 And c <= 2 + ND And ((off >= 3 And off <= 2 + NT) Or off = 1) Then hit = True
    If c = 1 And off >= 3 And off <= 2 + NT Then hit = True
    If Not hit Then Exit Sub
    Cancel = True
    mBusy = True
    If Trim(CStr(Target.Value)) = "" Then Target.Value = "×" Else Target.ClearContents
    mBusy = False
End Sub

Private Sub JumpToChild()
    Dim ws As Worksheet, nm As String, i As Long
    Set ws = Me.Worksheets("×入力")
    nm = CStr(ws.Range("D3").Value)
    If nm = "" Then Exit Sub
    i = ChildIndex(nm)
    If i > 0 Then Application.Goto ws.Range("A" & (5 + (i - 1) * BLK)), True
End Sub

Private Function ChildIndex(ByVal nm As String) As Long
    Dim ros As Worksheet, i As Long
    Set ros = Me.Worksheets("名簿")
    For i = 1 To NS
        If CStr(ros.Cells(4 + i, 16).Value) = nm Then ChildIndex = i: Exit Function
    Next
End Function

Private Sub NextUnentered()
    ' 今いる子の次から、×が「未入力」の子をさがして、その子の表へ
    Dim ws As Worksheet, ros As Worksheet, cur As Long, k As Long, i As Long
    Set ws = Me.Worksheets("×入力"): Set ros = Me.Worksheets("名簿")
    cur = 0
    If ActiveSheet.Name = "×入力" Then
        If ActiveCell.Row >= 5 Then cur = (ActiveCell.Row - 5) \ BLK + 1
    End If
    For k = 1 To NS
        i = ((cur + k - 1) Mod NS) + 1
        If CStr(ros.Cells(4 + i, 17).Value) = "未入力" Then
            mBusy = True
            ws.Range("D3").Value = ros.Cells(4 + i, 16).Value
            mBusy = False
            Application.Goto ws.Range("A" & (5 + (i - 1) * BLK)), True
            Exit Sub
        End If
    Next
    MsgBox "×が未入力の子はいません。", vbInformation
End Sub

' =====================================================================
'  自動案
' =====================================================================
Public Sub MakePlans()
    Dim nfA As Long, nfB As Long, ca As Worksheet
    Application.ScreenUpdating = False
    Application.Calculate
    Set ca = Me.Worksheets("calcA")
    LoadData
    nfA = RunPlan(False): WritePlan Me.Worksheets("calcB")
    nfB = RunPlan(True): WritePlan Me.Worksheets("calcC")
    mBusy = True
    With Me.Worksheets("calcB")
        .Range("B1").Value = 1
        .Range("C1").Value = ca.Range("A7").Value       ' 作ったときの「入力の合計」（あとで変わったら知らせる）
        .Range("D1").Value = Now
    End With
    mBusy = False
    Application.Calculate
    Application.ScreenUpdating = True
    If nfA + nfB = 0 Then
        MsgBox "自動案A・Bを作りました。", vbInformation
    Else
        MsgBox "自動案A・Bを作りました。" & vbLf & "入る枠がない子：A " & nfA & "人、B " & nfB & "人" & vbLf & "（右の「入る枠がない」に名前が出ています）", vbInformation
    End If
End Sub

Private Sub Rng1(ByVal ws As Worksheet, ByVal r As Long, a() As Double)
    ' 計算Aの r 行目の D〜EQ（枠1〜144）を 1〜144 の配列に
    Dim v As Variant, j As Long
    v = ws.Range(ws.Cells(r, 4), ws.Cells(r, 3 + NN)).Value
    ReDim a(1 To NN)
    For j = 1 To NN: a(j) = Val0(v(1, j)): Next
End Sub

Private Function Val0(ByVal x As Variant) As Double
    If IsNumeric(x) And Not IsEmpty(x) Then Val0 = CDbl(x) Else Val0 = 0
End Function

Private Sub LoadData()
    Dim ca As Worksheet, v As Variant, i As Long, j As Long, k As Long, p As Long
    Set ca = Me.Worksheets("calcA")
    Rng1 ca, 2, rDay: Rng1 ca, 3, rTime: Rng1 ca, 5, rAvoid: Rng1 ca, 7, rOcc0
    Rng1 ca, 106, rNext: Rng1 ca, 109, rOcc: Rng1 ca, 117, rNB: Rng1 ca, 118, rNoGap
    ReDim rPrio(0 To 4, 1 To NN)
    For k = 0 To 4
        v = ca.Range(ca.Cells(110 + k, 4), ca.Cells(110 + k, 3 + NN)).Value
        For j = 1 To NN: rPrio(k, j) = Val0(v(1, j)): Next
    Next
    ReDim okM(1 To NS, 1 To NN): ReDim xM(1 To NS, 1 To NN)
    v = ca.Range(ca.Cells(60, 4), ca.Cells(59 + NS, 3 + NN)).Value
    For i = 1 To NS: For j = 1 To NN: okM(i, j) = Val0(v(i, j)): Next: Next
    v = ca.Range(ca.Cells(10, 4), ca.Cells(9 + NS, 3 + NN)).Value
    For i = 1 To NS: For j = 1 To NN: xM(i, j) = Val0(v(i, j)): Next: Next
    ReDim sElig(1 To NS): ReDim sGap(1 To NS): ReDim sHope(1 To NS): ReDim sSibFlag(1 To NS)
    ReDim sNoGap(1 To NS): ReDim sSibT(1 To NS)
    ReDim sS(1 To NS, 1 To 3): ReDim sD(1 To NS, 1 To 3): ReDim sT(1 To NS, 1 To 3)
    ReDim sPre(1 To NS, 1 To 3): ReDim sPost(1 To NS, 1 To 3): ReDim sPref(1 To NS, 1 To 3)
    For i = 1 To NS
        p = 9 + i
        sElig(i) = Val0(ca.Range("C" & p).Value)
        sGap(i) = Val0(ca.Range("IQ" & p).Value)
        sHope(i) = Val0(ca.Range("IP" & p).Value)
        sSibFlag(i) = Val0(ca.Range("IW" & p).Value)
        sNoGap(i) = Val0(ca.Range("IX" & p).Value)
        sSibT(i) = Val0(ca.Range("JF" & p).Value)
        For k = 1 To 3
            sS(i, k) = Val0(ca.Cells(p, 209 + 3 * (k - 1)).Value)     ' HA HD HG
            sD(i, k) = Val0(ca.Cells(p, 210 + 3 * (k - 1)).Value)     ' HB HE HH
            sT(i, k) = Val0(ca.Cells(p, 211 + 3 * (k - 1)).Value)     ' HC HF HI
            sPre(i, k) = Val0(ca.Cells(p, 218 + 2 * (k - 1)).Value)   ' HJ HL HN
            sPost(i, k) = Val0(ca.Cells(p, 219 + 2 * (k - 1)).Value)  ' HK HM HO
            sPref(i, k) = Val0(ca.Cells(p, 263 + (k - 1)).Value)      ' JC JD JE
        Next
    Next
    nAM = Val0(ca.Range("A3").Value): nPM = Val0(ca.Range("A4").Value)
End Sub

Private Function RunPlan(ByVal spread As Boolean) As Long
    ' 入れられる枠が少ない子から1人ずつ決める（Ver.2.5 の式と同じ決め方）＋ 入れ替えでなおす
    Dim pr() As Boolean, fr() As Double, sf() As Double, na() As Double, ld() As Double, nx() As Double, xs() As Double
    Dim stp As Long, i As Long, j As Long, best As Double, bi As Long, bj As Long, sc As Double, x As Double
    Dim p1 As Double, p2 As Double, E As Long, F As Long, desp As Boolean, avail As Double, nxt As Double
    Dim gapOf() As Long, slotOf() As Long, rowOf() As Long, nfail As Long, fails() As Long
    ReDim pr(1 To NS): ReDim fr(1 To NN): ReDim sf(1 To NN): ReDim na(1 To NN): ReDim ld(1 To ND)
    ReDim nx(1 To NN): ReDim xs(1 To NN)
    ReDim outB(1 To NS): ReDim outC(1 To NS): ReDim outG(1 To NS)
    ReDim gapOf(1 To NS): ReDim slotOf(1 To NS): ReDim rowOf(1 To NS): ReDim fails(1 To NS)
    For i = 1 To NS: pr(i) = (sElig(i) <> 1): Next
    For j = 1 To NN
        fr(j) = 1 - rOcc0(j): na(j) = rNoGap(j)
        If rOcc(j) = 1 And rDay(j) >= 1 And rDay(j) <= ND Then ld(rDay(j)) = ld(rDay(j)) + 1
    Next
    For stp = 1 To NS
        For j = 1 To NN
            nx(j) = 1: xs(j) = 1
            If j < NN Then
                If rNext(j) = 1 Then nx(j) = fr(j + 1): xs(j) = fr(j + 1) + sf(j + 1)
            End If
        Next
        ' --- だれを決めるか ---
        best = BIGV: bi = 0
        For i = 1 To NS
            If Not pr(i) Then
                p1 = 0: p2 = 0
                For j = 1 To NN
                    If okM(i, j) = 1 Then
                        If sGap(i) = 2 Then
                            p1 = p1 + fr(j) * nx(j): p2 = p2 + (fr(j) + sf(j)) * xs(j)
                        Else
                            p1 = p1 + fr(j): p2 = p2 + fr(j) + sf(j)
                        End If
                    End If
                Next
                sc = IIf(sSibT(i) = 1, 0, 100000000#) + (p1 * 1000 + p2) * 100 + i
                If sc < best Then best = sc: bi = i
            End If
        Next
        If bi = 0 Then Exit For
        i = bi: pr(i) = True: E = sGap(i): F = sHope(i)
        outB(stp) = i: rowOf(i) = stp
        p1 = 0
        For j = 1 To NN
            If okM(i, j) = 1 Then
                If E = 2 Then
                    p1 = p1 + fr(j) * nx(j)
                Else
                    p1 = p1 + fr(j)
                End If
            End If
        Next
        desp = (p1 = 0)
        ' --- どの枠にするか ---
        best = BIGV: bj = 0
        For j = 1 To NN
            If desp Then
                avail = fr(j) + sf(j): nxt = xs(j)
            Else
                avail = fr(j): nxt = nx(j)
            End If
            If okM(i, j) * avail = 1 Then
                If Not (E = 2 And nxt = 0) Then
                    x = SlotScore(i, j, spread, fr, nx, na, ld)
                    If x < best Then best = x: bj = j
                End If
            End If
        Next
        outC(stp) = bj
        If bj = 0 Then
            nfail = nfail + 1: fails(nfail) = i
        Else
            slotOf(i) = bj
            If E > 0 And rNext(bj) = 1 And nx(bj) = 1 Then outG(stp) = bj + 1: gapOf(i) = bj + 1
            fr(bj) = 0: sf(bj) = 0
            If outG(stp) > 0 Then
                fr(outG(stp)) = 0
                If E = 1 Then sf(outG(stp)) = sf(outG(stp)) + 1
            End If
            If sNoGap(i) = 1 Then na(bj) = na(bj) + 1
            If rDay(bj) >= 1 And rDay(bj) <= ND Then ld(rDay(bj)) = ld(rDay(bj)) + 1
        End If
    Next
    If Not gNoRepair Then RepairPlan fr, sf, gapOf, slotOf, rowOf, fails, nfail
    RunPlan = nfail
End Function

Private Function SlotScore(ByVal i As Long, ByVal j As Long, ByVal spread As Boolean, fr() As Double, nx() As Double, na() As Double, ld() As Double) As Double
    Dim d As Long, t As Long, E As Long, F As Long, s As Double, adj As Double, w As Double, nb As Double
    d = (j - 1) \ NT + 1: t = ((j - 1) Mod NT) + 1: E = sGap(i): F = sHope(i)
    If sSibT(i) = 1 Then
        s = SibCost(i, j, d, t)
        If E = 1 And nx(j) = 0 Then s = s + 25
        SlotScore = s: Exit Function
    End If
    If spread And F = 0 Then
        adj = 0
        If t > 1 Then
            If rNext(j - 1) = 1 Then adj = adj + 1 - fr(j - 1)
        End If
        If t < NT Then
            If rNext(j) = 1 Then adj = adj + 1 - fr(j + 1)
        End If
        s = IIf(ld(d) < 20, ld(d), 20) * 400 + adj * 150 + t * 10 + d + rAvoid(j) * 100000
        If E = 1 And nx(j) = 0 Then s = s + 50000
    Else
        s = rPrio(F, j)
        If E = 1 And nx(j) = 0 Then s = s + 1000
    End If
    If sSibFlag(i) = 1 Then
        nb = 0
        If t > 1 Then
            If rNB(j - 1) = 1 Then nb = nb + xM(i, j - 1)
        End If
        If t < NT Then
            If rNB(j) = 1 Then nb = nb + xM(i, j + 1)
        End If
        s = s + nb * IIf(spread, 4000, 500)
    End If
    w = IIf(spread, 2000, 300)
    If t > 1 Then
        If rNB(j - 1) = 1 And na(j - 1) > 0 Then s = s - w
    End If
    If t < NT Then
        If sNoGap(i) = 1 And rNB(j) = 1 And fr(j + 1) = 0 Then s = s - w
    End If
    SlotScore = s
End Function

Private Function SibCost(ByVal i As Long, ByVal j As Long, ByVal d As Long, ByVal t As Long) As Double
    ' 兄弟の時間がある子：兄弟のすぐ前・すぐ後 → 同じ日の近い時間 → ほかの日
    Dim k As Long, c As Double, m As Double, nadj As Long
    m = 999999
    For k = 1 To 3
        If sS(i, k) > 0 Then
            If j = sS(i, k) Then SibCost = 200000 + rAvoid(j) * 50: Exit Function
            If d = sD(i, k) Then
                If j = sPre(i, k) Then
                    c = IIf(sPref(i, k) = 2, 30, 0)
                ElseIf j = sPost(i, k) Then
                    c = IIf(sPref(i, k) = 1, 30, 0)
                Else
                    c = Abs(t - sT(i, k)) * 100
                End If
            Else
                c = 100000 + Abs(d - sD(i, k)) * 1000 + t * 10
            End If
            If c < m Then m = c
        End If
        If j = sPre(i, k) Then nadj = nadj + 1
        If j = sPost(i, k) Then nadj = nadj + 1
    Next
    If nadj >= 2 Then m = m - 50
    SibCost = m + rAvoid(j) * 50
End Function

Private Function IsAdj(ByVal i As Long, ByVal j As Long) As Boolean
    Dim k As Long
    For k = 1 To 3
        If j > 0 And (j = sPre(i, k) Or j = sPost(i, k)) Then IsAdj = True
    Next
End Function

Private Sub RepairPlan(fr() As Double, sf() As Double, gapOf() As Long, slotOf() As Long, rowOf() As Long, fails() As Long, nfail As Long)
    ' 1) 入る枠がない子：入っている子（後ろを空けない・兄弟の時間なし）を別の空き枠へ動かして、その枠に入れる
    ' 2) 兄弟の前後に入らなかった子：兄弟のすぐ前・すぐ後の枠が空いていれば移す。ほかの子がいれば入れ替える
    Dim f As Long, u As Long, j As Long, j2 As Long, p As Long, done As Boolean, occ() As Long, i As Long, k As Long, tj As Long, cur As Long
    ReDim occ(1 To NN)
    For i = 1 To NS
        If slotOf(i) > 0 Then occ(slotOf(i)) = i
    Next
    f = 1
    Do While f <= nfail
        u = fails(f): done = False
        For j = 1 To NN                                        ' そのまま入れる枠（空けておいた枠も）
            If okM(u, j) = 1 And occ(j) = 0 And (fr(j) + sf(j)) >= 1 Then
                If NextOk(u, j, fr, sf) Then Place u, j, fr, sf, gapOf, slotOf, rowOf, occ: done = True: Exit For
            End If
        Next
        If Not done Then
            For j = 1 To NN                                    ' 1人動かして入れる
                p = occ(j)
                If p > 0 And okM(u, j) = 1 Then
                    If sSibT(p) = 0 And sGap(p) = 0 And NextOk(u, j, fr, sf) Then
                        For j2 = 1 To NN
                            If j2 <> j And okM(p, j2) = 1 And occ(j2) = 0 And (fr(j2) + sf(j2)) >= 1 Then
                                Unplace p, fr, sf, gapOf, slotOf, occ
                                Place p, j2, fr, sf, gapOf, slotOf, rowOf, occ
                                Place u, j, fr, sf, gapOf, slotOf, rowOf, occ
                                done = True: Exit For
                            End If
                        Next
                    End If
                End If
                If done Then Exit For
            Next
        End If
        If done Then
            For k = f To nfail - 1: fails(k) = fails(k + 1): Next
            nfail = nfail - 1
        Else
            f = f + 1
        End If
    Loop
    For i = 1 To NS                                            ' 2) 兄弟の前後
        cur = slotOf(i)
        If cur > 0 And sSibT(i) = 1 And rowOf(i) > 0 Then
            If Not IsAdj(i, cur) Then
                For k = 1 To 6
                    If k Mod 2 = 1 Then tj = sPre(i, (k + 1) \ 2) Else tj = sPost(i, k \ 2)
                    If tj > 0 Then
                        If okM(i, tj) = 1 Then
                            If occ(tj) = 0 And (fr(tj) + sf(tj)) >= 1 Then
                                Unplace i, fr, sf, gapOf, slotOf, occ
                                If NextOk(i, tj, fr, sf) Then
                                    Place i, tj, fr, sf, gapOf, slotOf, rowOf, occ: Exit For
                                Else
                                    Place i, cur, fr, sf, gapOf, slotOf, rowOf, occ
                                End If
                            ElseIf occ(tj) > 0 And sGap(i) = 0 Then
                                p = occ(tj)
                                If sSibT(p) = 0 And sGap(p) = 0 And okM(p, cur) = 1 And rowOf(p) > 0 Then
                                    Unplace i, fr, sf, gapOf, slotOf, occ
                                    Unplace p, fr, sf, gapOf, slotOf, occ
                                    Place p, cur, fr, sf, gapOf, slotOf, rowOf, occ
                                    Place i, tj, fr, sf, gapOf, slotOf, rowOf, occ
                                    Exit For
                                End If
                            End If
                        End If
                    End If
                Next
            End If
        End If
    Next
End Sub

Private Function NextOk(ByVal i As Long, ByVal j As Long, fr() As Double, sf() As Double) As Boolean
    ' 「必ず空けたい」の子は、すぐ後の枠が空いている（または空けておいた枠）ときだけ
    NextOk = True
    If sGap(i) = 2 And j < NN Then
        If rNext(j) = 1 And fr(j + 1) + sf(j + 1) < 1 Then NextOk = False
    End If
End Function

Private Sub Place(ByVal i As Long, ByVal j As Long, fr() As Double, sf() As Double, gapOf() As Long, slotOf() As Long, rowOf() As Long, occ() As Long)
    fr(j) = 0: sf(j) = 0: occ(j) = i: slotOf(i) = j: gapOf(i) = 0
    If sGap(i) > 0 And j < NN Then
        If rNext(j) = 1 And occ(j + 1) = 0 And fr(j + 1) + sf(j + 1) >= 1 Then
            gapOf(i) = j + 1: fr(j + 1) = 0
            If sGap(i) = 1 Then sf(j + 1) = 1 Else sf(j + 1) = 0
        End If
    End If
    If rowOf(i) > 0 Then outC(rowOf(i)) = j: outG(rowOf(i)) = gapOf(i)
End Sub

Private Sub Unplace(ByVal i As Long, fr() As Double, sf() As Double, gapOf() As Long, slotOf() As Long, occ() As Long)
    Dim j As Long
    j = slotOf(i)
    If j > 0 Then occ(j) = 0: fr(j) = 1: sf(j) = 0
    If gapOf(i) > 0 Then fr(gapOf(i)) = 1: sf(gapOf(i)) = 0: gapOf(i) = 0
    slotOf(i) = 0
End Sub

Private Sub WritePlan(ByVal ws As Worksheet)
    Dim v() As Variant, k As Long
    ReDim v(1 To NS, 1 To 7)
    For k = 1 To NS
        v(k, 1) = k: v(k, 2) = outB(k): v(k, 3) = outC(k)
        If outC(k) > 0 Then v(k, 4) = rAvoid(outC(k)) Else v(k, 4) = 0
        v(k, 5) = 0: v(k, 6) = 0: v(k, 7) = outG(k)
    Next
    mBusy = True
    ws.Range("A3").Resize(NS, 7).Value = v
    mBusy = False
End Sub

Private Sub CopyPlan(ByVal sh As String)
    Dim src As Worksheet, dst As Worksheet, st As Long, msg As String
    Set src = Me.Worksheets(sh): Set dst = Me.Worksheets("調整・決定")
    st = Val0(Me.Worksheets("calcA").Range("A6").Value)
    If st = 0 Then MsgBox "まだ自動案を作っていません。先に［自動案を作る］を押してください。", vbExclamation: Exit Sub
    msg = sh & "を「調整・決定」の表に写します。" & vbLf & "いま「調整・決定」に入っている名前は、そのまま残ります（自動案にも入っています）。"
    If st = 2 Then msg = msg & vbLf & vbLf & "※ 自動案を作ったあとに、×・名簿・設定・調整・決定が変わっています。先に［自動案を作る］を押すのがおすすめです。"
    If MsgBox(msg & vbLf & vbLf & "写しますか？", vbYesNo + vbQuestion) <> vbYes Then Exit Sub
    PushHistory
    mBusy = True
    SetBlock dst.Range("C6:H29"), src.Range("C6:H29").Value
    If st = 1 Then                                  ' 写した表は自動案と同じなので、「変わった」とは知らせない
        Application.Calculate
        Me.Worksheets("calcB").Range("C1").Value = Me.Worksheets("calcA").Range("A7").Value
    End If
    mBusy = False
    SaveShadow
    Application.Goto dst.Range("A1"), True
End Sub

' =====================================================================
'  調整・決定：入れ替え・ひとつ前に戻す
' =====================================================================
Private Sub SwapPick(ByVal ws As Worksheet, ByVal Target As Range, Cancel As Boolean)
    Dim ca As Worksheet, a As String, first As Range, tmp As Variant
    If Target.Cells.Count <> 1 Then Exit Sub
    If Intersect(Target, ws.Range("C6:H29")) Is Nothing Then Exit Sub
    Cancel = True
    Set ca = Me.Worksheets("calcA")
    a = CStr(ca.Range("A5").Value)
    mBusy = True
    If a = "" Then
        If CStr(Target.Value) <> "" Then ca.Range("A5").Value = Target.Address: ca.Range("B5").Value = Target.Value
    ElseIf a = Target.Address Then
        ca.Range("A5:B5").ClearContents                       ' 同じマスをもう一度 → やめる
    Else
        mBusy = False
        PushHistory
        mBusy = True
        Set first = ws.Range(a)
        tmp = first.Value
        SetCell first, Target.Value
        SetCell Target, tmp
        ca.Range("A5:B5").ClearContents
    End If
    mBusy = False
    SaveShadow
End Sub

Private Sub SetCell(ByVal c As Range, ByVal v As Variant)
    ' 空なら消す（空を代入しても消えないことがあるため）
    If IsEmpty(v) Then
        c.ClearContents
    ElseIf CStr(v) = "" Then
        c.ClearContents
    Else
        c.Value = v
    End If
End Sub

Private Sub SetBlock(ByVal dst As Range, ByVal v As Variant)
    ' 表をまとめて写す：先に消してから、空でないマスだけ入れる
    Dim r As Long, c As Long
    dst.ClearContents
    For r = 1 To dst.Rows.Count
        For c = 1 To dst.Columns.Count
            If Not IsEmpty(v(r, c)) Then
                If CStr(v(r, c)) <> "" Then dst.Cells(r, c).Value = v(r, c)
            End If
        Next
    Next
End Sub

Private Sub SaveShadow()
    ' いまの「調整・決定」の表を、変更前の形としてとっておく
    Dim ca As Worksheet
    Set ca = Me.Worksheets("calcA")
    mBusy = True
    SetBlock ca.Range("D300:I323"), Me.Worksheets("調整・決定").Range("C6:H29").Value
    mBusy = False
End Sub

Private Sub PushHistoryFromShadow()
    PushArray Me.Worksheets("calcA").Range("D300:I323").Value
End Sub

Private Sub PushHistory()
    PushArray Me.Worksheets("調整・決定").Range("C6:H29").Value
End Sub

Private Sub PushArray(ByVal v As Variant)
    Dim ca As Worksheet, n As Long, k As Long
    Set ca = Me.Worksheets("calcA")
    n = Val0(ca.Range("A299").Value)
    mBusy = True
    If n >= HIST Then
        For k = 1 To HIST - 1                                  ' いちばん古いものをすてる
            SetBlock ca.Range("D" & (330 + (k - 1) * 25)).Resize(24, 6), ca.Range("D" & (330 + k * 25)).Resize(24, 6).Value
        Next
        n = HIST - 1
    End If
    SetBlock ca.Range("D" & (330 + n * 25)).Resize(24, 6), v
    ca.Range("A299").Value = n + 1
    mBusy = False
End Sub

Private Sub UndoGrid()
    Dim ca As Worksheet, n As Long
    Set ca = Me.Worksheets("calcA")
    n = Val0(ca.Range("A299").Value)
    If n <= 0 Then MsgBox "戻せる操作がありません。", vbInformation: Exit Sub
    mBusy = True
    SetBlock Me.Worksheets("調整・決定").Range("C6:H29"), ca.Range("D" & (330 + (n - 1) * 25)).Resize(24, 6).Value
    ca.Range("D" & (330 + (n - 1) * 25)).Resize(24, 6).ClearContents
    ca.Range("A299").Value = n - 1
    ca.Range("A5:B5").ClearContents
    mBusy = False
    SaveShadow
End Sub

' =====================================================================
'  印刷・PDF
' =====================================================================
Private Function LetterSheet() As String
    ' 1日の枠が13以上なら夏の形、12以下なら秋の形
    If Val0(Me.Worksheets("設定").Range("B6").Value) >= 13 Then LetterSheet = "お手紙（夏）" Else LetterSheet = "お手紙（秋）"
End Function

Private Sub Preview(ByVal sh As String)
    AdjustRows
    Me.Worksheets(sh).PrintPreview
End Sub

Private Sub SavePDF(ByVal sh As String)
    Dim f As String, gr As String, ttl As String, p As Long
    If Me.Path = "" Then MsgBox "先にこのファイルを保存してください（PDFは、このファイルと同じ場所に保存します）。", vbExclamation: Exit Sub
    AdjustRows
    gr = CStr(Me.Worksheets("お手紙（秋）").Range("C5").Value)       ' 例：6年1組　保護者様
    p = InStr(gr, "　")
    If p > 0 Then gr = Left(gr, p - 1)
    If sh = "兄弟確認用" Then
        ttl = gr & "_面談日程（兄弟確認用）"
    Else
        ttl = gr & "_" & CStr(Me.Worksheets(sh).Range(IIf(sh = "お手紙（夏）", "B8", "C8")).Value)
    End If
    ttl = Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(Replace(ttl, "\", ""), "/", ""), ":", ""), "*", ""), "?", ""), """", ""), "<", ""), ">", ""), "|", "")
    f = Me.Path & Application.PathSeparator & ttl & ".pdf"
    Me.Worksheets(sh).ExportAsFixedFormat Type:=xlTypePDF, Filename:=f, IgnorePrintAreas:=False, OpenAfterPublish:=True
    MsgBox "PDFを保存しました：" & vbLf & f, vbInformation
End Sub
