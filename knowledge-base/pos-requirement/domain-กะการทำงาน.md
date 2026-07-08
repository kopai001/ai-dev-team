# Domain — Module: กะการทำงาน (Shift)

## Entities หลัก

### 1. Shift (กะ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| branch_id | UUID | ✓ | สาขา |
| shift_type | Enum | ✓ | morning/afternoon/night/custom |
| employee_id | UUID | ✓ | พนักงานที่เปิดกะ |
| status | Enum | ✓ | open/closed |
| opening_cash | Decimal | ✓ | เงินสดตั้งต้น (นับเมื่อเปิดกะ) |
| closing_cash_counted | Decimal | - | เงินสดที่นับได้เมื่อปิดกะ |
| closing_cash_expected | Decimal | - | เงินสดที่ควรมีเมื่อปิดกะ |
| cash_difference | Decimal | - | ผลต่าง (นับได้ - ควรมี) |
| transfer_total | Decimal | - | ยอดโอนรวมในกะ |
| opened_at | DateTime | ✓ | เวลาเปิดกะ |
| closed_at | DateTime | - | เวลาปิดกะ |
| previous_shift_id | UUID | - | กะก่อนหน้า |
| note | String | - | หมายเหตุ |

### 2. ShiftCashDenomination (ชนิดเงินนับกะ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| shift_id | UUID | ✓ | อ้างอิงกะ |
| type | Enum | ✓ | opening/closing |
| denomination | Int | ✓ | ชนิด (1000/500/100/50/20/10/5/2/1) |
| count | Int | ✓ | จำนวน |
| amount | Decimal | ✓ | denomination × count |

### 3. ShiftExpense (ค่าใช้จ่ายระหว่างกะ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| shift_id | UUID | ✓ | อ้างอิงกะ |
| expense_type | String | ✓ | ประเภทค่าใช้จ่าย |
| amount | Decimal | ✓ | จำนวนเงิน |
| note | String | - | หมายเหตุ |
| recorded_by | UUID | ✓ | พนักงานที่บันทึก |
| created_at | DateTime | ✓ | เวลาบันทึก |

### 4. CashRemittance (การส่งเงิน)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| shift_id | UUID | ✓ | อ้างอิงกะ |
| branch_id | UUID | ✓ | สาขา |
| amount | Decimal | ✓ | จำนวนที่ส่ง |
| method | Enum | ✓ | driver/transfer/other |
| evidence_url | String | - | รูปหลักฐาน |
| status | Enum | ✓ | pending/verified/rejected |
| sent_by | UUID | ✓ | พนักงานที่ส่ง |
| verified_by | UUID | - | แอดมินที่ยืนยัน |
| verified_at | DateTime | - | เวลายืนยัน |
| reject_reason | String | - | เหตุผลปฏิเสธ |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | เวลาบันทึก |

### 5. ShiftDiscrepancy (รายงานยอดไม่ตรง)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| shift_id | UUID | ✓ | อ้างอิงกะ |
| expected_amount | Decimal | ✓ | ยอดที่ควรมี |
| actual_amount | Decimal | ✓ | ยอดที่นับได้ |
| difference | Decimal | ✓ | ผลต่าง |
| reason | String | ✓ | สาเหตุที่คาดว่าเป็น |
| evidence_url | String | - | หลักฐาน |
| reported_by | UUID | ✓ | ผู้รายงาน |
| reviewed_by | UUID | - | แอดมินที่ตรวจสอบ |
| resolution | String | - | ผลการตรวจสอบ |

---

## Business Rules

### กฎกะ
- สาขาหนึ่งมีได้ 1 กะที่ open พร้อมกัน
- เปิดกะได้เฉพาะเมื่อไม่มีกะเปิดอยู่
- ขายสินค้าได้เฉพาะเมื่อกะ open
- ยอดเงินตั้งต้นกะใหม่ = ยอดปิดกะก่อน (ส่งมอบอัตโนมัติ)

### กฎยอดเงิน
- `closing_cash_expected = opening_cash + total_cash_sales - total_expenses - total_remittances + cash_received_extra`
- `cash_difference = closing_cash_counted - closing_cash_expected`
- ผลต่างเป็นบวก = เงินเกิน, ลบ = เงินขาด

### กฎการส่งเงิน
- ส่งเงินได้เฉพาะในกะที่ open
- ต้องผ่านการยืนยันจากแอดมิน
- นับเป็น cash outflow ของกะนี้

---

## Relationships
```
Shift ─── has many ──► Order                  [→ module ขาย]
Shift ─── has many ──► ShiftExpense
Shift ─── has many ──► ShiftCashDenomination
Shift ─── has many ──► CashRemittance
Shift ─── has many ──► ShiftDiscrepancy
Shift ─── belongs to ► Employee               [→ module พนักงาน]
Shift ─── belongs to ► Branch                 [→ module สาขา]
```

## Enum Values

### ShiftType
- `morning` — กะเช้า
- `afternoon` — กะบ่าย
- `night` — กะดึก
- `custom` — กะพิเศษ

### RemittanceMethod
- `driver` — ฝากคนขับ
- `transfer` — โอนเงิน
- `other` — อื่นๆ

### RemittanceStatus
- `pending` — รอยืนยัน
- `verified` — ยืนยันแล้ว
- `rejected` — ปฏิเสธ
