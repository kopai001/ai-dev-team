# Flow การทำงาน: หน้าวางแผนการทำงานพนักงาน (Shift Planning)

## 1. ภาพรวม Domain Model

```
┌──────────────────┐          ┌─────────────────────────┐          ┌────────────────────┐
│      Shift       │          │   Shift Assignment      │          │  Employee Shift    │
│ (กะการทำงาน)     │          │   (รอบการวางแผน)        │          │  (กะของแต่ละคน/วัน) │
├──────────────────┤          ├─────────────────────────┤  สร้าง   ├────────────────────┤
│ id               │◄─────────│ id                      │─────────►│ id                 │
│ name             │          │ name                    │          │ employeeId         │
│ startTime        │          │ isRepeat                │          │ shiftId            │
│ endTime          │          │ startDate               │          │ assignmentId (ref) │
│ breakMinutes     │          │ endDate (nullable)      │          │ workDate           │
│ color            │          │ shiftId (เฉพาะ Repeat)  │          │ status             │
└──────────────────┘          │ repeatDays[]            │          └────────────────────┘
       ▲                      │ lastGeneratedAt         │
       │                      │ warningSentAt           │   ┌──────────────────────────┐
       │                      │ status                  │◄──│ AssignmentEmployee       │
       │                      └─────────────────────────┘   │ (พนักงานในรอบ M:N)       │
       │                          ▲             ▲           ├──────────────────────────┤
       │                          │             │           │ assignmentId             │
       │                ┌─────────┴────┐  ┌─────┴──────────┐│ employeeId               │
       │                │ Cron 01:00   │  │ Cron 08:00     ││ shiftId? ← Repeat:copy,  │
       │                │ Generate     │  │ Expiry Warning ││            No Repeat:null│
       │                │ (Repeat)     │  │ (No Repeat)    ││ addedAt / removedAt?     │
       │                └──────────────┘  └────────────────┘└──────────────────────────┘
       │                                                              │
       └──────────────────────────────────────────────────────────────┘
                            (shiftId → Shift.id เฉพาะ Repeat)
```

**`shiftId` เก็บที่ไหนบ้าง:**
- **ShiftAssignment.shiftId** — Repeat: มีค่า (กะกลางของรอบ) / No Repeat: `null`
- **AssignmentEmployee.shiftId** — Repeat: copy จาก `ShiftAssignment.shiftId` (denormalized) / No Repeat: `null`
- **EmployeeShift.shiftId** — เก็บเสมอ (กะที่จะทำจริง รายวัน)

**ความสัมพันธ์:**
- 1 Shift Assignment → N Employee Shift (แตกย่อยเป็นรายคน × รายวัน × รายกะ)
- 1 พนักงาน + 1 วัน สามารถมี EmployeeShift ได้หลายตัว (เช่น กะเช้า + กะเย็น วันเดียวกัน)
- `isRepeat = true`: cron รันทุกวัน 01:00 → ทยอยสร้าง EmployeeShift ล่วงหน้า `windowDays` วัน (default 25, config ได้)
- `isRepeat = false`: สร้าง EmployeeShift ครบในครั้งเดียว + cron รันทุกวัน 08:00 แจ้งเตือนก่อน endDate `warningDays` วัน (default 7, config ได้)

**System Config (ปรับได้):**
| Key | Default | คำอธิบาย |
|---|---|---|
| `shift_generation_window_days` | 25 | จำนวนวันที่ generate ล่วงหน้า (Repeat) |
| `cron_daily_check_time` | 01:00 | เวลา cron generation รัน |
| `norepeat_expiry_warning_days` | 7 | เตือนก่อน endDate กี่วัน (No Repeat) |
| `norepeat_expiry_check_time` | 08:00 | เวลา cron warning รัน |

---

## 2. User Flow ภาพรวม

