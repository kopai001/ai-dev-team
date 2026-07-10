# System Overview — POS ร้านค้าปลีกหลายสาขา

ภาพรวมระบบข้าม module. ใช้เป็นจุดตั้งต้นก่อนเจาะไฟล์เฉพาะ module.

---

## 1. ขอบเขตระบบ (Scope)

ระบบ POS สำหรับร้านค้าปลีก **หลายสาขา** + **คลังกลาง** ครอบคลุม:
- ขายหน้าร้าน (POS terminal) + ออกบิล/ใบเสร็จ
- จัดการสินค้า, บาร์โค้ด, หน่วยนับ, ราคา, โปรโมชัน
- จัดการสต็อกแบบ lot + FEFO + แจ้งเตือน MinStock
- โยกย้ายสต็อกระหว่างสาขา/คลัง (approve/reject)
- จัดซื้อจากผู้ขาย (PO → GR)
- กะการทำงาน + ลิ้นชักเงินสด + cash diff
- สมาชิก + แต้ม + tier + redemption
- รายงานยอดขาย/สต็อก mult-branch
- พนักงาน + role + permission + branch scope

---

## 2. Actor หลัก

| Actor | หน้าที่ |
|-------|--------|
| พนักงาน | ปฏิบัติงานหน้าสาขา — เปิด/ปิดกะ, ขาย, รับเงิน, รับของ, โยกย้ายสต็อก, นับสต็อก (permission ตาม role ที่ admin กำหนด) |
| แอดมินกลาง | จัดการ master data ทั้งระบบ — สินค้า, โปรโมชัน, สมาชิก, พนักงาน, role/permission, สาขา, ผู้ขาย |
| เจ้าของ | ดูรายงานรวม cross-branch, กำหนดนโยบาย, สิทธิ์สูงสุด |

---

## 3. Module Map

11 module + ไฟล์ละ 3 มุมมอง (flow / domain / system-requirement):

| # | Module | Purpose |
|---|--------|---------|
| 1 | สาขา | Branch (type=branch/warehouse), 1 Branch = 1 stock location |
| 2 | พนักงาน | Employee, Role, Permission, Branch assignment |
| 3 | สินค้า | Product, Category, Barcode, Unit, Price |
| 4 | สต็อก | StockBalance, Lot (FEFO), Movement (immutable), Receipt, Adjust, Count |
| 5 | โยกย้ายสต็อก | StockTransfer branch↔branch/warehouse, approve/reject |
| 6 | ผู้ขาย | Supplier, PurchaseOrder, GoodsReceipt |
| 7 | ขาย/บิล | Sale, Bill, Payment, Discount, Receipt |
| 8 | สมาชิก | Member, Points (reset 31 ธ.ค.), Tier, Redemption |
| 9 | โปรโมชัน | Promotion, Condition, Priority rule, Bundle |
| 10 | กะการทำงาน | Shift, CashDrawer, Open/Close, CashDiff |
| 11 | รายงาน | SalesReport, StockReport, multi-branch view |

---

## 4. Dependency Graph

```
สาขา ──► พนักงาน ──► กะการทำงาน ──► ขาย
                                    ▲
สินค้า ──► สต็อก ──► โยกย้ายสต็อก    │
   │        ▲                        │
   │        └── ผู้ขาย (PO→GR) ──────┤
   │                                 │
   └──► โปรโมชัน ────────────────────┤
                                     │
               สมาชิก ────────────────┘

รายงาน ── query ทุก module
```

Rule: module ล่างต้องมี master data ของ module บนก่อน. ตัวอย่าง — สร้าง Employee ต้องมี Branch, เปิดกะต้องมี Employee, ขายต้องมีกะเปิด + Product + Stock.

---

## 5. Cross-cutting Concerns

- **Multi-branch scope:** ทุก transaction ผูก `branch_id`. Permission จำกัด scope ตาม branch assignment ของ Employee.
- **Stock ledger:** `StockMovement` = immutable log. `StockBalance` + `StockLotBalance` = snapshot คำนวณจาก movement.
- **FEFO:** ตัดสต็อกตาม lot expiry ใกล้สุดก่อน.
- **Idempotency:** บิลขาย, PO, Transfer ใช้ business key กันซ้ำ.
- **Audit:** ทุก financial doc (บิล, PO, GR, Adjust, Transfer) เก็บ `created_by`, `created_at`, `approved_by`.
- **Permission model:** Role → Permission set. ผูก Employee + Branch scope.
- **Cache:** Product price/detail cache ไว้ที่ POS terminal ลด latency.

---

## 6. Key Business Rules (High-level)

- 1 Branch = 1 stock location (สาขา หรือ คลัง type เดียวกันในเชิง stock).
- Point สมาชิก reset 31 ธันวาคม ทุกปี.
- Promotion มี priority; conflict → apply ตาม priority rule.
- Transfer ต้องผ่าน approve ก่อนตัดสต็อกจริง.
- Cash diff เกิน threshold → require reason + manager approval.
- MinStock alert trigger เมื่อ StockBalance < threshold ต่อ product ต่อ branch.

---

## 7. Data Ownership

| Master Data | Owner | Scope |
|-------------|-------|-------|
| Branch, Product, Category, Promotion, Member, Employee, Role, Supplier | HQ/Admin | Global |
| StockBalance, Shift, Sale, CashDrawer | Branch | Per-branch |
| Transfer | Source + Destination branch | Cross-branch, approve required |
| PurchaseOrder, GoodsReceipt | Purchaser + receiving Branch | Per-branch |

---

## 8. Integration Points (ภายนอก)

- Payment gateway (บัตร, wallet, QR)
- Barcode/label printer, receipt printer, cash drawer hardware
- Accounting export (ยอดขายรายวัน, GR, adjust)
- SMS/notification (member point, promotion)

---

## 9. อ่านต่อ

- Module detail: ดู `INDEX.md` แล้วเลือก `flow-*` / `domain-*` / `system-requirement-*` ตามจุดสนใจ
- Dev standard: `../../CLAUDE.md` §7
