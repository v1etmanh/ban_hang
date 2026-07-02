# -*- coding: utf-8 -*-
"""
Convert dialog.txt (cay hoi thoai dang tab-indent, kieu Twine/ink) thanh
cac file JSON rieng cho tung NPC trong src/game/dialogs/npc/<characterId>.json

Quy uoc da thong nhat voi nguoi dung:
- Bo qua hoan toan 2 nhan vat "ban_mau" / "nu_mau" (khong co trong characters.js).
- "lebon" trong dialog.txt tuong ung NPC id "le_bon_1".
- La (leaf) loai "thanh cong" (ten section ket thuc bang "success") -> outcome
  "buy", weightKg con thieu se duoc RANDOM tu weightOptions cua dung loai
  trai cay (fruitData.js), random rieng cho MOI lan cay do duoc dung trong
  MOI cay hoi thoai (fruit tree) khac nhau.
- Cac la "fail_*" (fail_nhe, fail_noi_xao, fail_ca_khia, va vai bien the rieng
  cua tung NPC nhu fail_mac_ca, fail_noi_qua, fail_ban_re...) -> outcome
  "no_buy", khong co weightKg.
"""
import re
import os
import json
import random

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIALOG_TXT = os.path.join(BASE_DIR, 'dialog.txt')
OUT_DIR = os.path.join(BASE_DIR, 'src', 'game', 'dialogs', 'npc')

# Phai khop dung voi src/game/fruitData.js (FRUITS[...].weightOptions)
FRUIT_WEIGHTS = {
    'man':   [0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22],
    'oi':    [0.14, 0.17, 0.20, 0.23, 0.26, 0.29, 0.32, 0.35],
    'xoai':  [0.22, 0.26, 0.30, 0.34, 0.38, 0.42, 0.46, 0.50],
    'khoai': [0.16, 0.19, 0.22, 0.25, 0.28, 0.31, 0.34, 0.37],
}

# prefix trong dialog.txt -> characterId trong src/game/characters.js
NPC_PREFIX_TO_CHARACTER = {
    'fan_cr_7': 'fan_cr_7',
    'fan_m_10': 'fan_m_10',
    'baco_khotinh': 'ba_co_kho_tinh',
    'grab': 'grab',
    'phuho': 'phu_ho',
    'lebon': 'le_bon_1',
    'batu': 'ba_tu',
    # 'ban_mau' va 'nu_mau' CHU Y: bo qua theo yeu cau nguoi dung
}
FRUIT_SUFFIXES = ['man', 'xoai', 'khoai', 'oi']


def strip_speaker(line):
    """Bo prefix 'Ten Nhan Vat: ' o dau dong, giu lai phan loi thoai."""
    return re.sub(r'^[^:]+:\s*', '', line, count=1).strip()


def count_indent(line):
    """Dem so 'tab logic' o dau dong. Uu tien dem ky tu tab that; neu dong
    dung space thi coi 4 space = 1 tab (phong khi file bi mix tab/space)."""
    i = 0
    tabs = 0
    while i < len(line):
        if line[i] == '\t':
            tabs += 1
            i += 1
        elif line[i:i + 4] == '    ':
            tabs += 1
            i += 4
        else:
            break
    return tabs, line[i:]


def classify(line):
    """Phan loai 1 dong thanh 1 trong 3 loai token: option / jump / text.
    Dong trong (chi whitespace) tra ve None de bi loai bo truoc khi parse."""
    if line.strip() == '':
        return None
    depth, rest = count_indent(line)
    rest = rest.rstrip()
    if rest.startswith('- '):
        return ('option', depth, rest[2:].strip())
    if rest.startswith('=>'):
        return ('jump', depth, rest[2:].strip())
    return ('text', depth, rest.strip())


