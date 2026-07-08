# Domain — Module: พนักงาน (Employee)

## Entities หลัก

### 1. Employee (พนักงาน)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| first_name | String | ✓ | ชื่อ |
| last_name | String | ✓ | นามสกุล |
| nickname | String | - | ชื่อเล่น |
| phone | String | - | เบอร์โทร |
| start_date | Date | - | วันที่เริ่มงาน |
| avatar_color | String | - | สีอวาตาร์ (hex) |
| status | Enum | ✓ | active/suspended/resigned |
| created_at | DateTime | ✓ | วันที่สร้าง |

### 2. EmployeeAccount (บัญชีเข้าสู่ระบบ)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| employee_id | UUID | ✓ | อ้างอิงพนักงาน |
| username | String | ✓ | ชื่อผู้ใช้ (unique) |
| password_hash | String | ✓ | รหัสผ่าน (hashed) |
| last_login | DateTime | - | เข้าใช้งานล่าสุด |
| is_locked | Boolean | ✓ | ถูกระงับหรือไม่ |

### 3. EmployeeRole (บทบาทและสิทธิ์)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| employee_id | UUID | ✓ | อ้างอิงพนักงาน |
| branch_id | UUID | ✓ | สาขาที่มีสิทธิ์ (NULL = ทุกสาขา) |
| role | Enum | ✓ | owner/admin/staff |
| permissions | JSON | ✓ | สิทธิ์ละเอียด (ต่อ module) |

### 4. WeeklySchedule (ตารางกะรายสัปดาห์)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| employee_id | UUID | ✓ | อ้างอิงพนักงาน |
| branch_id | UUID | ✓ | สาขา |
| week_start | Date | ✓ | วันจันทร์ต้นสัปดาห์ |
| mon_shift | Enum | - | กะวันจันทร์ |
| tue_shift | Enum | - | กะวันอังคาร |
| wed_shift | Enum | - | กะวันพุธ |
| thu_shift | Enum | - | กะวันพฤหัสบดี |
| fri_shift | Enum | - | กะวันศุกร์ |
| sat_shift | Enum | - | กะวันเสาร์ |
| sun_shift | Enum | - | กะวันอาทิตย์ |

---

## Business Rules

### กฎบทบาท (Role Hierarchy)
- `owner` — เจ้าของ: เห็นทุกอย่าง ทำได้ทุกอย่าง
- `admin` — แอดมิน: จัดการได้ในสาขาที่รับผิดชอบ
- `staff` — พนักงาน: ทำงานตาม permission ที่กำหนด

### กฎสิทธิ์สาขา
- พนักงาน 1 คนมีสิทธิ์ได้หลายสาขา
- สิทธิ์ต่อสาขาอาจต่างกัน (แอดมินสาขา A แต่พนักงานสาขา B)
- เจ้าของมีสิทธิ์ทุกสาขาเสมอ

### กฎการระงับ
- ระงับสิทธิ์ (is_locked = true) → Login ไม่ได้ทันที
- สิทธิ์ใหม่มีผลทันทีแม้ยัง active session

---

## Relationships
```
Employee ─── has one  ──► EmployeeAccount
Employee ─── has many ──► EmployeeRole
Employee ─── has many ──► WeeklySchedule
Employee ─── has many ──► Shift           [→ module กะ]
Employee ─── has many ──► Order           [→ module ขาย]
```

## Enum Values

### EmployeeStatus
- `active` — ทำงานปกติ
- `suspended` — ถูกระงับชั่วคราว
- `resigned` — ลาออก (soft delete)

### ScheduleShift
- `morning` — กะเช้า
- `afternoon` — กะบ่าย
- `night` — กะดึก
- `off` — วันหยุด

### Role
- `owner` — เจ้าของ
- `admin` — แอดมิน
- `staff` — พนักงาน
