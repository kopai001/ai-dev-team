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
- คลังกลาง (is_main_warehouse = true) มีได้ 1 แห่งต่อระบบ
- สาขา active เท่านั้นที่รับออเดอร์และเปิดกะได้
- ปิดสาขาได้เฉพาะเมื่อไม่มีกะเปิดและไม่มีออเดอร์ pending

---

## Relationships
```
Branch ─── has many ──► Shift          [→ module กะ]
Branch ─── has many ──► StockBalance   [→ module สต็อก]
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
