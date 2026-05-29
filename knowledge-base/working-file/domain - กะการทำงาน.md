# Domain Design — ระบบวางแผนการทำงานของพนักงาน (Shift Planning)

## 1. ภาพรวม Domain Model

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────────────┐
│  Employee   │         │      Shift       │         │   ShiftAssignment    │
│ (พนักงาน)    │         │  (กะการทำงาน)    │         │   (รอบการวางแผน)     │
├─────────────┤         ├──────────────────┤         ├──────────────────────┤
│ id          │         │ id               │         │ id                   │
│ employeeNo  │         │ name             │         │ name                 │
│ firstName   │         │ startTime        │         │ isRepeat             │
│ lastName    │         │ endTime          │         │ startDate            │
│ email       │         │ breakMinutes     │         │ endDate?             │
│ phone       │         │ color            │         │ repeatDays?          │
│ avatarUrl   │         │ workMinutes      │         │ shiftId?  (Repeat)   │
│ departmentId│◄──┐     │ isActive         │         │ lastGeneratedAt?     │
│ positionId  │   │     │ createdAt        │    ┌────│ warningSentAt?       │
│ status      │   │     │ updatedAt        │    │    │ createdBy            │
│ hiredAt     │   │     └─────▲─────▲──────┘    │    │ status               │
└─────────────┘   │           │     │           │    └──────────────────────┘
        ▲         │           │     │           │               │
        │         │           │     │           │               │
        │         │           │     │           │               │ (1 Assignment → N EmployeeShifts)
        │    ┌────┴───────────┼─────┼──────┐    │               ▼
        │    │     AssignmentEmployee     │    │    ┌──────────────────────┐
        │    │     (พนักงานในรอบ M:N)      │    │    │   EmployeeShift      │
        │    ├────────────────┼──────────┤    │    │ (กะของพนักงานรายวัน)   │
        └────│ employeeId     │          │    │    ├──────────────────────┤
             │ assignmentId  ◄┼──────────┼────┘    │ id                   │
             │ shiftId?  ─────┘          │         │ employeeId    ◄──────┼──── (FK → Employee.id)
             │ addedAt                   │         │ shiftId  ─────┐      │
             │ removedAt?                │         │ assignmentId  │      │
             └───────────────────────────┘         │ workDate      │      │
                                                   │ skippedReason?│      │ ← HOLIDAY|LEAVE|null
                                                   │ status        │      │
                                                   │ checkInAt?    │      │
                                                   │ checkOutAt?   │      │
                                                   │ notes?        │      │
                                                   └───────────────┼──────┘
                                                                   │
                                                                   └────► (FK → Shift.id)
                                                               ▲
                                               ตรวจก่อนสร้างทุกครั้ง (read-only)
                                                    │                    │
                                     ┌──────────────┘                    └──────────────┐
                                     ▼                                                  ▼
                          ┌──────────────────────────┐          ┌──────────────────────────┐
                          │  OfficeHoliday            │          │  LeaveRequest             │
                          │  [Office Holiday Module]  │          │  [Leave Request Module]   │
                          ├──────────────────────────┤          ├──────────────────────────┤
                          │ id                        │          │ id                        │
                          │ date                      │          │ employeeId                │
                          │ name                      │          │ startDate                 │
                          │ isRecurringYearly         │          │ endDate                   │
                          │ organizationId            │          │ status  (APPROVED only)   │
                          └──────────────────────────┘          └──────────────────────────┘
                                  ↑ read-only                            ↑ read-only
```

**Note เรื่อง `shiftId` (สำคัญ):**

- **ShiftAssignment.shiftId** — เก็บเฉพาะ Repeat mode (กะกลางของรอบทั้งหมด); No Repeat = `null`
- **AssignmentEmployee.shiftId** — Repeat = copy จาก `ShiftAssignment.shiftId` (denormalized เพื่อ query เร็ว); No Repeat = `null`
- **EmployeeShift.shiftId** — เก็บเสมอ (กะรายวันที่จะทำงานจริง — ทั้ง Repeat และ No Repeat)

**External Module Integration (Read-Only):**

- **Office Holiday Module** — query วันหยุดบริษัทก่อนสร้าง EmployeeShift ทุกครั้ง ถ้า `workDate` ตรงกับวันหยุด → **ข้ามไป (skip)** ไม่สร้าง
- **Leave Request Module** — query วันลาที่ `status = APPROVED` ของพนักงานแต่ละคน ถ้า `workDate` อยู่ในช่วงลา → **ข้ามไปเฉพาะพนักงานคนนั้น** คนอื่นในรอบยังสร้างปกติ
- ทั้งสองเป็น **read-only integration** — ไม่มีการเขียนกลับ ไม่ทำให้ domain coupling รุนแรง
- ใช้ pattern **Anti-Corruption Layer (ACL)**: wrap ผ่าน interface `HolidayProvider` และ `LeaveProvider` เพื่อ decouple จาก implementation ของแต่ละ module

---

## 2. รายละเอียด Entity

### 2.1 Shift (กะการทำงาน)

> เทมเพลตของกะที่นำกลับมาใช้ซ้ำได้ — เช่น "กะเช้า 08:00-16:00 พักเที่ยง 1 ชม."

| Field             | Type       | Required     | Description                                 |
| ----------------- | ---------- | ------------ | ------------------------------------------- |
| `id`              | UUID       | ✓            | Primary key                                 |
| `name`            | string(50) | ✓            | ชื่อกะ เช่น "กะเช้า", "โอที"                |
| `code`            | string(20) | ✓            | รหัสกะ unique เช่น `MORN`, `NIGHT`          |
| `startTime`       | time       | ✓            | เวลาเริ่มงาน (24h) เช่น `08:00:00`          |
| `endTime`         | time       | ✓            | เวลาเลิกงาน เช่น `16:00:00`                 |
| `breakMinutes`    | int        | ✓            | เวลาพักรวม (นาที) — default 0               |
| `breakStartTime`  | time       | –            | เวลาเริ่มพัก (ถ้าระบุชัด)                   |
| `color`           | string(7)  | ✓            | สี hex สำหรับ UI chip เช่น `#E07A3C`        |
| `workMinutes`     | int        | ✓ (computed) | นาทีทำงานจริง = duration − break            |
| `crossesMidnight` | boolean    | ✓ (computed) | true ถ้า endTime < startTime (กะดึกข้ามวัน) |
| `isActive`        | boolean    | ✓            | สถานะใช้งาน (soft toggle)                   |
| `description`     | text       | –            | รายละเอียดเพิ่มเติม                         |
| `createdAt`       | timestamp  | ✓            |                                             |
| `updatedAt`       | timestamp  | ✓            |                                             |

