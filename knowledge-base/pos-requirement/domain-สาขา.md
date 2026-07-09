# Domain — Module: สาขา (Branch)

## Entities หลัก

### 1. Branch (สาขา)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| name | String | ✓ | ชื่อสาขา |
| type | Enum | ✓ | branch/warehouse (คลังกลาง) |
| address | String | - | ที่อยู่ |
| location | String | - | GPS coordinates |
| phone | String | - | เบอร์ติดต่อ |
| open_time | Time | - | เวลาเปิด |
| close_time | Time | - | เวลาปิด |
| status | Enum | ✓ | active/closed_temp/closed |
| is_main_warehouse | Boolean | ✓ | เป็นคลังกลางหรือไม่ |
| created_at | DateTime | ✓ | วันที่สร้าง |

### 2. Zone (โซน)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| branch_id | UUID | ✓ | อ้างอิงสาขา |
| name | String | ✓ | ชื่อโซน |
| description | String | - | คำอธิบาย |

---

## Business Rules
- **Branch = stock location** — ทุก Branch record (ทั้ง type=branch และ type=warehouse) เป็น stock location เท่ากัน ถือสต็อกของตัวเอง 1 Branch = 1 สต็อก
- คลังกลาง (type=warehouse) คือ Branch record หนึ่งที่ **ไม่ผูกกับสาขาปกติ** — ไม่รับออเดอร์ขาย ไม่เปิดกะ ใช้เพื่อเก็บสต็อกและโอนไปสาขา
- คลังกลาง (is_main_warehouse = true) มีได้ 1 แห่งต่อระบบ; อาจมี Branch type=warehouse เพิ่มเติมได้ (คลังย่อย) โดยใช้กลไกสต็อกเดียวกัน
- สาขา (type=branch) active เท่านั้นที่รับออเดอร์และเปิดกะได้
- ปิด Branch ได้เฉพาะเมื่อไม่มีกะเปิด, ไม่มีออเดอร์ pending, และไม่มีสต็อกคงเหลือ (หรือโอนสต็อกออกแล้ว)

---

## Relationships
```
Branch ─── has many ──► Shift          [→ module กะ] (เฉพาะ type=branch)
Branch ─── has many ──► StockBalance   [→ module สต็อก] (ทุก type — สาขาปกติ และ คลังกลาง)
Branch ─── has many ──► StockLotBalance [→ module สต็อก] (ทุก type)
Branch ─── has many ──► EmployeeRole   [→ module พนักงาน]
Branch ─── has many ──► Zone
Branch ─── has many ──► Order          [→ module ขาย]
```

## Enum Values

### BranchType
- `branch` — สาขาปกติ
- `warehouse` — คลังกลาง

### BranchStatus
- `active` — เปิดทำการปกติ
- `closed_temp` — ปิดชั่วคราว
- `closed` — ปิดถาวร
