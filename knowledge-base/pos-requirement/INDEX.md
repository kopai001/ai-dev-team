# INDEX — POS Requirement (knowledge-base/pos-requirement/)

ระบบ POS ร้านค้าปลีกหลายสาขา | 11 modules | 33 files

## File Pattern
`{flow|domain|system-requirement}-{module}.md` — 3 files per module

---

## Modules

| Module | Key Entities / Purpose | Files |
|--------|------------------------|-------|
| สินค้า | Product, Category, Barcode, Unit, Price | flow / domain / system-req |
| ขาย/บิล | Sale, Bill, Payment, Discount, Receipt | flow / domain / system-req |
| สต็อก | StockLevel, StockAdjustment, MinStock alert | flow / domain / system-req |
| โยกย้ายสต็อก | StockTransfer ระหว่างสาขา, Approve/Reject | flow / domain / system-req |
| ผู้ขาย | Supplier, PurchaseOrder, GoodsReceipt | flow / domain / system-req |
| กะการทำงาน | Shift, CashDrawer, OpenClose, CashDiff | flow / domain / system-req |
| พนักงาน | Employee, Role, Permission, Branch assign | flow / domain / system-req |
| สมาชิก | Member, Points, Tier, Redemption | flow / domain / system-req |
| โปรโมชัน | Promotion, Condition, Discount rule | flow / domain / system-req |
| รายงาน | SalesReport, StockReport, multi-branch view | flow / domain / system-req |
| สาขา | Branch, BranchConfig, Admin scope | flow / domain / system-req |

---

## Module Dependencies

```
สาขา → พนักงาน → กะการทำงาน
สินค้า → สต็อก → โยกย้ายสต็อก → ผู้ขาย
สินค้า → โปรโมชัน
ขาย → สมาชิก, สต็อก, โปรโมชัน
รายงาน → (query ทุก module)
```