**Business Rules:**

- `startTime ≠ endTime`
- ถ้า `endTime < startTime` → กะข้ามวัน (เช่น 22:00 → 06:00)
- `breakMinutes < workDuration`
- `code` ต้อง unique ทั้งระบบ
- การลบ Shift ทำเป็น soft delete (`isActive = false`) — ห้ามลบจริงถ้ามี EmployeeShift อ้างอิงอยู่

---

### 2.2 ShiftAssignment (รอบการวางแผน)

> "รอบ" การกำหนดงาน — เป็น parent ของ EmployeeShift หลายรายการ ใช้แทน intent ของผู้วางแผน

| Field             | Type              | Required | Description                                                         |
| ----------------- | ----------------- | -------- | ------------------------------------------------------------------- |
| `id`              | UUID              | ✓        | Primary key                                                         |
| `name`            | string(100)       | –        | ชื่อรอบ (อาจ auto-gen ถ้าไม่ระบุ)                                   |
| `isRepeat`        | boolean           | ✓        | true = ทำซ้ำรายสัปดาห์, false = เฉพาะช่วง                           |
| `startDate`       | date              | ✓        | วันเริ่ม                                                            |
| `endDate`         | date              | –        | วันจบ (ถ้า isRepeat=true จะ optional, ถ้า false จะ required)        |
| `shiftId`         | UUID              | –        | กะที่ใช้ (เฉพาะ Repeat mode เท่านั้น — เลือกได้ 1)                  |
| `repeatDays`      | bit[7] หรือ jsonb | –        | วันในสัปดาห์ที่ทำงาน เช่น `[1,1,1,1,1,0,0]` = จ-ศ (Repeat เท่านั้น) |
| `lastGeneratedAt` | date              | –        | วันที่ Employee Shift ถูกสร้างไปถึงล่าสุด (Repeat เท่านั้น)         |
| `warningSentAt`   | date              | –        | วันที่ส่ง expiry warning ล่าสุด (No Repeat เท่านั้น)                |
| `status`          | enum              | ✓        | `DRAFT` / `ACTIVE` / `PAUSED` / `COMPLETED` / `CANCELLED`           |
| `createdBy`       | UUID              | ✓        | userId ของผู้สร้าง                                                  |
| `createdAt`       | timestamp         | ✓        |                                                                     |
| `updatedAt`       | timestamp         | ✓        |                                                                     |

**Business Rules:**

- ถ้า `isRepeat = true`:
  - `shiftId` required (1 กะเท่านั้น)
  - `repeatDays` required (อย่างน้อย 1 วัน = true)
  - `endDate` optional (null = ทำซ้ำไม่สิ้นสุด)
- ถ้า `isRepeat = false`:
  - `shiftId` ต้องเป็น `null` (เพราะ shift หลากหลายจะอยู่ที่ EmployeeShift)
  - `repeatDays` ต้องเป็น `null`
  - `endDate` required
  - `startDate ≤ endDate`
- `status` flow: `DRAFT → ACTIVE → (PAUSED/COMPLETED/CANCELLED)`

---

### 2.3 AssignmentEmployee (Join Table)

> พนักงานที่ถูกรวมในรอบการวางแผน — แยกออกมาเพราะ M:N

| Field          | Type      | Required | Description            |
| -------------- | --------- | -------- | ---------------------- |
| `id`           | UUID      | ✓        |                        |
| `assignmentId` | UUID      | ✓        | FK → ShiftAssignment   |
| `employeeId`   | UUID      | ✓        | FK → Employee          |
| `shiftId`      | UUID      | –        | FK → Shift — Repeat: copy จาก `ShiftAssignment.shiftId` / No Repeat: `null` |
| `addedAt`      | timestamp | ✓        | วันที่ถูกเพิ่มเข้ารอบ  |
| `removedAt`    | timestamp | –        | วันที่ถูกถอดออก (soft) |

**Business Rules:**

- Unique constraint `(assignmentId, employeeId)` เมื่อ `removedAt IS NULL`
- ถ้า `removedAt` ถูก set → EmployeeShift ของพนักงานคนนี้ในรอบนี้ที่ยังไม่ผ่านมา จะถูกยกเลิก
- `shiftId` Invariant ผูกกับ `ShiftAssignment.isRepeat`:
  - ถ้า assignment เป็น Repeat → ทุก AssignmentEmployee.shiftId = `ShiftAssignment.shiftId` (เหมือนกันทั้งรอบ)
  - ถ้า assignment เป็น No Repeat → AssignmentEmployee.shiftId = `null` (กะกระจายอยู่ที่ EmployeeShift รายวัน)