```
   เข้าหน้า "วางแผนการทำงาน"
            │
            ▼
   ┌─────────────────────┐
   │  Step 1: เลือกประเภท │   ← จุดสำคัญ: เปลี่ยน UI ด้านล่างตามที่เลือก
   └─────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
  Repeat        No Repeat
(ทำซ้ำ)         (เฉพาะช่วง)
     │             │
     ▼             ▼
 [Flow A]      [Flow B]

   ────────────────────────────────────
   หลังจาก Assignment ถูกสร้างแล้ว:
   ────────────────────────────────────

   [Flow C] Edit Assignment (เพิ่ม/ลบ พนักงาน)  ← ใช้ได้ทั้ง Repeat & No Repeat
   [Flow D] Cron Expiry Warning (No Repeat)     ← ทำงานเบื้องหลังอัตโนมัติ
```

---

## 3. Flow A — Repeat Mode (isRepeat = true)

### 3.1 ขั้นตอนที่ผู้ใช้ทำ

1. เลือกการ์ด **"ทำซ้ำเป็นรอบสัปดาห์"**
2. เลือก **กะการทำงาน** (Shift) — **เลือกได้เพียง 1 กะ** (single-select)
3. เปิด Drawer **เลือกพนักงาน** — เลือกได้หลายคน (multi-select)
4. เลือก **วันในสัปดาห์** ที่ต้องการให้ทำงาน (จันทร์ – อาทิตย์) — toggle เลือกได้หลายวัน
5. กรอก **วันเริ่ม (Required)** และ **วันจบ (Optional)**
   - ถ้าไม่กรอกวันจบ → ทำซ้ำไปเรื่อย ๆ ไม่สิ้นสุด
   - ถ้ากรอกวันจบ → ทำซ้ำจนถึงวันจบ
6. กด **"สร้างแผนการทำงาน"**

### 3.2 Backend Flow (สร้างครั้งแรก)

```
[User กดสร้าง]
       │
       ▼
[Validate Input]
   - มี shift, employees, startDate, repeatDays อย่างน้อย 1 วัน
   - endDate (ถ้ามี) ต้อง >= startDate
       │
       ▼
[สร้าง Shift Assignment 1 record]
   {
     shiftId: morning_shift,
     employees: [empA, empB, empC],
     startDate: 2026-06-01,
     endDate: null (หรือวันที่ระบุ),
     isRepeat: true,
     repeatDays: [Mon, Tue, Wed, Thu, Fri],
     lastGeneratedAt: null,
     status: 'ACTIVE'
   }
       │
       ▼
[อ่าน config: shift_generation_window_days = 25 (default)]
       │
       ▼
[คำนวณช่วงสร้าง EmployeeShift]
   - targetDate = startDate + windowDays - 1
   - ถ้าไม่มี endDate           → generateUntil = targetDate
   - ถ้ามี endDate และ endDate ใกล้กว่า targetDate → generateUntil = endDate (clamp)
   - ถ้ามี endDate แต่ targetDate ใกล้กว่า         → generateUntil = targetDate
       │
       ▼
[Loop: startDate → generateUntil]
   - ถ้า dayOfWeek(วัน) อยู่ใน repeatDays:
     - Loop ทุก employee → INSERT EmployeeShift (status='SCHEDULED')
       │
       ▼
[UPDATE ShiftAssignment.lastGeneratedAt = generateUntil]
       │
       ▼
[ถ้า generateUntil = endDate → status = 'COMPLETED']
   (กรณี endDate < startDate + windowDays → จบในครั้งเดียว ไม่ต้องรอ cron)
       │
       ▼
[Return: สำเร็จ พร้อม summary]
   "สร้าง 18 EmployeeShift สำหรับ 3 พนักงาน ระหว่าง 01/06 - 25/06"
```

### 3.3 Cronjob — Daily Check (รันทุกวัน 01:00)

