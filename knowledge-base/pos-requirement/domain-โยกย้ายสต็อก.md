# Domain — Module: โยกย้ายสต็อก

## Entities หลัก

### 1. StockTransfer (รายการโยกย้าย)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| transfer_no | String | ✓ | เลขที่รายการโยกย้าย |
| from_branch_id | UUID | ✓ | สาขาต้นทาง (NULL = คลังกลาง) |
| to_branch_id | UUID | ✓ | สาขาปลายทาง (NULL = คลังกลาง) |
| status | Enum | ✓ | pending/approved/completed/rejected |
| requested_by | UUID | ✓ | พนักงานที่ขอ |
| approved_by | UUID | - | แอดมินที่อนุมัติ |
| approved_at | DateTime | - | เวลาอนุมัติ |
| received_by | UUID | - | พนักงานที่รับ (ปลายทาง) |
| received_at | DateTime | - | เวลารับสินค้า |
| reject_reason | String | - | เหตุผลปฏิเสธ |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | วันที่สร้าง |

### 2. StockTransferItem (รายการสินค้าในการโยกย้าย)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| transfer_id | UUID | ✓ | อ้างอิงรายการโยกย้าย |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| stock_lot_id | UUID | - | ระบุล็อตที่ต้องการโอน (NULL = ระบบเลือก FEFO) |
| unit_id | UUID | ✓ | หน่วยที่โอน |
| requested_qty | Decimal | ✓ | จำนวนที่ขอโอน |
| approved_qty | Decimal | - | จำนวนที่อนุมัติ (อาจน้อยกว่า) |
| received_qty | Decimal | - | จำนวนที่รับจริง |
| shortage_qty | Decimal | - | จำนวนที่ขาด (requested - received) |
| note | String | - | หมายเหตุต่อรายการ |

---

## Business Rules

### กฎการโอน
- ต้นทางและปลายทางต้องต่างกัน
- โอนได้: สาขา → สาขา, สาขา → คลังกลาง, คลังกลาง → สาขา
- สต็อกต้นทางถูกตัดเมื่ออนุมัติ (ไม่ใช่เมื่อปลายทางรับ)
- สต็อกปลายทางเพิ่มเมื่อปลายทางยืนยันรับ

### กฎ Lot Tracking ในการโอน
- ถ้าระบุ stock_lot_id: โอน lot นั้นตามที่กำหนด (override FEFO)
- ถ้าไม่ระบุ: ระบบเลือก lot ตาม FEFO (expiry_date ใกล้สุดก่อน) จากสต็อกต้นทาง
- เมื่ออนุมัติ: `StockLotBalance` ต้นทาง ลด, `StockLotBalance` ปลายทาง เพิ่ม (lot_id เดิม)
- Lot ข้ามสาขาได้โดยไม่สร้าง lot ใหม่ — lot_no เดิมติดไปกับสินค้า
- StockMovement บันทึก stock_lot_id เสมอ (transfer_out/transfer_in)

### กฎส่วนต่าง (Shortage)
- `shortage_qty = approved_qty - received_qty`
- ถ้า shortage > 0: บันทึก StockAdjustment ที่ต้นทาง (เหตุผล: สูญหายระหว่างทาง)
- แต่ต้องผ่านการอนุมัติอีกครั้ง

### กฎอนุมัติ
- แอดมินทุกคนอนุมัติได้ ไม่จำกัดสาขา
- อนุมัติแบบ "ลดจำนวน" ได้ (approved_qty < requested_qty)
- เมื่ออนุมัติแล้ว ยกเลิกได้เฉพาะเจ้าของ

### กฎ Transfer No.
- format: `TRF-[วันที่]-[running]` เช่น `TRF-20260708-001`
- unique ทั่วทั้งระบบ

---

## Relationships
```
StockTransfer ─── has many ──► StockTransferItem
StockTransfer ─── belongs to ► Branch (from)      [→ module สาขา]
StockTransfer ─── belongs to ► Branch (to)
StockTransferItem ─── belongs to ► Product        [→ module สินค้า]
StockTransferItem ─── belongs to ► StockLot (opt) [→ module สต็อก]
StockTransfer ─── triggers ──► StockMovement      [→ module สต็อก]
StockMovement.stock_lot_id ──► StockLot           [→ module สต็อก]
```

## Enum Values

### TransferStatus
- `pending` — รอแอดมินอนุมัติ
- `approved` — อนุมัติ สต็อกต้นทางถูกตัด รอปลายทางรับ
- `completed` — ปลายทางรับครบ กระบวนการสิ้นสุด
- `rejected` — ปฏิเสธ สต็อกไม่เปลี่ยน
- `partial` — รับบางส่วน (ปลายทางรับไม่ครบ)
