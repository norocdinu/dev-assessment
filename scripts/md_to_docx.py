"""Convert USER_GUIDE.md to USER_GUIDE.docx with sensible Word formatting.

Handles the subset of Markdown actually used in the guide: ATX headings,
ordered/unordered lists, pipe tables, fenced code blocks, blockquotes,
horizontal rules, and inline **bold** / `code` / [text](url).
"""
import os
import re
import struct
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

SRC = sys.argv[1] if len(sys.argv) > 1 else "USER_GUIDE.md"
DST = sys.argv[2] if len(sys.argv) > 2 else "USER_GUIDE.docx"
BASE_DIR = os.path.dirname(os.path.abspath(SRC))

# Page fit (Letter, 1" margins → ~6.5" usable; keep a little slack)
MAX_IMG_W = 6.0
MAX_IMG_H = 7.5

MONO = "Consolas"
BODY = "Calibri"

doc = Document()

# Base style
normal = doc.styles["Normal"]
normal.font.name = BODY
normal.font.size = Pt(11)

INLINE_RE = re.compile(r"(\*\*.+?\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
IMAGE_RE = re.compile(r"^!\[[^\]]*\]\(([^)]+)\)\s*$")


def png_size(path):
    """Return (width, height) in pixels for a PNG by reading its IHDR — no PIL."""
    try:
        with open(path, "rb") as f:
            head = f.read(24)
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", head[16:24])
    except OSError:
        pass
    return None


def add_image(path):
    """Insert an image, scaled to fit the page, centred."""
    full = path if os.path.isabs(path) else os.path.join(BASE_DIR, path)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if not os.path.exists(full):
        p.add_run(f"[missing image: {path}]").italic = True
        return
    size = png_size(full)
    run = p.add_run()
    if size and size[1]:
        aspect = size[0] / size[1]
        if MAX_IMG_W / aspect > MAX_IMG_H:   # too tall at full width → cap height
            run.add_picture(full, height=Inches(MAX_IMG_H))
        else:
            run.add_picture(full, width=Inches(MAX_IMG_W))
    else:
        run.add_picture(full, width=Inches(MAX_IMG_W))


def add_inline(paragraph, text):
    """Add text to a paragraph, honouring **bold**, *italic*, `code`, and [links]."""
    for part in INLINE_RE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            r = paragraph.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r = paragraph.add_run(part[1:-1])
            r.italic = True
        elif part.startswith("`") and part.endswith("`"):
            r = paragraph.add_run(part[1:-1])
            r.font.name = MONO
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(0xB0, 0x30, 0x60)
        else:
            m = LINK_RE.fullmatch(part)
            if m:
                paragraph.add_run(m.group(1))  # render link label only
            else:
                paragraph.add_run(part)


def add_code_block(lines):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run("\n".join(lines))
    run.font.name = MONO
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x20, 0x20, 0x20)


def add_table(rows):
    # rows: list of list[str]; first row is header
    cols = max(len(r) for r in rows)
    t = doc.add_table(rows=0, cols=cols)
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    for ri, row in enumerate(rows):
        cells = t.add_row().cells
        for ci in range(cols):
            txt = row[ci] if ci < len(row) else ""
            cell = cells[ci]
            cell.text = ""
            p = cell.paragraphs[0]
            add_inline(p, txt)
            if ri == 0:
                for run in p.runs:
                    run.bold = True
    doc.add_paragraph()


def split_table_row(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


with open(SRC, encoding="utf-8") as f:
    lines = f.readlines()

i = 0
n = len(lines)
list_counter = 0
while i < n:
    raw = lines[i].rstrip("\n")
    stripped = raw.strip()

    # Fenced code block
    if stripped.startswith("```"):
        block = []
        i += 1
        while i < n and not lines[i].strip().startswith("```"):
            block.append(lines[i].rstrip("\n"))
            i += 1
        i += 1  # skip closing fence
        add_code_block(block)
        continue

    # Standalone image line: ![alt](path)
    mi = IMAGE_RE.match(stripped)
    if mi:
        add_image(mi.group(1))
        i += 1
        continue

    # Table: current line has a pipe and next line is a separator row
    if "|" in raw and i + 1 < n and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]+$", lines[i + 1]):
        rows = [split_table_row(raw)]
        i += 2  # skip header + separator
        while i < n and "|" in lines[i] and lines[i].strip():
            rows.append(split_table_row(lines[i].rstrip("\n")))
            i += 1
        add_table(rows)
        continue

    # Horizontal rule
    if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", stripped):
        doc.add_paragraph().add_run("—" * 30).font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
        i += 1
        continue

    # Headings
    m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
    if m:
        level = len(m.group(1))
        text = re.sub(r"\s*#+\s*$", "", m.group(2))
        # strip inline anchors/formatting markers for heading text
        h = doc.add_heading(level=min(level, 4))
        h.text = ""
        add_inline(h, text)
        i += 1
        continue

    # Blockquote
    if stripped.startswith(">"):
        quote_lines = []
        while i < n and lines[i].strip().startswith(">"):
            quote_lines.append(re.sub(r"^\s*>\s?", "", lines[i].rstrip("\n")))
            i += 1
        text = " ".join(q for q in quote_lines if q.strip())
        p = doc.add_paragraph(style="Intense Quote")
        add_inline(p, text)
        continue

    # Ordered list item
    mo = re.match(r"^(\d+)\.\s+(.*)$", stripped)
    if mo:
        p = doc.add_paragraph(style="List Number")
        add_inline(p, mo.group(2))
        i += 1
        continue

    # Unordered list item (- or *)
    mu = re.match(r"^[-*]\s+(.*)$", stripped)
    if mu:
        p = doc.add_paragraph(style="List Bullet")
        add_inline(p, mu.group(1))
        i += 1
        continue

    # Blank line
    if not stripped:
        i += 1
        continue

    # Normal paragraph (gather wrapped continuation lines)
    para = [raw]
    i += 1
    while i < n and lines[i].strip() and not re.match(
        r"^\s*(#{1,6}\s|[-*]\s|\d+\.\s|>|```|\|)", lines[i]
    ) and not re.fullmatch(r"-{3,}", lines[i].strip()):
        para.append(lines[i].rstrip("\n"))
        i += 1
    p = doc.add_paragraph()
    add_inline(p, " ".join(s.strip() for s in para))

doc.save(DST)
print(f"Wrote {DST}")