```
[Cron Trigger ทุกวัน 01:00]
       │
       ▼
[อ่าน config: windowDays = 25, today = วันนี้]
       │
       ▼
[Query ShiftAssignment ที่:
   - isRepeat = true
   - status = 'ACTIVE'
   - lastGeneratedAt <= today          ← ถึงเวลาต้อง generate ต่อแล้ว
   - endDate IS NULL OR lastGeneratedAt < endDate]
       │
       ▼
[สำหรับแต่ละ Assignment]
   - fromDate   = lastGeneratedAt + 1
   - targetDate = today + windowDays - 1
   - ถ้าไม่มี endDate           → generateUntil = targetDate
   - ถ้ามี endDate และ endDate ใกล้กว่า targetDate → generateUntil = endDate (clamp)
   - ถ้ามี endDate แต่ targetDate ใกล้กว่า         → generateUntil = targetDate
       │
       ▼
[สร้าง EmployeeShift ตั้งแต่ fromDate → generateUntil (ตาม repeatDays)]
       │
       ▼
[Update lastGeneratedAt = generateUntil]
       │
       ▼
[ถ้า generateUntil = endDate → status = 'COMPLETED']
```

### 3.4 ตัวอย่างการทำงานของ Cron

> สมมติ windowDays = 25, startDate = 01/06/68, endDate = 30/05/69 (อีก ~12 เดือน)

| วันที่ cron รัน | lastGeneratedAt เดิม | trigger? | สร้างถึง | lastGeneratedAt ใหม่ | status |
|---|---|---|---|---|---|
| 02/06 | 25/06 | ❌ (25/06 > 02/06) | – | – | ACTIVE |
| 25/06 | 25/06 | ✓ | 19/07 | 19/07 | ACTIVE |
| 19/07 | 19/07 | ✓ | 12/08 | 12/08 | ACTIVE |
| ... | ... | ... | ... | ... | ACTIVE |
| 29/05/69 | 29/05/69 | ✓ | MIN(22/06, 30/05) = **30/05** | 30/05/69 | **COMPLETED** |

> **เคสที่ requirement ระบุ** — วันนี้ 28/05, endDate = 30/05
> → `generateUntil = MIN(28/05 + 24, 30/05) = 30/05` (ถูก clamp ที่ endDate)
> → หลัง generate, status เปลี่ยนเป็น `COMPLETED` ไม่ถูก trigger อีก

**ทำไม cron รันทุกวัน?** เพื่อตอบสนองทันเวลาแม้ `windowDays` จะถูกปรับลด เช่น admin ลดจาก 25 → 5 วัน — ระบบยังคงทยอยสร้างได้ถูกต้องทุกวันโดยไม่เกิดช่องว่าง

---

## 4. Flow B — No Repeat Mode (isRepeat = false)

### 4.1 ขั้นตอนที่ผู้ใช้ทำ

1. เลือกการ์ด **"วางแผนเฉพาะช่วง"**
2. กรอก **วันเริ่ม (Required)** และ **วันจบ (Required)**
3. กดปุ่ม **"เพิ่มพนักงาน"** (มุมขวาบนของตาราง) → เปิด Drawer เลือกพนักงาน
4. หลังเลือกพนักงานเสร็จ ตารางจะ render:
   - **แกน X:** วันที่ตั้งแต่วันเริ่ม → วันจบ
   - **แกน Y:** รายชื่อพนักงานที่เลือก
5. **คลิกที่ cell** ของพนักงาน × วันใด ๆ → Dialog เปิด แสดง:
   - **Section "กะที่มีอยู่"** — list ของกะทุกกะใน cell นี้ พร้อมปุ่มลบแต่ละกะ
   - **Section "เลือกกะที่ต้องการเพิ่ม"** — รายการ shift ทั้งหมด (กะที่มีอยู่แล้วใน cell จะ disabled กันเลือกซ้ำ)
6. เลือก Shift 1 รายการ → กด **"เพิ่มกะนี้ลงเซลล์"** → กะถูก append เข้า cell ทันที, Dialog ยังเปิดค้าง พร้อม auto-select กะถัดไป
7. **สามารถเพิ่มได้หลายกะใน 1 cell** (เช่น กะเช้า + กะเย็น วันเดียวกัน) โดยกดเพิ่มซ้ำ จนพอใจ → กด "ปิด"
8. ใน grid: cell จะแสดง chip สีหลายอันซ้อนแนวตั้ง, hover แล้วมีปุ่ม **"+ เพิ่มกะ"** ที่มุมล่างเพื่อเปิด dialog เพิ่มเร็ว
9. ทำซ้ำสำหรับทุก cell ที่ต้องการกำหนดกะ (cell ไม่จำเป็นต้องครบทุกช่อง)
10. กด **"สร้าง Employee Shift"**