- **ทำไม denormalize?** เพื่อ query "พนักงานคนนี้อยู่ในรอบไหน + ใช้กะอะไรเป็นหลัก" โดยไม่ต้อง join ผ่าน shift_assignment ทุกครั้ง (ช่วยเรื่อง performance ในหน้า dashboard/reports)

---

### 2.4 EmployeeShift (กะของพนักงานในแต่ละวัน)

> **Domain เนื้อหลัก** — record รายวันที่ระบุว่า "พนักงาน X ทำกะ Y วันที่ Z"

| Field             | Type      | Required | Description                                                                      |
| ----------------- | --------- | -------- | -------------------------------------------------------------------------------- |
| `id`              | UUID      | ✓        |                                                                                  |
| `employeeId`      | UUID      | ✓        | FK → Employee                                                                    |
| `shiftId`         | UUID      | ✓        | FK → Shift                                                                       |
| `assignmentId`    | UUID      | –        | FK → ShiftAssignment (null = สร้างเดี่ยวไม่ผ่าน assignment)                      |
| `workDate`        | date      | ✓        | วันที่ทำงาน                                                                      |
| `skippedReason`   | enum?     | –        | `HOLIDAY` / `LEAVE` / null — บันทึกเหตุที่ถูก skip (ถ้ามี)                       |
| `actualStartTime` | datetime  | –        | override `Shift.startTime` ถ้าวันนั้นเริ่มไม่ตรง                                 |
| `actualEndTime`   | datetime  | –        | override `Shift.endTime`                                                         |
| `status`          | enum      | ✓        | `SCHEDULED` / `CONFIRMED` / `IN_PROGRESS` / `COMPLETED` / `MISSED` / `CANCELLED` |
| `checkInAt`       | timestamp | –        | เวลาเข้างานจริง                                                                  |
| `checkOutAt`      | timestamp | –        | เวลาออกงานจริง                                                                   |
| `notes`           | text      | –        | หมายเหตุ                                                                         |
| `createdAt`       | timestamp | ✓        |                                                                                  |
| `updatedAt`       | timestamp | ✓        |                                                                                  |

**Business Rules:**

- Composite index: `(employeeId, workDate)` สำหรับ query เร็ว
- **อนุญาตให้ 1 พนักงาน + 1 วัน มีหลาย EmployeeShift** (รองรับการทำหลายกะใน 1 วัน เช่น กะเช้า + โอที)
- แต่ต้อง validate: ช่วงเวลาของแต่ละกะใน `(employeeId, workDate)` เดียวกัน **ห้ามทับซ้อน** (หรือถ้าทับซ้อนต้องเป็น "intentional overlap" — แจ้ง warning ไม่ block)
- **Skip เมื่อวันนั้นตรงกับวันหยุดบริษัท** — ตรวจผ่าน `HolidayProvider.isHoliday(workDate)` ก่อน INSERT ทุกครั้ง → ถ้าใช่ ข้ามพนักงาน**ทุกคน**ในวันนั้น
- **Skip เมื่อพนักงานคนนั้นลาในวันนั้น** — ตรวจผ่าน `LeaveProvider.isOnLeave(employeeId, workDate)` → ถ้าใช่ ข้ามเฉพาะพนักงานคนนั้น คนอื่นยังสร้างปกติ
- Priority: `HOLIDAY` ตรวจก่อน `LEAVE` — ถ้าเป็นวันหยุดบริษัทก็ข้ามทันทีโดยไม่ต้องเช็ค leave
- เมื่อ Shift Assignment ถูก cancel → EmployeeShift ที่ยังเป็น `SCHEDULED` ถูก cancel ด้วย, ที่ `COMPLETED` แล้วไม่แตะ

---

### 2.5 Employee (พนักงาน)

> Aggregate ภายนอก domain นี้ — อ้างถึงเท่านั้น ไม่ได้ดีไซน์ field ครบที่นี่

| Field                    | Type   | Description                          |
| ------------------------ | ------ | ------------------------------------ |
| `id`                     | UUID   |                                      |
| `employeeNo`             | string | รหัสพนักงาน                          |
| `firstName` / `lastName` | string |                                      |
| `departmentId`           | UUID   | FK → Department                      |
| `positionId`             | UUID   | FK → Position                        |
| `status`                 | enum   | `ACTIVE` / `ON_LEAVE` / `TERMINATED` |
| ...                      |        |                                      |

**ที่เกี่ยวกับ Shift Planning:** เฉพาะ `status = ACTIVE` เท่านั้นที่ assign กะได้

---

### 2.6 External Interfaces (Read-Only)

> Shift Planning module **ไม่ own** ข้อมูลต่อไปนี้ — ดึงผ่าน interface เพื่อ skip การสร้าง EmployeeShift เท่านั้น

**HolidayProvider Interface**

```typescript
interface HolidayProvider {
  // ดึงวันหยุดบริษัททั้งหมดในช่วงที่กำหนด (batch query เพื่อประสิทธิภาพ)
  getHolidaysInRange(from: Date, to: Date, orgId: string): Promise<Set<string>>
  // ตัวอย่าง return: Set { "2026-01-01", "2026-04-13", "2026-04-14" }
}
```

**LeaveProvider Interface**

```typescript
interface LeaveProvider {
  // ดึงวันลาที่ APPROVED ของพนักงานหลายคนในช่วงที่กำหนด (batch query)
  getApprovedLeavesByRange(
    employeeIds: string[],
    from: Date,
    to: Date
  ): Promise<Map<string, Set<string>>>
  // ตัวอย่าง return: Map {
  //   "empA" => Set { "2026-06-05", "2026-06-06" },
  //   "empC" => Set { "2026-06-10" }
  // }
}
```

> **ทำไม batch query?** — Loop วัน × พนักงานถ้าเรียก API ทีละรายจะช้ามาก
> ควร query ทั้งช่วง `startDate → generateUntil` ในครั้งเดียวก่อน loop แล้วใช้ Set lookup O(1)

