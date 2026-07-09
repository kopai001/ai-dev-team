# Domain — Module: สต็อก

## Entities หลัก

### 1. StockLot (ล็อตสินค้า)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| lot_no | String | ✓ | เลขล็อต (auto-generate, format: `LOT-[วันที่]-[running]`) |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| receipt_id | UUID | ✓ | อ้างอิง StockReceipt ที่สร้างล็อตนี้ |
| supplier_id | UUID | - | ผู้ขายที่นำเข้า (NULL = ไม่ระบุ) |
| received_date | Date | ✓ | วันที่รับสินค้าเข้าล็อต |
| expiry_date | Date | - | วันหมดอายุ (NULL = ไม่มีวันหมดอายุ) |
| initial_qty | Decimal | ✓ | จำนวนเริ่มต้นรวมทั้งระบบ (หน่วยฐาน) |
| status | Enum | ✓ | active / expired / depleted |
| created_at | DateTime | ✓ | วันเวลาสร้าง |
| created_by | UUID | ✓ | ผู้บันทึก |

### 2. StockLotBalance (ยอดล็อตต่อสาขา)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| lot_id | UUID | ✓ | อ้างอิง StockLot |
| branch_id | UUID | ✓ | Branch ที่ถือสต็อกล็อตนี้ (สาขา หรือ คลังกลาง — Branch record ใดก็ได้) |
| quantity | Decimal | ✓ | จำนวนคงเหลือของล็อตนี้ใน Branch นี้ |
| updated_at | DateTime | ✓ | เวลาอัปเดตล่าสุด |

### 3. StockBalance (ยอดสต็อกคงเหลือรวม)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | Branch ที่ถือสต็อก (สาขา หรือ คลังกลาง — Branch record ใดก็ได้) |
| quantity | Decimal | ✓ | จำนวนคงเหลือรวมทุกล็อต (หน่วยฐาน) |
| min_threshold | Decimal | - | ขั้นต่ำแจ้งเตือน |
| last_updated | DateTime | ✓ | เวลาอัปเดตล่าสุด |

### 4. StockMovement (ความเคลื่อนไหวสต็อก — Immutable)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | สาขา |
| stock_lot_id | UUID | - | ล็อตที่เคลื่อนไหว (NULL = ไม่ระบุล็อต) |
| movement_type | Enum | ✓ | receive/sale/transfer_in/transfer_out/adjustment/return/count_adjustment |
| quantity | Decimal | ✓ | จำนวน (+ เพิ่ม, - ลด) |
| reference_id | UUID | - | อ้างอิง Order/Transfer/Adjustment/StockCount |
| reference_type | String | - | "order" / "transfer" / "adjustment" / "stock_count" |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | เวลาบันทึก |
| created_by | UUID | ✓ | ผู้บันทึก |

> **Immutable:** ห้ามแก้ไขหรือลบ record นี้หลังสร้าง — การแก้ยอดทำโดยสร้าง movement ใหม่ type `adjustment` หรือ `count_adjustment`

### 5. StockReceipt (ใบรับสินค้า)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| branch_id | UUID | ✓ | สาขาที่รับ |
| supplier_id | UUID | - | ผู้ขาย (NULL = ไม่ระบุ / รับจาก location อื่น) |
| received_by | UUID | ✓ | พนักงานที่รับ |
| status | Enum | ✓ | pending/completed |
| created_at | DateTime | ✓ | วันที่รับ |
| note | String | - | หมายเหตุ |

### 6. StockReceiptItem (รายการในใบรับ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| receipt_id | UUID | ✓ | อ้างอิงใบรับ |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| unit_id | UUID | ✓ | หน่วยที่รับ |
| ordered_qty | Decimal | - | จำนวนที่สั่ง |
| received_qty | Decimal | ✓ | จำนวนที่รับจริง |
| cost_price | Decimal | ✓ | ราคาทุนต่อหน่วย |
| expiry_date | Date | - | วันหมดอายุ (ใช้สร้าง StockLot) |
| damage_qty | Decimal | - | จำนวนเสียหาย |
| stock_lot_id | UUID | - | อ้างอิง StockLot ที่ถูกสร้างจากรายการนี้ (กรอกหลัง confirm) |

### 7. StockAdjustment (การตัดสต็อก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| branch_id | UUID | ✓ | สาขา |
| stock_lot_id | UUID | - | ระบุล็อตที่ต้องการตัด (ถ้า NULL ระบบเลือก FEFO) |
| quantity | Decimal | ✓ | จำนวนที่ตัด (ลบ = ตัดออก) |
| reason_type | Enum | ✓ | lost/damaged/expired/other |
| reason_note | String | - | รายละเอียดเพิ่มเติม |
| status | Enum | ✓ | pending/approved/rejected |
| requested_by | UUID | ✓ | พนักงานที่ขอ |
| approved_by | UUID | - | แอดมินที่อนุมัติ |
| approved_at | DateTime | - | เวลาอนุมัติ |
| reject_reason | String | - | เหตุผลปฏิเสธ |