### 4.2 พฤติกรรมของ Dialog แบบ Multi-add

- **ไม่เป็น destructive** — เปิด dialog ของ cell ที่มีกะอยู่แล้ว ไม่ลบของเดิม ต้องกดปุ่ม × เอง
- **ป้องกัน duplicate กะเดียวกัน** — ถ้า cell มี "กะเช้า" อยู่แล้ว ในรายการเลือกจะ disabled กะเช้าไว้
- **Auto-select กะถัดไป** — หลังเพิ่ม 1 กะ จะ auto-select กะแรกที่ยังเหลือ ทำให้กดเพิ่มต่อเนื่องได้เร็ว
- **Auto-close เมื่อครบทุกกะ** — ถ้าผู้ใช้เพิ่มจนครบทุก shift type, dialog จะปิดให้อัตโนมัติ


### 4.3 Backend Flow

```
[User กดสร้าง]
       │
       ▼
[Validate Input]
   - มี startDate, endDate, employees อย่างน้อย 1 คน
   - มี cell อย่างน้อย 1 ช่องที่กำหนด shift แล้ว
   - ภายใน cell เดียวกัน shift ต้องไม่ทับซ้อนช่วงเวลา (เช่น กะเช้า 08-16 + กะเย็น 14-18 → warning)
       │
       ▼
[สร้าง Shift Assignment 1 record]
   {
     employees: [empA, empB, empC, empD],
     startDate: 2026-05-01,
     endDate: 2026-05-10,
     isRepeat: false,
     shiftId: null (เพราะ shift หลากหลาย),
     repeatDays: null
   }
       │
       ▼
[Loop: ทุก cell ที่ผู้ใช้กำหนดกะแล้ว]
   - สำหรับแต่ละกะใน cell นั้น (อาจมีหลายกะ):
     - สร้าง Employee Shift {employeeId, shiftId, workDate, assignmentId}
       │
       ▼
[Return: สำเร็จ พร้อม summary]
   "สร้าง 26 Employee Shift สำหรับ 4 พนักงาน (มี 4 วันที่ทำ 2 กะ)"
```

### 4.4 ไม่ต้องใช้ Cronjob
เพราะกะทุกตัวถูกระบุชัดเจนตอนสร้าง → สร้างจบในครั้งเดียว

---

## 5. Flow C — Edit Assignment (เพิ่ม / ลบ พนักงาน) 🆕

> เมื่อ Assignment ถูกสร้างไปแล้วและกำลัง `ACTIVE` ผู้ดูแลสามารถแก้ไขรายชื่อพนักงานในรอบได้ ระบบจะ **backfill EmployeeShift** ให้คนใหม่อัตโนมัติ

### 5.1 ขั้นตอนที่ผู้ใช้ทำ

1. เข้าหน้ารายการ Assignment → คลิก Assignment ที่ต้องการแก้ → กด "แก้ไขพนักงาน"
2. เปิด Drawer แสดงรายชื่อพนักงานในรอบปัจจุบัน
3. **เพิ่มพนักงาน:**
   - Repeat mode → กดเลือกพนักงานใหม่ → กดยืนยัน (ไม่ต้องระบุกะ — ใช้ shift template เดิม)
   - No Repeat mode → กดเพิ่ม → เปิดตาราง grid ของพนักงานใหม่คนเดียว → กำหนดกะรายวัน → ยืนยัน
4. **ลบพนักงาน:**
   - กด × หลังชื่อพนักงาน → confirm "EmployeeShift ของคนนี้ตั้งแต่วันนี้เป็นต้นไป จะถูกยกเลิก"

### 5.2 Backend Flow — Add Employee (Repeat)