---

## 3. Enumerations

```typescript
enum AssignmentStatus {
  DRAFT       = 'DRAFT',        // กำลังร่าง ยังไม่ activate
  ACTIVE      = 'ACTIVE',       // มีผลใช้งาน
  PAUSED      = 'PAUSED',       // หยุดชั่วคราว (cron ไม่ generate ต่อ)
  COMPLETED   = 'COMPLETED',    // ถึง endDate แล้ว
  CANCELLED   = 'CANCELLED'     // ยกเลิก
}

enum EmployeeShiftStatus {
  SCHEDULED   = 'SCHEDULED',    // ถูกสร้างแล้ว รอวันทำงาน
  CONFIRMED   = 'CONFIRMED',    // พนักงานยืนยันแล้ว (optional)
  IN_PROGRESS = 'IN_PROGRESS',  // กำลังทำงานอยู่ (check-in แล้ว)
  COMPLETED   = 'COMPLETED',    // จบกะแล้ว
  MISSED      = 'MISSED',       // ไม่มาทำงาน
  CANCELLED   = 'CANCELLED'     // ยกเลิก
}

enum SkippedReason {
  HOLIDAY = 'HOLIDAY',  // วันหยุดบริษัท (ข้ามทุกคนในวันนั้น)
  LEAVE   = 'LEAVE'     // พนักงานคนนั้นลา APPROVED (ข้ามเฉพาะคน)
  // null = สร้างปกติ ไม่มีการ skip
}

enum DayOfWeek {
  MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6
}
```

---

## 4. Aggregate Boundaries (DDD)

```
┌─────────────────────────────────────────────┐
│         ShiftAssignment Aggregate           │
│  (Root: ShiftAssignment)                    │
│  ─────────────────────────────              │
│  • ShiftAssignment                          │
│  • AssignmentEmployee[]                     │
│  • EmployeeShift[] (managed by assignment)  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           Shift Aggregate (Template)         │
│  (Root: Shift)                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              Employee Aggregate              │
│  (Root: Employee) — external context        │
└─────────────────────────────────────────────┘
```

**กฎสำคัญ:**

- การแก้ EmployeeShift ต้องผ่าน ShiftAssignment เสมอ (ยกเว้นการ check-in/out ที่อาจเป็น operation แยก)
- การลบ Shift template ห้ามทำถ้ามี EmployeeShift อ้างอิงในอนาคต — ใช้ soft toggle `isActive = false` แทน

---

## 5. Database Schema (PostgreSQL)

```sql
-- ============== SHIFT ==============
CREATE TABLE shift (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(50) NOT NULL,
  code            VARCHAR(20) NOT NULL UNIQUE,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   INT  NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  break_start_time TIME,
  color           VARCHAR(7) NOT NULL,
  work_minutes    INT  NOT NULL,
  crosses_midnight BOOLEAN GENERATED ALWAYS AS (end_time < start_time) STORED,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shift_time_diff CHECK (start_time <> end_time)
);

CREATE INDEX idx_shift_active ON shift(is_active);


-- ============== SHIFT ASSIGNMENT ==============
CREATE TYPE assignment_status AS ENUM
  ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED');

CREATE TABLE shift_assignment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100),
  is_repeat         BOOLEAN NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  shift_id          UUID REFERENCES shift(id),
  repeat_days       JSONB,    -- e.g. [true,true,true,true,true,false,false]
  last_generated_at DATE,
  warning_sent_at   DATE,     -- วันที่ส่ง expiry warning ล่าสุด (No Repeat)
  status            assignment_status NOT NULL DEFAULT 'DRAFT',
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT date_order   CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT repeat_rules CHECK (
    (is_repeat = true  AND shift_id IS NOT NULL AND repeat_days IS NOT NULL)
    OR
    (is_repeat = false AND shift_id IS NULL     AND repeat_days IS NULL AND end_date IS NOT NULL)
  )
);

CREATE INDEX idx_sa_repeat_active
  ON shift_assignment(is_repeat, status)
  WHERE is_repeat = true AND status = 'ACTIVE';

CREATE INDEX idx_sa_norepeat_expiring
  ON shift_assignment(end_date)
  WHERE is_repeat = false AND status = 'ACTIVE' AND end_date IS NOT NULL;


-- ============== ASSIGNMENT × EMPLOYEE ==============
CREATE TABLE assignment_employee (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES shift_assignment(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL,
  shift_id      UUID REFERENCES shift(id),  -- Repeat: ค่าเดียวกับ shift_assignment.shift_id / No Repeat: NULL
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_ae_unique_active
  ON assignment_employee(assignment_id, employee_id)
  WHERE removed_at IS NULL;


-- ============== EMPLOYEE SHIFT ==============
CREATE TYPE employee_shift_status AS ENUM
  ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','MISSED','CANCELLED');

CREATE TABLE employee_shift (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL,
  shift_id          UUID NOT NULL REFERENCES shift(id),
  assignment_id     UUID REFERENCES shift_assignment(id) ON DELETE SET NULL,
  work_date         DATE NOT NULL,
  actual_start_time TIMESTAMPTZ,
  actual_end_time   TIMESTAMPTZ,
  status            employee_shift_status NOT NULL DEFAULT 'SCHEDULED',
  check_in_at       TIMESTAMPTZ,
  check_out_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_es_employee_date ON employee_shift(employee_id, work_date);
CREATE INDEX idx_es_assignment    ON employee_shift(assignment_id);
CREATE INDEX idx_es_status_date   ON employee_shift(status, work_date);

-- ป้องกัน duplicate ของกะเดียวกัน + พนักงานเดียวกัน + วันเดียวกัน
-- (อนุญาตหลายกะใน 1 วันได้ ตราบใดที่ shift ต่างกัน)
CREATE UNIQUE INDEX idx_es_no_duplicate
  ON employee_shift(employee_id, work_date, shift_id)
  WHERE status NOT IN ('CANCELLED');
```

