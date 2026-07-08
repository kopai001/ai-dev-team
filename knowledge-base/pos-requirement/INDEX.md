# INDEX — POS System Requirements

ระบบ POS สำหรับร้านค้าปลีกแบบหลายสาขา

## Modules (11 modules)

| Module | Flow | Domain | System Requirement |
|--------|------|--------|-------------------|
| สินค้า | [flow-สินค้า.md](flow-สินค้า.md) | [domain-สินค้า.md](domain-สินค้า.md) | [system-requirement-สินค้า.md](system-requirement-สินค้า.md) |
| ขาย/บิล | [flow-ขาย.md](flow-ขาย.md) | [domain-ขาย.md](domain-ขาย.md) | [system-requirement-ขาย.md](system-requirement-ขาย.md) |
| สต็อก | [flow-สต็อก.md](flow-สต็อก.md) | [domain-สต็อก.md](domain-สต็อก.md) | [system-requirement-สต็อก.md](system-requirement-สต็อก.md) |
| โยกย้ายสต็อก | [flow-โยกย้ายสต็อก.md](flow-โยกย้ายสต็อก.md) | [domain-โยกย้ายสต็อก.md](domain-โยกย้ายสต็อก.md) | [system-requirement-โยกย้ายสต็อก.md](system-requirement-โยกย้ายสต็อก.md) |
| ผู้ขาย | [flow-ผู้ขาย.md](flow-ผู้ขาย.md) | [domain-ผู้ขาย.md](domain-ผู้ขาย.md) | [system-requirement-ผู้ขาย.md](system-requirement-ผู้ขาย.md) |
| กะการทำงาน | [flow-กะการทำงาน.md](flow-กะการทำงาน.md) | [domain-กะการทำงาน.md](domain-กะการทำงาน.md) | [system-requirement-กะการทำงาน.md](system-requirement-กะการทำงาน.md) |
| พนักงาน | [flow-พนักงาน.md](flow-พนักงาน.md) | [domain-พนักงาน.md](domain-พนักงาน.md) | [system-requirement-พนักงาน.md](system-requirement-พนักงาน.md) |
| สมาชิก | [flow-สมาชิก.md](flow-สมาชิก.md) | [domain-สมาชิก.md](domain-สมาชิก.md) | [system-requirement-สมาชิก.md](system-requirement-สมาชิก.md) |
| โปรโมชัน | [flow-โปรโมชัน.md](flow-โปรโมชัน.md) | [domain-โปรโมชัน.md](domain-โปรโมชัน.md) | [system-requirement-โปรโมชัน.md](system-requirement-โปรโมชัน.md) |
| รายงาน | [flow-รายงาน.md](flow-รายงาน.md) | [domain-รายงาน.md](domain-รายงาน.md) | [system-requirement-รายงาน.md](system-requirement-รายงาน.md) |
| สาขา | [flow-สาขา.md](flow-สาขา.md) | [domain-สาขา.md](domain-สาขา.md) | [system-requirement-สาขา.md](system-requirement-สาขา.md) |

---

## ความสัมพันธ์ระหว่าง Module

```
สาขา ◄──── พนักงาน
  │            │
  ▼            ▼
กะการทำงาน ◄─── สินค้า ──► โปรโมชัน
  │                │
  ▼                ▼
ขาย/บิล ────► สต็อก ──► โยกย้ายสต็อก
  │                          │
  ▼                          ▼
สมาชิก              ผู้ขาย ──► (รับสินค้า)
  │
  ▼
รายงาน (query ทุก module)
```

## ไฟล์ทั้งหมด: 33 ไฟล์ + INDEX.md

---

## หมายเหตุ

- **flow-*.md** — User journey และ process flow พร้อม edge cases
- **domain-*.md** — Data model, entities, business rules, relationships
- **system-requirement-*.md** — Functional/Non-functional requirements, permissions, validation