```
[User กดเพิ่มพนักงาน]
       │
       ▼
[Validate]
   - assignment.status = 'ACTIVE'
   - employee.status = 'ACTIVE'
   - assignment_employee ยังไม่มี active record ของคู่นี้
       │
       ▼
[Begin Transaction]
       │
       ▼
[INSERT assignment_employee {
   assignmentId, employeeId,
   shiftId = assignment.shiftId,    🆕 copy จาก parent (Repeat → มีค่า)
   addedAt = now()
}]
       │
       ▼
[คำนวณช่วง backfill]
   - backfillFrom = MAX(assignment.startDate, today)
   - backfillTo   = assignment.lastGeneratedAt
       │
       ▼
[Loop date จาก backfillFrom → backfillTo]
   - ถ้า dayOfWeek(date) อยู่ใน assignment.repeatDays:
     - INSERT employee_shift {
         employeeId,
         shiftId = assignment.shiftId,
         workDate = date,
         assignmentId,
         status = 'SCHEDULED'
       }
       │
       ▼
[Commit]
       │
       ▼
[Return: "เพิ่มพนักงานสำเร็จ พร้อมสร้าง {N} EmployeeShift ให้คนใหม่"]
```

> **ทำไม backfillFrom = MAX(startDate, today)?**
> ไม่สร้าง EmployeeShift ย้อนหลังก่อนวันนี้ เพราะกะที่ผ่านไปแล้วสร้างไปก็เป็น `MISSED` ทันที — ผิดเจตนา

> **Cron รายวันยังทำงานเหมือนเดิม** — รอบถัดไป cron จะ generate EmployeeShift ของพนักงานคนใหม่ต่อพร้อมคนอื่นในรอบเอง (เพราะ generate ตาม `assignment_employee` ที่ `removed_at IS NULL`)

### 5.3 Backend Flow — Add Employee (No Repeat)

```
[User กดเพิ่มพนักงาน + กรอก cellShifts ของคนใหม่]
       │
       ▼
[Validate ทำนองเดียวกัน]
       │
       ▼
[Begin Transaction]
   a. INSERT assignment_employee { assignmentId, employeeId, shiftId = NULL, addedAt = now() }  🆕
   b. Loop cellShifts ของพนักงานคนนี้:
      - For each shiftId in cell:
        - INSERT employee_shift (status='SCHEDULED')
[Commit]
```

> **No Repeat ต้องระบุกะรายวันเอง** — เพราะไม่มี shift template + repeatDays กลางใน assignment

### 5.4 Backend Flow — Remove Employee

```
[User กดลบพนักงาน + confirm]
       │
       ▼
[Begin Transaction]
   a. UPDATE assignment_employee SET removed_at = now()
      WHERE assignmentId = ? AND employeeId = ?
   b. UPDATE employee_shift SET status = 'CANCELLED'
      WHERE assignmentId = ? AND employeeId = ?
        AND workDate >= today
        AND status = 'SCHEDULED'
   c. **ของวันที่ผ่านมา (COMPLETED, MISSED, IN_PROGRESS) ไม่แตะ**
[Commit]
```

---

## 6. Flow D — Cron Expiry Warning (No Repeat) 🆕

> สำหรับ Assignment แบบ No Repeat ที่มี endDate ชัดเจน เมื่อใกล้หมดอายุ ระบบควรเตือนผู้ดูแลให้สร้างรอบใหม่ (กันลืม)

### 6.1 Cron Flow

```
[Cron Trigger ทุกวัน 08:00 (config: norepeat_expiry_check_time)]
       │
       ▼
[อ่าน config]
   - warningDays = norepeat_expiry_warning_days (default 7)
   - today       = วันนี้
   - threshold   = today + warningDays
       │
       ▼
[Query ShiftAssignment ที่:
   - isRepeat = false
   - status = 'ACTIVE'
   - endDate IS NOT NULL
   - endDate >= today            (ยังไม่หมดอายุ)
   - endDate <= threshold        (ใกล้หมดอายุภายใน N วัน)
   - warningSentAt IS NULL OR warningSentAt < today]   (กัน duplicate)
       │
       ▼
[สำหรับแต่ละ Assignment ที่เข้าเงื่อนไข]
   - คำนวณ daysLeft = endDate - today
   - ส่ง notification (email/push/in-app) ไปยัง:
     • assignment.createdBy
     • admin / supervisor
   - ข้อความ: "Assignment '{name}' จะหมดอายุในวันที่ {endDate}
              (อีก {daysLeft} วัน) กรุณาสร้างรอบใหม่"
   - UPDATE assignment.warningSentAt = today
       │
       ▼
[Optional: Critical alert ถ้า daysLeft <= 1]
   - ส่งซ้ำผ่านช่องทาง escalation (เช่น SMS, LINE)
```

