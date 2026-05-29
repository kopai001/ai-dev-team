#!/usr/bin/env python3
"""
build_index.py — สร้าง INDEX.md ของโค้ดเบส เพื่อ optimize การทำงานของทีม AI

ทำไมต้องมี:
  แทนที่ทุก agent จะสแกน/อ่านไฟล์ทั้ง repo (เปลือง token + ช้า)
  ให้ทุก agent อ่าน INDEX.md ก้อนเดียวก่อน แล้วเปิดเฉพาะไฟล์ที่เกี่ยวข้อง

วิธีใช้:
  python scripts/build_index.py [root_dir]
  (ค่าเริ่มต้น root_dir = โฟลเดอร์ปัจจุบัน)

สิ่งที่ได้:
  INDEX.md ที่มี: โครงสร้างโฟลเดอร์, สรุปแต่ละไฟล์ (ภาษา, ขนาด,
  symbol สำคัญเช่น function/class), และ entry point ที่เดาได้
"""

import os
import re
import sys
import json
from pathlib import Path
from datetime import datetime

# ---- การตั้งค่า ----------------------------------------------------------
IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist",
    "build", ".next", ".cache", "coverage", ".idea", ".vscode",
    "team-member",  # ไฟล์ agent ไม่นับเป็นโค้ดเบส
}
IGNORE_FILES = {"INDEX.md", "package-lock.json", "yarn.lock", "poetry.lock"}

# นามสกุล → ภาษา
LANG = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript (React)",
    ".ts": "TypeScript", ".tsx": "TypeScript (React)", ".go": "Go",
    ".rs": "Rust", ".java": "Java", ".rb": "Ruby", ".php": "PHP",
    ".c": "C", ".cpp": "C++", ".cs": "C#", ".kt": "Kotlin",
    ".swift": "Swift", ".sql": "SQL", ".sh": "Shell",
    ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".vue": "Vue", ".md": "Markdown", ".yml": "YAML", ".yaml": "YAML",
    ".json": "JSON",
}

# regex จับ symbol สำคัญต่อภาษา (เบาๆ พอให้เห็นภาพ ไม่ใช่ parser เต็ม)
SYMBOL_PATTERNS = {
    "Python": [
        (re.compile(r"^\s*class\s+(\w+)", re.M), "class"),
        (re.compile(r"^\s*def\s+(\w+)", re.M), "def"),
    ],
    "JavaScript": [
        (re.compile(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)", re.M), "fn"),
        (re.compile(r"(?:export\s+)?class\s+(\w+)", re.M), "class"),
        (re.compile(r"(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(", re.M), "fn"),
    ],
}
# ภาษาที่ใช้ pattern ร่วมกัน
SYMBOL_PATTERNS["TypeScript"] = SYMBOL_PATTERNS["JavaScript"]
SYMBOL_PATTERNS["TypeScript (React)"] = SYMBOL_PATTERNS["JavaScript"]
SYMBOL_PATTERNS["JavaScript (React)"] = SYMBOL_PATTERNS["JavaScript"]

ENTRY_HINTS = {
    "main.py", "app.py", "manage.py", "__main__.py", "index.js",
    "index.ts", "main.js", "main.ts", "server.js", "app.js",
    "main.go", "main.rs", "Main.java",
}
MAX_SYMBOLS = 12  # จำกัด symbol ต่อไฟล์ ไม่ให้ index บวม


def lang_of(path: Path) -> str:
    return LANG.get(path.suffix.lower(), "")


def extract_symbols(text: str, lang: str):
    out = []
    for pat, kind in SYMBOL_PATTERNS.get(lang, []):
        for m in pat.finditer(text):
            out.append(f"{kind} {m.group(1)}")
            if len(out) >= MAX_SYMBOLS:
                return out
    return out


def first_doc_line(text: str, lang: str) -> str:
    """ดึงคำอธิบายบรรทัดแรก (docstring / comment บนสุด) ถ้ามี"""
    for line in text.splitlines()[:15]:
        s = line.strip()
        if lang == "Python" and (s.startswith('"""') or s.startswith("'''")):
            return s.strip('"\' ')[:100]
        if s.startswith("//") or s.startswith("#") or s.startswith("*"):
            cleaned = s.lstrip("/#* ").strip()
            if cleaned:
                return cleaned[:100]
    return ""


def scan(root: Path):
    files = []
    entry_points = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS and not d.startswith(".")]
        for fn in sorted(filenames):
            if fn in IGNORE_FILES or fn.startswith("."):
                continue
            fp = Path(dirpath) / fn
            rel = fp.relative_to(root)
            lang = lang_of(fp)
            try:
                size = fp.stat().st_size
            except OSError:
                continue
            info = {"path": str(rel), "lang": lang, "size": size,
                    "symbols": [], "doc": ""}
            # อ่านเฉพาะไฟล์ text ที่รู้จักและไม่ใหญ่เกิน
            if lang and lang not in ("JSON",) and size < 500_000:
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                    info["symbols"] = extract_symbols(text, lang)
                    info["doc"] = first_doc_line(text, lang)
                except OSError:
                    pass
            files.append(info)
            if fn in ENTRY_HINTS:
                entry_points.append(str(rel))
    return files, entry_points


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.0f}GB"