### 8. StockCount (การนับสต็อก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| count_no | String | ✓ | เลขที่นับสต็อก (format: `CNT-[วันที่]-[running]`) |
| branch_id | UUID | ✓ | สาขาที่นับ |
| status | Enum | ✓ | draft / in_progress / completed / cancelled |
| note | String | - | หมายเหตุ |
| started_by | UUID | ✓ | พนักงานที่เริ่มนับ |
| completed_by | UUID | - | พนักงานที่ยืนยันผล |
| approved_by | UUID | - | แอดมินที่อนุมัติปรับยอด |
| started_at | DateTime | ✓ | เวลาเริ่มนับ |
| completed_at | DateTime | - | เวลายืนยันผล |
| approved_at | DateTime | - | เวลาอนุมัติ |

### 9. StockCountItem (รายการนับสต็อก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| count_id | UUID | ✓ | อ้างอิง StockCount |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| system_qty | Decimal | ✓ | ยอดรวมตามระบบ ณ เวลาเริ่มนับ (snapshot รวมทุกล็อต) |
| counted_qty | Decimal | - | ยอดที่นับจริง (กรอกโดยพนักงาน) |
| difference | Decimal | - | counted_qty - system_qty (คำนวณอัตโนมัติ) |
| note | String | - | หมายเหตุต่อรายการ |

---

## Business Rules

### กฎสต็อก
- สต็อกนับในหน่วยฐานเสมอ
- สต็อกต่ำสุดคือ 0 (ไม่ติดลบ เว้นแต่ตั้งค่าอนุญาต)
- **1 Branch = 1 สต็อก location** — สาขาแต่ละสาขามีสต็อกของตัวเอง คลังกลางก็เป็นอีก Branch (type=warehouse) ที่มีสต็อกของตัวเองเช่นกัน แค่ไม่ผูกกับสาขาปกติ
- ทุกโครงสร้าง (StockBalance / StockLotBalance / StockMovement) ใช้ `branch_id` NOT NULL ชี้ไปที่ Branch record ใดๆ ก็ได้ — ไม่มี special case สำหรับคลังกลาง
- `StockBalance.quantity` = Σ `StockLotBalance.quantity` ของสินค้านั้นใน Branch นั้น (ต้องสอดคล้องกันเสมอ)

### กฎ StockLot
- StockLot สร้างขึ้นอัตโนมัติเมื่อยืนยันใบรับสินค้า (StockReceipt):
  - สินค้าที่ `has_expiry_date = true`: 1 lot ต่อ 1 (product + expiry_date) ต่อใบรับ (ต้องกรอก expiry_date)
  - สินค้าที่ `has_expiry_date = false`: 1 lot ต่อ product ต่อใบรับ (ไม่มี expiry_date, ใช้ received_date แยก lot)
- Lot ไม่ผูกกับ Branch — ล็อตเดียวกันกระจายอยู่หลาย Branch ได้ผ่าน StockLotBalance (รวมทั้งคลังกลาง)
- เมื่อโยกย้ายสินค้า: StockLotBalance ต้นทาง ลด, StockLotBalance ปลายทาง เพิ่ม (lot_id เดิม) — ใช้กลไกเดียวกันสำหรับทุกคู่ Branch (สาขา↔สาขา, สาขา↔คลังกลาง)

### กฎ FEFO / FIFO
- สินค้าที่ `has_expiry_date = true`: ระบบใช้ **FEFO** — ตัด lot ที่ expiry_date ใกล้สุดก่อน
- สินค้าที่ `has_expiry_date = false`: ระบบใช้ **FIFO** — ตัด lot ที่ received_date เก่าสุดก่อน
- **Override:** พนักงาน/แอดมินระบุ stock_lot_id ตรงๆ ได้ เพื่อข้าม FEFO/FIFO
- lot ที่ status = `expired` ยังตัดสต็อกได้ (ต้องระบุ reason_type = `expired` ใน Adjustment)

### กฎ Auto-Expire (Background Job)
- Job รันทุกวันเที่ยงคืน: ตรวจ `StockLot.expiry_date < today` และ `status = active`
- เปลี่ยน `status → expired` อัตโนมัติ
- สร้าง notification แจ้งแอดมินและเจ้าของ รายการสินค้าที่หมดอายุวันนี้

### กฎการรับสินค้า
- รับมากกว่าสั่งได้ แต่ต้องบันทึกหมายเหตุ
- รับน้อยกว่าสั่งได้ บันทึก "รับขาด"
- ราคาทุนที่รับเข้าอัปเดต `cost_price` ของสินค้า (Average Cost)

### กฎการตัดสต็อก
- ตัดสต็อกต้องผ่านการอนุมัติจากแอดมิน (ทุกคนอนุมัติได้ ไม่จำกัดสาขา)
- พนักงานทำได้แค่ "ขอตัดสต็อก" ไม่ใช่ตัดเอง
- การตัดสต็อกที่อนุมัติแล้วย้อนกลับไม่ได้ — สร้าง Adjustment movement ใหม่แทน