---

## 6. Business Logic & Invariants

### 6.0 System Configuration

```typescript
SystemConfig {
  shift_generation_window_days:        25       // จำนวนวันที่สร้าง EmployeeShift ล่วงหน้า (Repeat mode)
  cron_daily_check_time:               "01:00"  // เวลาที่ cron รันทุกวัน
  norepeat_expiry_warning_days:        7        // แจ้งเตือนก่อน No Repeat assignment ถึง endDate (วัน)
  norepeat_expiry_check_time:          "08:00"  // เวลาที่ cron แจ้งเตือนรันทุกวัน
}
```

> เก็บใน table `system_config` หรือ environment variable — admin ปรับได้โดยไม่ต้อง redeploy
> ค่า default: generation window = `25` วัน, expiry warning = `7` วัน

---

### 6.1 การสร้าง ShiftAssignment

**Mode: Repeat**

```
Input: {
  shiftId, employeeIds[], startDate, endDate?,
  repeatDays[7], isRepeat = true
}

1. Validate:
   - shiftId มีอยู่จริงและ isActive = true
   - employeeIds ทุกคน status = ACTIVE
   - repeatDays มีอย่างน้อย 1 วันที่ true
   - endDate >= startDate (ถ้ามี)

2. Begin Transaction:
   a. INSERT shift_assignment (isRepeat=true, status='ACTIVE', shiftId=shiftId, ...)
   b. INSERT assignment_employee × N  (ทุก record ใส่ shift_id = shiftId ของ assignment)

   c. คำนวณ generation window:
      windowDays = config.shift_generation_window_days   // default 25
      targetDate = startDate + windowDays - 1

      if (endDate == null) {
        generateUntil = targetDate
      } else if (endDate < targetDate) {
        generateUntil = endDate
      } else {
        generateUntil = targetDate
      }

   d. **Pre-fetch ข้อมูลก่อน loop (batch query ครั้งเดียว)**
      holidays  = HolidayProvider.getHolidaysInRange(startDate, generateUntil, orgId)
      leaveMap  = LeaveProvider.getApprovedLeavesByRange(employeeIds, startDate, generateUntil)

   e. Loop date จาก startDate ถึง generateUntil:
      - if dayOfWeek(date) ไม่อยู่ใน repeatDays → ข้าม
      - if holidays.has(date) → ข้ามทุกคน (วันหยุดบริษัท)
      - Loop ทุก employee:
          - if leaveMap.get(empId)?.has(date) → ข้ามเฉพาะคนนี้ (วันลา)
          - else → INSERT employee_shift (status='SCHEDULED')

   f. UPDATE shift_assignment.last_generated_at = generateUntil

   g. ถ้า generateUntil = endDate → UPDATE status = 'COMPLETED'

3. Commit
```

**ตัวอย่าง:** (windowDays = 25)

| Case              | startDate | endDate  | targetDate (start+24) | endDate ใกล้กว่า?  | generateUntil | จำนวนวันที่สร้าง | status        |
| ----------------- | --------- | -------- | --------------------- | ------------------ | ------------- | ---------------- | ------------- |
| A — ไม่มี endDate | 01/01/69  | `null`   | 25/01/69              | –                  | **25/01/69**  | 25 วัน           | ACTIVE        |
| B — endDate ไกล   | 01/01/69  | 05/05/69 | 25/01/69              | ❌ (05/05 > 25/01) | **25/01/69**  | 25 วัน           | ACTIVE        |
| C — endDate ใกล้  | 01/01/69  | 15/01/69 | 25/01/69              | ✓ (15/01 < 25/01)  | **15/01/69**  | 15 วัน           | **COMPLETED** |

> **อ่านง่ายๆ:** เลือกวันที่มาถึงก่อนระหว่าง "targetDate" และ "endDate" ถ้าไม่มี endDate ก็ใช้ targetDate
> Case C `endDate < targetDate` → สร้างจบในครั้งเดียว set status = `COMPLETED` เลย ไม่ต้องรอ cron

**Mode: No Repeat**

```
Input: {
  employeeIds[], startDate, endDate,
  isRepeat = false,
  cellShifts: { "empId_dateOffset": [shiftId, shiftId, ...] }
}

1. Validate:
   - มี cellShifts อย่างน้อย 1 entry
   - endDate >= startDate
   - แต่ละ shift ใน cell เดียวกัน ห้ามซ้ำกัน (UI ก็ block อยู่)
   - Warning ถ้าช่วงเวลาทับซ้อน (เช่น 08-16 + 14-22)

2. Begin Transaction:
   a. INSERT shift_assignment (isRepeat=false, shiftId=null, repeatDays=null, status='ACTIVE')
   b. INSERT assignment_employee × N  (ทุก record ใส่ shift_id = NULL)

   c. **Pre-fetch ข้อมูลก่อน loop (batch query ครั้งเดียว)**
      holidays = HolidayProvider.getHolidaysInRange(startDate, endDate, orgId)
      leaveMap = LeaveProvider.getApprovedLeavesByRange(employeeIds, startDate, endDate)

   d. Loop cellShifts:
      - workDate = startDate + dateOffset
      - if holidays.has(workDate) → ข้ามทั้ง cell (ทุก shift ในวันนั้น)
      - For each shiftId in cell:
          - if leaveMap.get(empId)?.has(workDate) → ข้ามเฉพาะ shift นี้
          - else → INSERT employee_shift (status='SCHEDULED')

3. Commit
```