def split_sections(raw_text):
    """Tach dialog.txt thanh dict: ten_section -> list token (option/jump/text),
    dua vao cac dong header '~ ten_section'."""
    sections = {}
    current_name = None
    current_lines = []
    header_re = re.compile(r'^~\s+(\S+)\s*$')
    for line in raw_text.split('\n'):
        m = header_re.match(line)
        if m:
            if current_name is not None:
                sections[current_name] = current_lines
            current_name = m.group(1)
            current_lines = []
        else:
            if current_name is not None:
                current_lines.append(line)
    if current_name is not None:
        sections[current_name] = current_lines
    # convert moi section tu list-dong-tho -> list-token (bo dong trong)
    tokenized = {}
    for name, lines in sections.items():
        toks = [classify(l) for l in lines]
        tokenized[name] = [t for t in toks if t is not None]
    return tokenized


class TokenCursor:
    """Con tro doc tuan tu qua list token cua 1 section, dung chung cho
    de-quy parse_block (khong dung generator vi can peek nhieu lan)."""
    def __init__(self, tokens):
        self.tokens = tokens
        self.i = 0

    def peek(self):
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def advance(self):
        tok = self.tokens[self.i]
        self.i += 1
        return tok


class BuildCtx:
    """Trang thai dung chung cho 1 lan build 1 cay hoi thoai (1 fruit_id
    cua 1 NPC): danh sach node da tao (nodes), bo dem (memo) cac la da
    resolve theo ten section - memo nay CHI song trong pham vi 1 cay (moi
    cay goi build_fruit_tree() rieng se co BuildCtx rieng), de moi cay
    (moi loai trai cay) duoc random weightKg rieng, khong dung chung giua
    cac loai trai cay khac nhau du cung 1 ten section la (vd '..._success'
    dung chung cho ca cay 'man' lan cay 'xoai' cua cung 1 NPC)."""
    def __init__(self):
        self.nodes = {}
        self.counter = 1
        self.memo = {}

    def new_id(self):
        nid = 'n%d' % self.counter
        self.counter += 1
        return nid


def resolve_leaf_section(sections, name, fruit_id, ctx):
    """Moi dich '=> ten_section' trong cac cay goc (fruit-root) trong
    dialog.txt LUON tro toi 1 section-la don gian: chi gom vai dong text
    (co the nhieu dong cung 1 nguoi noi, noi tiep nhau) roi ket bang
    '=> END'. Ham nay parse dung dang do va tra ve node_id (memo hoa theo
    ten section, trong pham vi 1 BuildCtx / 1 cay hoi thoai)."""
    if name in ctx.memo:
        return ctx.memo[name]
    tokens = sections.get(name)
    if tokens is None:
        # Phong ho: neu dialog.txt thieu section duoc tro toi, tao 1 la
        # 'no_buy' voi text canh bao de de phat hien khi review JSON,
        # thay vi lam crash toan bo qua trinh convert.
        node_id = ctx.new_id()
        ctx.nodes[node_id] = {
            'leaf': True, 'outcome': 'no_buy', 'speaker': 'npc',
            'text': '[MISSING SECTION: %s]' % name,
        }
        ctx.memo[name] = node_id
        return node_id

    texts = []
    i = 0
    while i < len(tokens) and tokens[i][0] == 'text' and tokens[i][1] == 0:
        texts.append(strip_speaker(tokens[i][2]))
        i += 1
    text = ' '.join(texts)

    is_success = name.endswith('success')
    outcome = 'buy' if is_success else 'no_buy'
    node = {'leaf': True, 'outcome': outcome, 'speaker': 'npc', 'text': text}
    if outcome == 'buy':
        weight_choices = FRUIT_WEIGHTS[fruit_id]
        node['weightKg'] = round(random.choice(weight_choices), 2)

    node_id = ctx.new_id()
    ctx.nodes[node_id] = node
    ctx.memo[name] = node_id
    return node_id


