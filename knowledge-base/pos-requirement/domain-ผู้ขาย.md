# Domain — Module: ผู้ขาย (Supplier)

## Entities หลัก

### 1. Supplier (ผู้ขาย)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| name | String | ✓ | ชื่อผู้ขาย / ร้านค้า |
| contact_name | String | - | ชื่อผู้ติดต่อ |
| phone | String | - | เบอร์โทร |
| address | String | - | ที่อยู่ |
| note | String | - | หมายเหตุ |
| is_active | Boolean | ✓ | เปิด/ปิดใช้งาน |
| created_at | DateTime | ✓ | วันที่สร้าง |
| created_by | UUID | ✓ | ผู้สร้าง |

---

## Business Rules
- ผู้ขายที่ปิดใช้งาน (is_active = false) ไม่แสดงใน dropdown รับสินค้า
- ลบผู้ขายไม่ได้ถ้ามีประวัติการรับสินค้า — ใช้ soft delete แทน
- ผู้ขาย 1 รายสามารถขายได้หลายสินค้า (many-to-many ผ่าน StockReceipt)

---

## Relationships
```
Supplier ─── has many ──► StockReceipt   [→ module สต็อก]
```