> **No Repeat ไม่ต้องใช้ cron** เพราะกะทุกตัวระบุชัดเจนตอนสร้าง → INSERT จบในครั้งเดียว
> `last_generated_at` ของ No Repeat ตั้งเป็น `endDate` เลย เพื่อให้ cron มองข้าม

---

### 6.2 Cronjob — Daily Check & Generate

```
Trigger: ทุกวัน เวลา 01:00 (config: cron_daily_check_time)

1. windowDays = config.shift_generation_window_days   // default 25
   today      = current date

2. SELECT * FROM shift_assignment
   WHERE is_repeat = true
     AND status    = 'ACTIVE'
     AND last_generated_at IS NOT NULL
     AND last_generated_at <= today           -- ถึงเวลาต้อง generate ต่อแล้ว
     AND (end_date IS NULL OR last_generated_at < end_date)  -- ยังไม่ครบ

3. For each assignment:
   a. fromDate   = last_generated_at + 1
   b. targetDate = today + windowDays - 1     -- generate ล่วงหน้าจาก "วันนี้" ไป windowDays

      // เลือกอันที่มาถึงก่อน
      if (end_date == null) {
        generateUntil = targetDate
      } else if (end_date < targetDate) {
        generateUntil = end_date               // endDate ใกล้กว่า → clamp
      } else {
        generateUntil = targetDate
      }

   c. SELECT employee_ids FROM assignment_employee
      WHERE assignment_id = ? AND removed_at IS NULL

   d. **Pre-fetch ข้อมูลก่อน loop (batch query ครั้งเดียว)**
      holidays = HolidayProvider.getHolidaysInRange(fromDate, generateUntil, orgId)
      leaveMap = LeaveProvider.getApprovedLeavesByRange(employee_ids, fromDate, generateUntil)

   e. Loop date from fromDate to generateUntil:
      - if dayOfWeek(date) ไม่อยู่ใน repeat_days → ข้าม
      - if holidays.has(date) → ข้ามทุกคน (วันหยุดบริษัท)
      - Loop ทุก employee:
          - if leaveMap.get(empId)?.has(date) → ข้ามเฉพาะคนนี้ (วันลา)
          - else → INSERT employee_shift (status='SCHEDULED')

   f. UPDATE last_generated_at = generateUntil

   g. ถ้า generateUntil = end_date → UPDATE status = 'COMPLETED'

4. Log + Alert ถ้ามี error
```

**ตัวอย่างการทำงานของ Cron:**

> สมมติ windowDays = 25, สร้าง Assignment วันที่ 01/06/68, endDate = `null`

| วันที่ cron รัน | last_generated_at เดิม | trigger?                       | fromDate | generateUntil                                                  | last_generated_at ใหม่ |
| --------------- | ---------------------- | ------------------------------ | -------- | -------------------------------------------------------------- | ---------------------- |
| 02/06           | 25/06                  | ❌ ไม่ trigger (25/06 > 02/06) | –        | –                                                              | –                      |
| 10/06           | 25/06                  | ❌ ไม่ trigger                 | –        | –                                                              | –                      |
| 25/06           | 25/06                  | ✓ trigger (25/06 ≤ 25/06)      | 26/06    | 19/07 (25/06 + 25 − 1 → calc from today 25/06: 25/06+24=19/07) | 19/07                  |
| 19/07           | 19/07                  | ✓ trigger                      | 20/07    | 12/08                                                          | 12/08                  |

**Case ที่มี endDate:**

> Assignment: startDate=01/06, endDate=30/05/69 (อีก 11 เดือน), windowDays=25

| วันที่ cron | last_generated_at | endDate  | generateUntil = MIN(today+24, endDate) | last_generated_at ใหม่ | status        |
| ----------- | ----------------- | -------- | -------------------------------------- | ---------------------- | ------------- |
| 25/06       | 25/06             | 30/05/69 | 19/07                                  | 19/07                  | ACTIVE        |
| ...         | ...               | ...      | ...                                    | ...                    | ACTIVE        |
| 05/05/69    | 30/04/69          | 30/05/69 | MIN(29/05, 30/05) = 29/05              | 29/05/69               | ACTIVE        |
| 29/05/69    | 29/05/69          | 30/05/69 | MIN(22/06, 30/05) = **30/05**          | 30/05/69               | **COMPLETED** |

> **ตัวอย่างจาก requirement** — วันนี้ 28/05, endDate = 30/05:
>
> - `last_generated_at` < 30/05 → ยัง active
> - `fromDate = last_generated_at + 1`
> - `generateUntil = MIN(28/05 + 24, 30/05) = 30/05` ← ถูก clamp ที่ endDate
> - หลัง generate → `last_generated_at = 30/05` → status = `COMPLETED`

### 6.3 การเพิ่มพนักงานใหม่ใน Assignment (Edit)

> เมื่อแก้ Assignment โดยเพิ่มพนักงานที่ยังไม่อยู่ในรอบ ระบบต้อง **backfill EmployeeShift** ให้พนักงานคนนั้นทันที โดยใช้ snapshot เดียวกับที่คนอื่นมีอยู่แล้ว

**Mode: Repeat — Add Employee**