### 6.2 ตัวอย่างการแจ้งเตือน

> สมมติ warningDays = 7, Assignment endDate = 15/06/68

| วันที่ cron รัน | daysLeft | trigger? | Action | warningSentAt ใหม่ |
|---|---|---|---|---|
| 07/06 | 8 | ❌ (daysLeft > warningDays) | – | – |
| 08/06 | 7 | ✓ | ส่ง notification "อีก 7 วัน" | 08/06 |
| 09/06 | 6 | ❌ (warningSentAt = 08/06 = today−1) | – | (ยัง 08/06) |

> **หมายเหตุ:** Cron condition `warningSentAt < today` ตั้งใจให้ส่งแค่ครั้งเดียว ถ้าต้องการเตือนทุกวันให้เปลี่ยนเงื่อนไขเป็นไม่เช็ค `warningSentAt` หรือเช็ค `warningSentAt <> today` แทน (config ระดับ behavior)

### 6.3 ทำไมแยก Cron 2 ตัว?

| Cron | เวลา | งาน | เหตุผล |
|---|---|---|---|
| Generation | 01:00 | สร้าง EmployeeShift ล่วงหน้า (Repeat) | Heavy I/O, รันตอนคนนอน ไม่กระทบ user |
| Expiry Warning | 08:00 | แจ้งเตือน No Repeat ใกล้หมดอายุ | Notification, รันตอนคนเริ่มทำงาน เห็น noti ทันที |

---

## 7. State Machine ของ UI

```
                    ┌─────────────────────┐
                    │  IDLE (เลือกประเภท)  │
                    └─────────────────────┘
                       │              │
              เลือก Repeat    เลือก No Repeat
                       │              │
                       ▼              ▼
              ┌───────────────┐  ┌────────────────┐
              │ REPEAT_FORM   │  │ NOREPEAT_FORM  │
              │ - กะ          │  │ - dateRange    │
              │ - พนักงาน      │  │ - พนักงาน      │
              │ - dayOfWeek   │  │ - cell × shift │
              │ - dateRange   │  │                │
              └───────────────┘  └────────────────┘
                       │              │
                       └──────┬───────┘
                              ▼
                    ┌─────────────────┐
                    │  VALIDATING     │
                    └─────────────────┘
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                  [Invalid]      [Valid]
                       │             │
                       │             ▼
                       │     ┌────────────────┐
                       │     │   SUBMITTING   │
                       │     └────────────────┘
                       │             │
                       │             ▼
                       │     ┌────────────────┐
                       └────►│   ERROR/DONE   │
                             └────────────────┘
```

---

## 8. การจัดการ Edge Cases