def build_tree(files):
    """สร้าง tree แบบ text จาก list ของ path"""
    tree = {}
    for f in files:
        parts = Path(f["path"]).parts
        node = tree
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node.setdefault("__files__", []).append(parts[-1])

    lines = []

    def walk(node, prefix=""):
        dirs = sorted(k for k in node if k != "__files__")
        for d in dirs:
            lines.append(f"{prefix}{d}/")
            walk(node[d], prefix + "  ")
        for fn in sorted(node.get("__files__", [])):
            lines.append(f"{prefix}{fn}")

    walk(tree)
    return "\n".join(lines)


def render(files, entry_points, root: Path) -> str:
    by_lang = {}
    for f in files:
        if f["lang"]:
            by_lang[f["lang"]] = by_lang.get(f["lang"], 0) + 1

    out = []
    out.append("# INDEX.md — แผนที่โค้ดเบส (สร้างอัตโนมัติ)")
    out.append("")
    out.append(f"> สร้างเมื่อ: {datetime.now().strftime('%Y-%m-%d %H:%M')} | "
               f"ไฟล์ทั้งหมด: {len(files)}")
    out.append("> ⚠️ ไฟล์นี้สร้างโดย scripts/build_index.py — อย่าแก้ด้วยมือ "
               "ให้รันสคริปต์ใหม่")
    out.append("")

    out.append("## ภาพรวมภาษา")
    for lang, n in sorted(by_lang.items(), key=lambda x: -x[1]):
        out.append(f"- {lang}: {n} ไฟล์")
    out.append("")

    if entry_points:
        out.append("## จุดเริ่มต้น (Entry Points)")
        for ep in entry_points:
            out.append(f"- `{ep}`")
        out.append("")

    out.append("## โครงสร้างโฟลเดอร์")
    out.append("```")
    out.append(build_tree(files))
    out.append("```")
    out.append("")

    out.append("## รายละเอียดไฟล์")
    out.append("")
    # จัดกลุ่มตามโฟลเดอร์
    current_dir = None
    for f in sorted(files, key=lambda x: x["path"]):
        d = str(Path(f["path"]).parent)
        if d != current_dir:
            current_dir = d
            label = "(root)" if d == "." else d
            out.append(f"### {label}/")
        name = Path(f["path"]).name
        meta = []
        if f["lang"]:
            meta.append(f["lang"])
        meta.append(human_size(f["size"]))
        line = f"- **{name}** ({', '.join(meta)})"
        if f["doc"]:
            line += f" — {f['doc']}"
        out.append(line)
        if f["symbols"]:
            shown = ", ".join(f["symbols"])
            out.append(f"  - `{shown}`")
    out.append("")
    return "\n".join(out)


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.is_dir():
        print(f"ไม่พบโฟลเดอร์: {root}", file=sys.stderr)
        sys.exit(1)
    files, entry_points = scan(root)
    content = render(files, entry_points, root)
    out_path = root / "INDEX.md"
    out_path.write_text(content, encoding="utf-8")
    print(f"✅ สร้าง {out_path} แล้ว ({len(files)} ไฟล์)")
    # เขียน json คู่ไว้ให้เครื่องมืออื่นใช้ต่อ (optional)
    (root / ".index.json").write_text(
        json.dumps({"files": files, "entry_points": entry_points},
                   ensure_ascii=False, indent=2),
        encoding="utf-8")


if __name__ == "__main__":
    main()
