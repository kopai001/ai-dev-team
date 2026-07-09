# Domain — Module: ขาย / บิล

## Entities หลัก

### 1. Order (ออเดอร์/บิล)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| bill_no | String | ✓ | เลขบิล (auto-generate) |
| branch_id | UUID | ✓ | สาขาที่ออกบิล |
| shift_id | UUID | ✓ | กะที่ออกบิล |
| customer_id | UUID | - | สมาชิก (NULL = ทั่วไป) |
| employee_id | UUID | ✓ | พนักงานที่ขาย |
| status | Enum | ✓ | pending/completed/cancelled/credit |
| subtotal | Decimal | ✓ | ยอดก่อนลด |
| discount_amount | Decimal | ✓ | ส่วนลดรวม |
| total_amount | Decimal | ✓ | ยอดสุทธิ |
| points_used | Int | - | แต้มที่แลก |
| points_discount | Decimal | - | ส่วนลดจากแต้ม |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | วันเวลาออกบิล |
| cancelled_at | DateTime | - | วันเวลายกเลิก |
| cancelled_by | UUID | - | พนักงานที่ยกเลิก |
| cancel_reason | String | - | เหตุผลยกเลิก |

### 2. OrderItem (รายการในบิล)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| order_id | UUID | ✓ | อ้างอิงบิล |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| product_name_snapshot | String | ✓ | ชื่อสินค้า ณ เวลาขาย (cache) |
| unit_id | UUID | ✓ | หน่วยที่ขาย |
| unit_name_snapshot | String | ✓ | ชื่อหน่วย ณ เวลาขาย (cache) |
| quantity | Decimal | ✓ | จำนวน |
| unit_price | Decimal | ✓ | ราคาต่อหน่วย ณ เวลาขาย (cache) |
| cost_price_snapshot | Decimal | ✓ | ราคาทุน ณ เวลาขาย (cache) |
| discount_amount | Decimal | ✓ | ส่วนลดต่อรายการ |
| total_price | Decimal | ✓ | (unit_price × quantity) - discount |
| promotion_id | UUID | - | โปรโมชันที่ใช้ |
| is_bundle | Boolean | ✓ | เป็นส่วนหนึ่งของชุดหรือไม่ |
| bundle_id | UUID | - | อ้างอิงชุดสินค้า |
| stock_lot_id | UUID | - | ล็อตที่ตัดสต็อก (เลือกโดย FEFO อัตโนมัติ หรือ override) |

### 3. Payment (การชำระ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| order_id | UUID | ✓ | อ้างอิงบิล |
| method | Enum | ✓ | cash / transfer / promptpay |
| amount | Decimal | ✓ | จำนวนที่รับ |
| received_at | DateTime | ✓ | เวลารับเงิน |
| reference_no | String | - | เลขอ้างอิงการโอน |
| verified_by | UUID | - | แอดมินที่ยืนยัน (กรณีโอน) |

### 4. CreditBill (บิลค้างชำระ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order_id | UUID | ✓ | อ้างอิงบิล |
| customer_id | UUID | ✓ | ลูกค้า (บังคับ) |
| due_amount | Decimal | ✓ | ยอดค้าง |
| paid_amount | Decimal | ✓ | ยอดชำระแล้ว |
| settled_at | DateTime | - | วันชำระครบ |

---

## Business Rules

### กฎบิล
- ออกบิลได้เฉพาะเมื่อกะเปิดอยู่ (shift_id ต้องเป็นกะที่ active)
- เลขบิล format: `[สาขา]-[วันที่]-[running number]` เช่น `BKK-20260708-0001`
- บิลที่สำเร็จแล้วยกเลิกได้เฉพาะผู้มีสิทธิ์ (แอดมิน/เจ้าของ)
- การยกเลิกบิลต้องคืนสต็อกทุกรายการ

### กฎราคาและ Snapshot
- ข้อมูลสินค้าในบิล (ชื่อ, หน่วย, ราคาขาย, ราคาทุน) ถูก **snapshot ณ เวลาขาย** — ไม่เปลี่ยนแม้ข้อมูลสินค้าต้นทางจะถูกแก้ไขในภายหลัง
- `product_id` และ `unit_id` คงไว้เพื่อ traceability เท่านั้น — ระบบแสดงผลบิลจาก snapshot fields
- ส่วนลดมี 2 ระดับ: ระดับรายการ (item discount) และระดับบิล (order discount)
- ยอดสุทธิ = Σ(item_total) - order_discount - points_discount

### กฎการชำระ
- 1 บิลมีได้หลาย Payment (ผสมวิธีชำระ)
- เงินสด: ทอน = จำนวนรับ - ยอดสุทธิ (ต้องรับ ≥ ยอดสุทธิ)
- โอน: รับยอดโอนไม่ตรงได้ บันทึกส่วนต่างเป็น "โอนขาด/โอนเกิน"

### กฎสต็อก
- ตัดสต็อกทันทีเมื่อบิลสำเร็จ (status = completed)
- คืนสต็อกทันทีเมื่อยกเลิก (status = cancelled)
- ไม่ตัดสต็อกสำหรับบิลค้างชำระจนกว่าจะชำระครบ ❌ (ขึ้นอยู่กับ business rule)
  - **ตัวเลือก A**: ตัดสต็อกทันทีที่บันทึกค้างชำระ (สินค้าออกไปแล้ว)
  - **ตัวเลือก B**: ตัดสต็อกเมื่อชำระครบ
  - → **ใช้ตัวเลือก A** (สินค้าออกไปจริงแม้ยังไม่ได้เงิน)

### กฎ FEFO ในการขาย
- เมื่อบิลสำเร็จ: ระบบเลือก StockLot ที่ expiry_date ใกล้สุดก่อน (FEFO) ต่อสินค้าแต่ละรายการ
- บันทึก stock_lot_id ลง OrderItem เพื่อ traceability
- ถ้าสินค้ามีหลายล็อต: ตัดจาก lot เก่าสุด (expiry ใกล้สุด) ก่อน — ถ้าล็อตนั้นไม่พอ ตัดต่อจาก lot ถัดไป
- lot ที่ status = expired ยังตัดได้ (แต่แจ้งเตือนพนักงาน)

---

## Relationships
```
Order ─── has many ──► OrderItem
Order ─── has many ──► Payment
Order ─── has one  ──► CreditBill (ถ้าค้างชำระ)
Order ─── belongs to ► Shift     [→ module กะ]
Order ─── belongs to ► Customer  [→ module สมาชิก]
OrderItem ─── belongs to ► Product  [→ module สินค้า]
OrderItem ─── belongs to ► Promotion [→ module โปรโมชัน]
```

## Enum Values

### OrderStatus
- `pending` — ออเดอร์กำลังสร้าง (ยังไม่บันทึก)
- `completed` — บิลสำเร็จ
- `cancelled` — ถูกยกเลิก
- `credit` — ค้างชำระ

### PaymentMethod
- `cash` — เงินสด
- `transfer` — โอนเงิน
- `promptpay` — พร้อมเพย์