```
Input: { assignmentId, employeeId }

1. Validate:
   - assignmentId มีอยู่ + status = 'ACTIVE'
   - assignment.isRepeat = true
   - employee status = ACTIVE
   - assignment_employee (assignmentId, employeeId, removed_at IS NULL) ยังไม่มี

2. Begin Transaction:
   a. INSERT assignment_employee {
        assignmentId, employeeId,
        shiftId = assignment.shiftId,    -- copy จาก parent (Repeat → มีค่า)
        addedAt = now()
      }

   b. คำนวณช่วง backfill:
      backfillFrom = MAX(assignment.start_date, today)
      backfillTo   = assignment.last_generated_at

      เหตุผล:
      - ใช้ today เพื่อ "ไม่สร้างย้อนหลังในอดีต" (ไม่มีประโยชน์ — กะผ่านไปแล้ว)
      - ใช้ last_generated_at เป็น upper bound เพื่อให้สอดคล้องกับคนอื่นในรอบ

   c. **Pre-fetch ข้อมูลก่อน loop**
      holidays = HolidayProvider.getHolidaysInRange(backfillFrom, backfillTo, orgId)
      leaveMap = LeaveProvider.getApprovedLeavesByRange([employeeId], backfillFrom, backfillTo)

   d. Loop date from backfillFrom to backfillTo:
      - if dayOfWeek(date) ไม่อยู่ใน assignment.repeat_days → ข้าม
      - if holidays.has(date) → ข้าม (วันหยุดบริษัท)
      - if leaveMap.get(employeeId)?.has(date) → ข้าม (พนักงานลา)
      - else → INSERT employee_shift {
          employeeId, shiftId = assignment.shift_id,
          assignmentId, workDate = date, status = 'SCHEDULED'
        }

3. Commit
4. Emit event: EmployeeAddedToAssignment { assignmentId, employeeId, backfilledCount }
```

> **ทำไมไม่ backfill ย้อนหลัง?** เพราะกะของอดีตคนใหม่ยังไม่ได้ทำ — สร้างไปก็เป็น `MISSED` ทันที ผิดเจตนา
> **Cron รายวันยังทำงานเหมือนเดิม** — รอบถัดไป cron จะ generate EmployeeShift ของพนักงานใหม่คนนี้ไปต่อพร้อมคนอื่นในรอบเอง

**Mode: No Repeat — Add Employee**

```
Input: { assignmentId, employeeId, cellShifts: { dateOffset: [shiftId, ...] } }

1. Validate ทำนองเดียวกัน
2. UI: เปิดตาราง grid แสดงแค่ row ของพนักงานใหม่คนนี้ ให้ผู้ใช้กำหนดกะรายวัน
3. หลังกดยืนยัน:
   a. INSERT assignment_employee { assignmentId, employeeId, shiftId = NULL, addedAt = now() }
   b. Loop cellShifts:
      - For each shiftId: INSERT employee_shift
```

> **ความต่าง:** No Repeat ไม่มี shift template + repeatDays กลาง → ผู้ใช้ต้องระบุกะรายวันของคนใหม่เอง คล้ายตอนสร้างครั้งแรกแต่จำกัดเฉพาะพนักงานคนนั้น

---

### 6.4 Cronjob — Expiry Warning (No Repeat)

> เนื่องจาก No Repeat มี endDate ที่แน่นอน เมื่อใกล้ถึง endDate ระบบควรแจ้งเตือนผู้ดูแลให้สร้างรอบต่อไป (กันลืม)

```
Trigger: ทุกวัน เวลา 08:00 (config: norepeat_expiry_check_time)

1. warningDays = config.norepeat_expiry_warning_days  // default 7
   today       = current date
   threshold   = today + warningDays

2. SELECT * FROM shift_assignment
   WHERE is_repeat = false
     AND status    = 'ACTIVE'
     AND end_date IS NOT NULL
     AND end_date >= today              -- ยังไม่หมดอายุ
     AND end_date <= threshold          -- ใกล้หมดอายุ (ภายใน N วัน)
     AND (warning_sent_at IS NULL       -- ยังไม่เคยส่ง
          OR warning_sent_at < today)   -- หรือเคยส่งก่อนวันนี้ (กัน duplicate)

3. For each assignment:
   a. ส่ง notification หา assignment.created_by + admin
      "Assignment '{name}' จะหมดอายุในวันที่ {endDate} ({daysLeft} วันข้างหน้า) กรุณาสร้างรอบใหม่"
   b. UPDATE shift_assignment.warning_sent_at = today

4. (Optional) ส่ง warning ระดับวิกฤต ถ้า daysLeft <= 1
```

**ทำไม cron แยก 08:00 จาก 01:00?**

- 01:00 = generation (heavy I/O) — รันตอนคนนอนเพราะใช้ทรัพยากร
- 08:00 = notification — รันตอนคนเริ่มทำงาน เห็น noti ทันทีตอนเช็คอีเมล/แอป

> **เพิ่ม field ใหม่ใน schema:** `shift_assignment.warning_sent_at` (DATE, nullable) — เก็บวันที่ส่ง warning ล่าสุด

---

### 6.5 การแก้ไข Assignment (Edit Operations)

**Add Employee:**

- See section 6.3

**Remove Employee:**

- UPDATE assignment_employee.removed_at = now()
- DELETE/Cancel EmployeeShift ที่ work_date >= today AND status = 'SCHEDULED'
- ของวันที่ผ่านมา (COMPLETED, MISSED) ไม่แตะ

**Change Shift Time (เฉพาะ Shift template):**

- ไม่กระทบ EmployeeShift ที่สร้างไปแล้ว (เพราะ EmployeeShift ใช้ snapshot จาก Shift ผ่าน FK)
- แต่ EmployeeShift ใหม่ที่จะถูก generate จะใช้ค่าใหม่
- _(หรือ design ทางเลือก: copy startTime/endTime ลงใน EmployeeShift ด้วย เพื่อแยก snapshot ชัดเจน)_

---

## 7. Edge Cases ที่ Domain ต้องจัดการ