def parse_block(sections, cursor, depth, ctx, fruit_id):
    """De quy 1 'khoi' trong cay hoi thoai tai do sau 'depth':
    1) gom cac dong text lien tiep cung depth (loi NPC noi, co the nhieu
       dong do 1 nguoi noi lien tuc nhieu cau) thanh 1 chuoi 'text'
    2) sau do hoac la 1 danh sach option (dong '- ...' cung depth, moi
       option de quy tiep vao khoi con o depth+1), hoac la 1 dong nhay
       '=> ten_section' (dan toi 1 la, xem resolve_leaf_section)
    Tra ve node_id cua node vua tao/resolve cho khoi nay."""
    texts = []
    while True:
        tok = cursor.peek()
        if tok and tok[0] == 'text' and tok[1] == depth:
            texts.append(strip_speaker(tok[2]))
            cursor.advance()
        else:
            break
    text = ' '.join(texts)

    tok = cursor.peek()
    if tok and tok[0] == 'option' and tok[1] == depth:
        options = []
        while True:
            tok = cursor.peek()
            if tok and tok[0] == 'option' and tok[1] == depth:
                label = tok[2]
                cursor.advance()
                child_id = parse_block(sections, cursor, depth + 1, ctx, fruit_id)
                options.append({'label': label, 'next': child_id})
            else:
                break
        node_id = ctx.new_id()
        ctx.nodes[node_id] = {'speaker': 'npc', 'text': text, 'options': options}
        return node_id
    elif tok and tok[0] == 'jump' and tok[1] == depth:
        target = tok[2]
        cursor.advance()
        return resolve_leaf_section(sections, target, fruit_id, ctx)
    else:
        # Khong con option, khong co jump: truong hop khong mong doi trong
        # du lieu hien tai, nhung phong ho de khong crash - coi day la 1
        # la 'no_buy' luon voi text da gom duoc.
        node_id = ctx.new_id()
        ctx.nodes[node_id] = {'leaf': True, 'outcome': 'no_buy', 'speaker': 'npc', 'text': text}
        return node_id


def build_fruit_tree(sections, section_name, fruit_id):
    """Build 1 cay hoi thoai hoan chinh (dang {rootId, nodes}) cho 1 section
    goc kieu '<npc>_<fruit>' (vd 'baco_khotinh_man')."""
    tokens = sections[section_name]
    cursor = TokenCursor(tokens)
    ctx = BuildCtx()
    root_node_id = parse_block(sections, cursor, 0, ctx, fruit_id)
    # Doi id cua node goc thanh literal 'root' cho de doc / khop quy uoc
    # cua cac file JSON cu (man.json/oi.json/...) - node goc khong bao gio
    # bi 'next' tro toi tu node khac nen doi ten an toan.
    if root_node_id != 'root':
        ctx.nodes['root'] = ctx.nodes.pop(root_node_id)
    return {'rootId': 'root', 'nodes': ctx.nodes}


def main():
    random.seed()  # random thuc su moi lan chay, khong co nhu cau reproducible
    with open(DIALOG_TXT, 'r', encoding='utf-8') as f:
        raw_text = f.read()
    sections = split_sections(raw_text)

    os.makedirs(OUT_DIR, exist_ok=True)
    summary = []

    for prefix, character_id in NPC_PREFIX_TO_CHARACTER.items():
        fruits_out = {}
        for fruit_id in FRUIT_SUFFIXES:
            section_name = '%s_%s' % (prefix, fruit_id)
            if section_name not in sections:
                continue
            fruits_out[fruit_id] = build_fruit_tree(sections, section_name, fruit_id)

        if not fruits_out:
            summary.append('[SKIP] %s (prefix=%s): khong tim thay section fruit nao' % (character_id, prefix))
            continue

        out_obj = {'characterId': character_id, 'fruits': fruits_out}
        out_path = os.path.join(OUT_DIR, '%s.json' % character_id)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(out_obj, f, ensure_ascii=False, indent=2)

        node_counts = {fid: len(tree['nodes']) for fid, tree in fruits_out.items()}
        summary.append('[OK] %s -> %s | fruits=%s | node_counts=%s' % (
            character_id, out_path, list(fruits_out.keys()), node_counts))

    print('\n'.join(summary))
    print('\nDA XONG. Tong so file NPC tao ra: %d' % len(
        [s for s in summary if s.startswith('[OK]')]))


if __name__ == '__main__':
    main()