| Case | การจัดการ |
|------|---------|
| Repeat: ไม่ระบุ endDate | UI แสดง info banner "สร้างล่วงหน้า {windowDays} วัน, cron รันทุกวัน 01:00" |
| Repeat: endDate < (startDate + windowDays) | สร้าง EmployeeShift ครบในครั้งเดียว, set status = `COMPLETED` ไม่ต้องรอ cron |
| Repeat: cron รันแต่ยังไม่ถึงเวลา generate ต่อ | Skip — เงื่อนไข `lastGeneratedAt <= today` ป้องกัน |
| **Repeat: เพิ่มพนักงานใหม่หลังสร้าง assignment** 🆕 | Backfill EmployeeShift จาก `MAX(startDate, today)` ถึง `lastGeneratedAt` |
| **Repeat: ลบพนักงานออกจาก assignment** 🆕 | Cancel EmployeeShift ที่ `workDate >= today` และ `status = SCHEDULED` ของวันที่ผ่านมาคงไว้ |
| **No Repeat: ใกล้หมดอายุ** 🆕 | Cron 08:00 แจ้งเตือนก่อน `warningDays` วัน, mark `warningSentAt` กัน duplicate |
| **No Repeat: เพิ่มพนักงานใหม่หลังสร้าง assignment** 🆕 | เปิด UI grid ของคนใหม่ ให้กรอกกะรายวันเองก่อน save |
| No Repeat: ผู้ใช้คลิก cell ที่มี shift อยู่แล้ว | Dialog เปิดพร้อมแสดง list กะที่มีอยู่ (ลบแยกเฉพาะกะได้) และ list กะที่ยังเพิ่มได้ |
| No Repeat: เพิ่มกะเดียวกันซ้ำใน cell เดียว | กะที่มีอยู่แล้วจะ disabled ในรายการเลือก ป้องกัน duplicate |
| No Repeat: กะใน cell เดียวกันทับซ้อนช่วงเวลา (เช่น เช้า 08-16 + บ่าย 14-22) | แสดง warning toast แต่ไม่ block — บางองค์กรอาจตั้งใจให้พนักงานทำคาบเกี่ยว |
| No Repeat: เลือก dateRange กว้างมาก (เช่น 60 วัน) | ตารางมี horizontal scroll, column header sticky |
| มีกะซ้อนทับ (พนักงานคนเดียวกัน วันเดียวกัน กะเดียวกัน) | Unique index ใน DB block + แจ้ง toast error |

---

## 9. API Endpoints (แนะนำ)

```
# Assignment
POST   /api/shift-assignments                       // สร้าง assignment + employee shifts
GET    /api/shift-assignments                       // list assignment
GET    /api/shift-assignments/:id                   // ดู detail
PATCH  /api/shift-assignments/:id                   // แก้ไข metadata
DELETE /api/shift-assignments/:id                   // cancel assignment (soft)
GET    /api/shift-assignments/expiring?days=7       // 🆕 list ที่ใกล้หมดอายุ

# Assignment × Employee (edit)
POST   /api/shift-assignments/:id/employees         // 🆕 เพิ่มพนักงาน (backfill auto)
DELETE /api/shift-assignments/:id/employees/:empId  // 🆕 ลบพนักงาน (cancel future shifts)

# Shift template
GET    /api/shifts                                  // ดึง list ของ Shift templates
POST   /api/shifts
PATCH  /api/shifts/:id
DELETE /api/shifts/:id                              // soft toggle isActive

# Employee Shift
GET    /api/employees?filter=...                    // ดึง list พนักงาน
GET    /api/employee-shifts?from=&to=&empId         // ดึงตารางกะที่มีอยู่
PATCH  /api/employee-shifts/:id                     // แก้กะรายวันแบบเดี่ยว
DELETE /api/employee-shifts/:id                     // cancel กะรายตัว

# System Config (admin)
GET    /api/system-config                           // 🆕 อ่าน config
PATCH  /api/system-config                           // 🆕 ปรับ windowDays, warningDays ฯลฯ
```

### Internal Cron
```
POST /internal/cron/generate-repeated-shifts   // รันทุกวัน 01:00
POST /internal/cron/notify-expiring-assignments // 🆕 รันทุกวัน 08:00
```

---

## 10. ข้อแนะนำเพิ่มเติม

1. **แสดงตารางสรุปก่อน submit** — โดยเฉพาะ Repeat mode ที่ผู้ใช้ไม่เห็นวันที่ทั้งหมด ควรมี preview "จะสร้างกะ N รายการ ในวันที่ X, Y, Z..." ก่อน confirm
2. **Bulk action ในตาราง No Repeat** — เลือกหลาย cell แล้ว apply shift เดียวกัน (เช่น select row → ทำงานกะเช้าทั้งสัปดาห์)
3. **Audit Log** — บันทึกประวัติว่าใครสร้าง/แก้ shift เมื่อใด เพื่อตรวจสอบย้อนหลัง