| Case                                                                | Domain Rule                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| พนักงานคนเดียวกัน 2 กะใน 1 วัน (กะเช้า + โอที)                      | ✓ อนุญาต ผ่าน composite key                                                                                                                |
| ช่วงเวลา 2 กะใน cell เดียวกัน **ทับซ้อน**                           | ⚠️ Warning ไม่ block — บางองค์กรอาจตั้งใจ                                                                                                  |
| กะข้ามวัน (22:00 → 06:00)                                           | จัดเก็บ `crosses_midnight = true` — workDate = วันที่เริ่ม                                                                                 |
| ลบ Shift template ที่มี EmployeeShift อ้างอิง                       | ❌ Reject — soft toggle เท่านั้น                                                                                                           |
| **วัน workDate ตรงกับวันหยุดบริษัท** 🆕                             | Skip ทุกคนในวันนั้น — ตรวจผ่าน `HolidayProvider` ก่อน INSERT                                                                               |
| **พนักงาน A ลา APPROVED วันที่ workDate** 🆕                        | Skip เฉพาะพนักงาน A — คนอื่นในรอบยังสร้างปกติ                                                                                              |
| **HolidayProvider หรือ LeaveProvider ตอบไม่ได้ (timeout/error)** 🆕 | ทางเลือก 1: ยกเลิก transaction ทั้งหมด + retry. ทางเลือก 2: สร้าง EmployeeShift ต่อไปก่อน แล้ว flag ว่า "ยังไม่ได้ validate holiday/leave" |
| **พนักงานยื่นลาหลังจาก EmployeeShift ถูกสร้างไปแล้ว** 🆕            | Leave Request Module ควรส่ง event กลับมา → Shift Planning cancel EmployeeShift ที่ตรงวันลา (optional integration)                          |
| Cron fail/skip — ยังไม่ generate 1 เดือน                            | Buffer 5 วัน (cron 25 วัน + generate 30 วัน) ป้องกันช่องว่าง                                                                               |
| พนักงาน status → TERMINATED                                         | EmployeeShift ในอนาคต cancel auto                                                                                                          |
| 2 assignment สร้างกะให้พนักงานคนเดียวกัน วันเดียวกัน กะเดียวกัน     | ❌ Reject ผ่าน unique index                                                                                                                |

---

## 8. Domain Events

```typescript
// Events ที่ระบบยิงออกมา (สำหรับ notification, audit, integration)

ShiftAssignmentCreated   { assignmentId, isRepeat, employeeCount }
ShiftAssignmentCompleted { assignmentId }
ShiftAssignmentCancelled { assignmentId, reason }
ShiftAssignmentExpiring  { assignmentId, endDate, daysLeft }   // ใกล้หมดอายุ — สำหรับ noti

EmployeeShiftCreated     { shiftId, employeeId, workDate }
EmployeeShiftCancelled   { shiftId, reason }
EmployeeShiftCompleted   { shiftId, checkInAt, checkOutAt, lateMinutes }

EmployeeAddedToAssignment    { assignmentId, employeeId, backfilledCount }
EmployeeRemovedFromAssignment{ assignmentId, employeeId, cancelledCount }

RepeatGenerationExecuted { assignmentId, generatedCount, until }
RepeatGenerationFailed   { assignmentId, error }
```

---

## 9. Service / Use Case Layer (สรุป API)

```
ShiftService
├── createShift(dto)
├── updateShift(id, dto)
├── deactivateShift(id)
└── listShifts(filter)

ShiftAssignmentService
├── createRepeatAssignment(dto)         // Mode Repeat
├── createNoRepeatAssignment(dto)       // Mode No Repeat  (รับ cellShifts)
├── pauseAssignment(id)
├── resumeAssignment(id)
├── cancelAssignment(id, reason)
├── addEmployee(assignmentId, employeeId, cellShifts?)  // backfill auto
├── removeEmployee(assignmentId, employeeId)
├── listExpiringAssignments(daysAhead)   // สำหรับ dashboard
└── getAssignment(id)

EmployeeShiftService
├── listByEmployee(employeeId, dateRange)
├── listByDateRange(dateRange, filter)  // ตาราง grid view
├── upsertCellShifts(assignmentId, cells) // แก้ grid ภายหลัง
├── cancelShift(id)
├── checkIn(shiftId, time)
├── checkOut(shiftId, time)
└── getDailyView(date)

RepeatGenerationJob (Cron)
└── execute()  // วน assignment ที่ active + isRepeat — รันทุกวัน 01:00

NoRepeatExpiryWarningJob (Cron)
└── execute()  // เตือน assignment ที่ active + !isRepeat + ใกล้ endDate — รันทุกวัน 08:00
```

---

## 10. ข้อสังเกตและการขยายในอนาคต

1. **Snapshot vs Reference** — ตอนนี้ `EmployeeShift.shiftId` เป็น reference ถ้า Shift template ถูกแก้ก็จะกระทบทั้งหมด → อาจ design snapshot `start_time_snapshot`, `end_time_snapshot` ใน EmployeeShift ถ้าต้องการ immutability
2. **Holiday / Leave integration** — ควรมี `Holiday` และ `LeaveRequest` table ที่ override การสร้าง EmployeeShift
3. **Constraint conflict detection** — เช่น "ห้ามทำกะดึกแล้วต่อกะเช้าวันถัดมา" ควรมี rule engine แยก
4. **Audit log** — ทุก mutation ของ EmployeeShift ควรเก็บลง `employee_shift_history` (who, when, before, after)
5. **Multi-tenant** — ทุก table ควรมี `organization_id` ถ้าระบบรองรับหลายบริษัท
6. **Time zone** — ใช้ `TIMESTAMPTZ` ทุกที่ และเก็บ `Employee.timezone` ถ้าทีมงานอยู่หลาย timezone
7. **Soft delete** — เพิ่ม `deleted_at` ใน Shift, Assignment เพื่อทำ soft delete แทน hard delete