### กฎ StockMovement (Immutable)
- ห้ามแก้ไขหรือลบ StockMovement ที่บันทึกแล้ว
- การแก้ยอด = สร้าง movement ใหม่ (+ หรือ -) พร้อม reference ถึง movement เดิม
- movement ทุกประเภทต้องสร้าง StockMovement record เสมอ (ไม่มีข้อยกเว้น)

### กฎการนับสต็อก (StockCount)
- นับสต็อกได้ทีละ Branch (1 StockCount ต่อ 1 Branch — สาขาปกติ หรือ คลังกลาง ก็ใช้กลไกเดียวกัน)
- **เลือกสินค้าที่จะนับได้** — ไม่จำเป็นต้องนับทุกสินค้าใน Branch; สินค้าที่ไม่ถูกเลือกไม่มีผลต่อสต็อก
- ขณะนับ (status = in_progress): ระบบยัง process ธุรกรรมปกติได้ (ไม่ lock)
- พนักงานกรอก counted_qty **รวม** ต่อสินค้า (ไม่แยกล็อต)
- เมื่อยืนยันผลการนับ: ระบบคำนวณ difference = counted_qty - system_qty
- ถ้า difference ≠ 0 → สร้าง StockAdjustment (reason_type = count_variance) รอแอดมินอนุมัติ

**เมื่อแอดมินอนุมัติ (ต่อสินค้าแต่ละรายการ):**
1. ตัดสต็อกล็อตเก่าทั้งหมดใน Branch นั้นให้เหลือ 0 (สร้าง StockMovement type=count_adjustment ลบยอดทุกล็อต)
2. สร้าง StockLot ใหม่ 1 lot: `initial_qty = counted_qty`, `received_date = today`, ไม่มี expiry_date (ล็อตจากการนับ — ไม่ใช่จากซื้อ)
3. สร้าง StockLotBalance ของ lot ใหม่ใน Branch = counted_qty
4. อัปเดต StockBalance ให้ตรงกับ counted_qty
5. StockMovement type=count_adjustment บันทึกสุทธิ (+ หรือ -)

### กฎแจ้งเตือน
- สต็อกต่ำ: quantity ≤ min_threshold
- สต็อกหมด: quantity = 0
- ใกล้หมดอายุ: expiry_date - today ≤ X วัน (ตามที่ตั้งค่า, default 7 วัน)
- หมดอายุแล้ว: expiry_date < today (lot.status = expired)

---

## Relationships
```
StockLot ─── belongs to ► StockReceipt
StockLot ─── belongs to ► Product         [→ module สินค้า]
StockLot ─── has many  ──► StockLotBalance
StockLotBalance ─── belongs to ► Branch   [→ module สาขา — สาขาปกติ หรือ คลังกลาง]
StockBalance ─── belongs to ► Product
StockBalance ─── belongs to ► Branch
StockMovement ─── belongs to ► Product
StockMovement ─── belongs to ► Branch
StockMovement ─── belongs to ► StockLot (optional)
StockReceipt ─── has many ──► StockReceiptItem
StockReceipt ─── belongs to ► Supplier    [→ module ผู้ขาย]
StockAdjustment ─── belongs to ► Product
StockAdjustment ─── belongs to ► StockLot (optional)
StockCount ─── belongs to ► Branch
StockCount ─── has many ──► StockCountItem
StockCountItem ─── belongs to ► Product
StockCountItem ─── belongs to ► StockLot (optional)
```

## Enum Values

### StockLotStatus
- `active` — ยังใช้งานได้ (หรือยังไม่หมดอายุ)
- `expired` — หมดอายุแล้ว (ตั้งโดย background job หรือ manual)
- `depleted` — สต็อกหมดแล้ว (quantity ทุกสาขา = 0)

### MovementType
- `receive` — รับสินค้าเข้า
- `sale` — ขายออก (จากบิล)
- `transfer_in` — รับโอนจากสาขาอื่น
- `transfer_out` — โอนออกไปสาขาอื่น
- `adjustment` — ตัดปรับ (เสียหาย/สูญหาย/หมดอายุ)
- `return` — คืนสินค้า
- `count_adjustment` — ปรับยอดจากการนับสต็อก

### AdjustmentReasonType
- `lost` — สูญหาย
- `damaged` — เสียหาย
- `expired` — หมดอายุ
- `count_variance` — ผลต่างจากการนับสต็อก
- `other` — อื่นๆ

### AdjustmentStatus
- `pending` — รอแอดมินอนุมัติ
- `approved` — อนุมัติแล้ว สต็อกถูกตัด
- `rejected` — ปฏิเสธ สต็อกไม่เปลี่ยน

### StockCountStatus
- `draft` — กำลังเตรียมรายการนับ
- `in_progress` — กำลังนับ
- `completed` — นับเสร็จ ยืนยันผลแล้ว
- `cancelled` — ยกเลิก
