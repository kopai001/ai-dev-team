# INDEX.md — แผนที่โค้ดเบส (สร้างอัตโนมัติ)

> สร้างเมื่อ: 2026-06-25 14:59 | ไฟล์ทั้งหมด: 13
> ⚠️ ไฟล์นี้สร้างโดย scripts/build_index.py — อย่าแก้ด้วยมือ ให้รันสคริปต์ใหม่

## ภาพรวมภาษา
- Markdown: 12 ไฟล์
- Python: 1 ไฟล์

## โครงสร้างโฟลเดอร์
```
knowledge-base/
  output/
    domain-เงินเดือน.md
    flow-เงินเดือน.md
    system-design-เงินเดือน.md
    system-requirement-เงินเดือน.md
  requirement/
    CLRS_Dev_Spec.md
  working-file/
    Employee_Requirement.md
    domain - กะการทำงาน.md
    domain - การลา.md
    flow - กะการทำงาน.md
    flow - การลา.md
scripts/
  build_index.py
CLAUDE.md
README.md
```

## รายละเอียดไฟล์

### (root)/
- **CLAUDE.md** (Markdown, 5KB) — CLAUDE.md — AI Software Development Team
- **README.md** (Markdown, 3KB) — AI Software Development Team
### knowledge-base\output/
- **domain-เงินเดือน.md** (Markdown, 42KB) — Domain Design — ระบบเงินเดือน (Payroll)
- **flow-เงินเดือน.md** (Markdown, 48KB) — UI/UX Flow — ระบบเงินเดือน (Payroll Module)
- **system-design-เงินเดือน.md** (Markdown, 28KB) — System Design — ระบบเงินเดือน (Payroll Module)
- **system-requirement-เงินเดือน.md** (Markdown, 44KB) — System Requirement — การคำนวณเงินเดือน (Payroll Calculation)
### knowledge-base\requirement/
- **CLRS_Dev_Spec.md** (Markdown, 32KB) — CLRS – Chana Latex HR System | Developer Spec
### knowledge-base\working-file/
- **Employee_Requirement.md** (Markdown, 18KB) — เอกสารข้อกำหนดความต้องการ
- **domain - กะการทำงาน.md** (Markdown, 54KB) — Domain Design — ระบบวางแผนการทำงานของพนักงาน (Shift Planning)
- **domain - การลา.md** (Markdown, 50KB) — Database Design — โมดูลการลา (Leave Management)
- **flow - กะการทำงาน.md** (Markdown, 32KB) — Flow การทำงาน: หน้าวางแผนการทำงานพนักงาน (Shift Planning)
- **flow - การลา.md** (Markdown, 40KB) — Flow การทำงาน: โมดูลการลา (Leave Management)
### scripts/
- **build_index.py** (Python, 9KB) — !/usr/bin/env python3
  - `def lang_of, def extract_symbols, def first_doc_line, def scan, def human_size, def build_tree, def walk, def render, def main`
