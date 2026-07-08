# Domain — Module: สต็อก

## Entities หลัก

### 1. StockBalance (ยอดสต็อกคงเหลือ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | สาขา (NULL = คลังกลาง) |
| quantity | Decimal | ✓ | จำนวนคงเหลือ (หน่วยฐาน) |
| min_threshold | Decimal | - | ขั้นต่ำแจ้งเตือน |
| last_updated | DateTime | ✓ | เวลาอัปเดตล่าสุด |

### 2. StockMovement (ความเคลื่อนไหวสต็อก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | สาขา |
| movement_type | Enum | ✓ | receive/sale/transfer/adjustment/return |
| quantity | Decimal | ✓ | จำนวน (+ เพิ่ม, - ลด) |
| reference_id | UUID | - | อ้างอิง Order/Transfer/Adjustment |
| reference_type | String | - | "order" / "transfer" / "adjustment" |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | เวลาบันทึก |
| created_by | UUID | ✓ | ผู้บันทึก |

### 3. StockReceipt (ใบรับสินค้า)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| branch_id | UUID | ✓ | สาขาที่รับ |
| supplier_id | UUID | - | ผู้ขาย (NULL = คลังกลาง) |
| received_by | UUID | ✓ | พนักงานที่รับ |
| status | Enum | ✓ | pending/completed |
| created_at | DateTime | ✓ | วันที่รับ |
| note | String | - | หมายเหตุ |

### 4. StockReceiptItem (รายการในใบรับ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| receipt_id | UUID | ✓ | อ้างอิงใบรับ |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| unit_id | UUID | ✓ | หน่วยที่รับ |
| ordered_qty | Decimal | - | จำนวนที่สั่ง |
| received_qty | Decimal | ✓ | จำนวนที่รับจริง |
| cost_price | Decimal | ✓ | ราคาทุนต่อหน่วย |
| expire_date | Date | - | วันหมดอายุ |
| damage_qty | Decimal | - | จำนวนเสียหาย |

### 5. StockAdjustment (การตัดสต็อก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | สาขา |
| quantity | Decimal | ✓ | จำนวนที่ตัด (ลบ = ตัดออก) |
| reason_type | Enum | ✓ | lost/damaged/expired/other |
| reason_note | String | - | รายละเอียดเพิ่มเติม |
| status | Enum | ✓ | pending/approved/rejected |
| requested_by | UUID | ✓ | พนักงานที่ขอ |
| approved_by | UUID | - | แอดมินที่อนุมัติ |
| approved_at | DateTime | - | เวลาอนุมัติ |
| reject_reason | String | - | เหตุผลปฏิเสธ |

---

## Business Rules

### กฎสต็อก
- สต็อกนับในหน่วยฐานเสมอ
- สต็อกต่ำสุดคือ 0 (ไม่ติดลบ เว้นแต่ตั้งค่าอนุญาต)
- สต็อกแต่ละสาขาแยกกัน ไม่รวมกันอัตโนมัติ
- คลังกลาง (branch_id = NULL) เป็น special case

### กฎการรับสินค้า
- รับมากกว่าสั่งได้ แต่ต้องบันทึกหมายเหตุ
- รับน้อยกว่าสั่งได้ บันทึก "รับขาด"
- ราคาทุนที่รับเข้าอัปเดต `cost_price` ของสินค้า (FIFO หรือ Average Cost)

### กฎการตัดสต็อก
- ตัดสต็อกต้องผ่านการอนุมัติจากแอดมิน (ทุกคนอนุมัติได้ ไม่จำกัดสาขา)
- พนักงานทำได้แค่ "ขอตัดสต็อก" ไม่ใช่ตัดเอง
- การตัดสต็อกที่อนุมัติแล้วย้อนกลับไม่ได้

### กฎแจ้งเตือน
- สต็อกต่ำ: quantity ≤ min_threshold
- สต็อกหมด: quantity = 0
- ใกล้หมดอายุ: วันหมดอายุ - today ≤ X วัน (ตามที่ตั้งค่า)

---

## Relationships
```
StockBalance ─── belongs to ► Product   [→ module สินค้า]
StockBalance ─── belongs to ► Branch    [→ module สาขา]
StockMovement ─── belongs to ► Product
StockMovement ─── belongs to ► Branch
StockReceipt ─── has many ──► StockReceiptItem
StockReceipt ─── belongs to ► Supplier  [→ module ผู้ขาย]
StockAdjustment ─── belongs to ► Product
```

## Enum Values

### MovementType
- `receive` — รับสินค้าเข้า
- `sale` — ขายออก (จากบิล)
- `transfer_in` — รับโอนจากสาขาอื่น
- `transfer_out` — โอนออกไปสาขาอื่น
- `adjustment` — ตัดปรับ (เสียหาย/สูญหาย)
- `return` — คืนสินค้า

### AdjustmentReasonType
- `lost` — สูญหาย
- `damaged` — เสียหาย
- `expired` — หมดอายุ
- `other` — อื่นๆ

### AdjustmentStatus
- `pending` — รอแอดมินอนุมัติ
- `approved` — อนุมัติแล้ว สต็อกถูกตัด
- `rejected` — ปฏิเสธ สต็อกไม่เปลี่ยน
