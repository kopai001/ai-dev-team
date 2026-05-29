# Flow การทำงาน: โมดูลการลา (Leave Management)

## 1. ภาพรวม Domain Model

```
┌──────────────────┐         ┌──────────────────────────┐
│   LeaveType      │         │  EmployeeLeaveSetting    │
│ (Seed Catalog)   │◄────────│ (Per-Employee Config)    │
├──────────────────┤         ├──────────────────────────┤
│ code (PK)        │         │ id (PK)                  │
│ title            │         │ employeeId               │
│ color            │         │ leaveTypeCode (FK)       │
│ description      │         │ limitQuantity            │
│ isUseEvidence    │         │ requiresEvidenceForPay   │
│ allowHourly      │         │ note                     │
└──────────────────┘         │ createdAt / updatedAt    │
                             └──────────────────────────┘
                                          ▲
                                          │ (มี row = ลาได้)
                                          │
                              ┌─────────────────────────────────────┐
                              │ LeaveBalanceService (COMPUTED)      │
                              │ → NOT an entity                     │
                              │ → คำนวณ live จาก LeaveRequest        │
                              └─────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   LeaveRequest           │         │   LeaveRequestDay        │
│ (Source of Truth)        │         │ (Daily Breakdown)        │
├──────────────────────────┤         ├──────────────────────────┤
│ id (PK)                  │◄────────│ id (PK)                  │
│ employeeId               │         │ requestId (FK)           │
│ leaveTypeCode (FK)       │         │ workDate                 │
│ startDate / endDate      │         │ hours                    │
│ isFullDay                │         │ workMinutesOfDay         │
│ startTime / endTime      │         └──────────────────────────┘
│ totalHours / totalDays   │
│ reason                   │
│ evidenceUrls (jsonb)     │
│ status (enum)            │
│ isPaid (snapshot)        │
│ isShiftEstimated         │
│ approvedById/At          │
│ rejectReason             │
│ cancelledById/At         │
│ cancelReason             │
│ createdAt / updatedAt    │
└──────────────────────────┘
            │
            │ query (read-only)
            ▼
   ┌─────────────────────────┐
   │ Shift Module            │
   │ (External Integration)  │
   │ - resolveExpectedWork-  │
   │   Minutes()             │
   │ - getEmployeeShifts()   │
   └─────────────────────────┘
            ▲
            │ events
            │ leave.request.approved
            │ leave.request.cancelled
            │ leave.request.adjusted
```

**ความสัมพันธ์:**

- 1 `LeaveType` → N `EmployeeLeaveSetting` (พนักงานหลายคนใช้ leave type เดียวกัน)
- 1 `Employee` → N `EmployeeLeaveSetting` (1 row ต่อ 1 leave type ที่ลาได้)
- 1 `LeaveRequest` → N `LeaveRequestDay` (cascade delete)
- `LeaveBalance` **ไม่ใช่ entity** — เป็น DTO ที่ `LeaveBalanceService` คำนวณจาก `LeaveRequest.status = APPROVED` SUM ตามปี

**Key Design Decisions:**

- **Eligibility = ตรวจจาก `EmployeeLeaveSetting`** — ถ้ามี row = ลาได้, ไม่มี = ลาไม่ได้
- **Quota override = อยู่ใน `EmployeeLeaveSetting.limitQuantity` โดยตรง** — ไม่มี table แยก
- **Default rules** อยู่ใน `constants/default-leave-settings.ts` (hardcoded matrix)
- **Onboard** = subscribe `employee.created` event → seed rows ตาม default matrix
- **`isPaid`** = snapshot ตอน approve (historical truth) — รายละเอียดดูข้อ 5.2

**External Module Integration:**

- **Shift Module** — Leave Module เรียกผ่าน `IShiftProvider` interface ผ่าน DI token `SHIFT_PROVIDER`
- **Employee Module** — Leave Module subscribe `employee.created` event เพื่อ seed settings

**External Module Event Subscription (โดย Shift):**

- `leave.request.approved` → Shift cancel EmployeeShift ในวันลา
- `leave.request.cancelled` → Shift re-create EmployeeShift กลับ
- `leave.request.adjusted` → 🔖 Future: Shift Reconciliation

---

## 2. System Config (ปรับได้)

| Key | Default | คำอธิบาย |
|---|---|---|
| `default_hours_per_day` | 8 | ชั่วโมงทำงานต่อวัน (fallback เมื่อ shift resolve ไม่เจอ) |
| `min_leave_hours` | 1 | ขั้นต่ำของการลาเป็นชั่วโมง |
| `hour_increment` | 1 | step ของการลา (ไม่รับ 0.5) |
| `quota_reset_month` | 1 | เดือนที่ reset โควต้า |
| `quota_reset_day` | 1 | วันที่ reset โควต้า |

---

## 3. Default Leave Settings Matrix

> 📌 **Hardcoded ใน code** — แก้ได้โดย dev redeploy (ไม่ใช่ UI/DB) <br>
> ใช้ตอน onboard เพื่อ seed rows ให้พนักงานใหม่ <br>
> หลัง onboard HR สามารถแก้ `EmployeeLeaveSetting` รายคนได้ผ่าน UI

```typescript
// constants/default-leave-settings.ts
export const DEFAULT_LEAVE_SETTINGS: Record<EmployeeType, DefaultSettingEntry[]> = {
  MONTHLY: [
    { leaveTypeCode: 'PERSONAL',   limitQuantity: 6,   requiresEvidenceForPay: false },
    { leaveTypeCode: 'VACATION',   limitQuantity: 7,   requiresEvidenceForPay: false },
    { leaveTypeCode: 'SICK',       limitQuantity: 30,  requiresEvidenceForPay: false },
    { leaveTypeCode: 'MATERNITY',  limitQuantity: 120, requiresEvidenceForPay: false },
    { leaveTypeCode: 'HAJJ',       limitQuantity: -1,  requiresEvidenceForPay: false },
    { leaveTypeCode: 'ORDINATION', limitQuantity: -1,  requiresEvidenceForPay: false },
  ],
  DAILY: [
    { leaveTypeCode: 'SICK', limitQuantity: 30, requiresEvidenceForPay: true },
    // ลาประเภทอื่นไม่อยู่ที่นี่ = DAILY ลาไม่ได้
  ],
};
```

> 🔖 **Future Work**: ถ้าวันหนึ่งอยากให้ HR แก้ default ผ่าน UI → เพิ่ม `LeaveSettingTemplate` entity แล้ว resolve: `Template (DB) → Hardcoded Matrix`

---

## 4. User Flow ภาพรวม

```
   พนักงานเปิดหน้า "ลา"
            │
            ▼
   ┌────────────────────────┐
   │  เห็น Balance ปัจจุบัน  │   ← LeaveBalanceService.getAllBalances()
   │  (ทุกประเภทที่ลาได้)    │   ← มาจาก EmployeeLeaveSetting rows
   └────────────────────────┘
            │
            ▼
   ┌────────────────────┐
   │  กดปุ่ม "ยื่นใบลา" │
   └────────────────────┘
            │
            ▼
        [Flow A] ยื่นใบลา
            │
            ▼
   ใบลา PENDING (isPaid=false default)
            │
       ┌────┼─────────────┐
       │    │             │
       ▼    ▼             ▼
   [Flow B] [Flow C]   [Flow D]
   อนุมัติ  ยกเลิก     แก้ไข
   /ปฏิเสธ  ก่อนอนุมัติ  (ยังเป็น PENDING)
            (พนักงาน)
       │
       ▼
   APPROVED + isPaid=คำนวณ ✅
       │
       ▼
   ┌─────────────────────────────────────┐
   │ Leave ยิง event → Shift cancel      │
   │ EmployeeShift ในวันลา               │
   └─────────────────────────────────────┘
       │
       ▼
   ใบลาอาจถูก [Flow C]: ยกเลิกหลังอนุมัติ
       │
       ▼ (isPaid → false force reset)
   ┌─────────────────────────────────────┐
   │ Leave ยิง event → Shift re-create   │
   │ EmployeeShift กลับมา                │
   └─────────────────────────────────────┘
```

---

## 5. Flow A — ยื่นใบลา (Submit Leave Request)

### 5.1 ขั้นตอนที่ผู้ใช้ทำ

1. กดปุ่ม **"ยื่นใบลา"**
2. เลือก **ประเภทการลา** (dropdown แสดงเฉพาะที่ eligible — มาจาก `EmployeeLeaveSettingService.getEligibleLeaveTypes()`)
3. เลือก **วันเริ่ม** / **วันสิ้นสุด**
4. เลือกรูปแบบ: **ลาเต็มวัน** หรือ **กำหนดชั่วโมง**
   - ถ้า "กำหนดชั่วโมง" → กรอก `startTime`, `endTime`
5. กรอก **เหตุผล**
6. แนบ **เอกสาร** (ถ้า `LeaveType.isUseEvidence = true` → บังคับ)
7. กด **"ส่งคำขอ"**

### 5.2 ระบบทำอะไรหลังกดส่ง

```
1. Validate input
   ├─ EmployeeLeaveSettingService.canRequest(employeeId, code)?
   │  → ถ้าไม่ผ่าน: 403 Forbidden (ไม่มี row ใน EmployeeLeaveSetting)
   ├─ startDate, endDate ปีเดียวกัน?                → ถ้าไม่: 400
   ├─ ลาเป็นชั่วโมง: startDate === endDate?          → ถ้าไม่: 400 (แนะนำแยกใบ)
   ├─ ลาเป็นชั่วโมง: เป็นจำนวนเต็มชั่วโมง?           → ถ้าไม่: 400
   ├─ ลาเป็นชั่วโมง: ≥ min_leave_hours?              → ถ้าไม่: 400
   ├─ ตรวจ overlap กับใบลา PENDING/APPROVED?         → ถ้าทับ: 409 Conflict
   ├─ ถ้า LeaveType.isUseEvidence=true → ต้องมี evidence? → ถ้าไม่: 400
   └─ leaveType.allowHourly=false → ต้อง isFullDay?  → ถ้าไม่: 400

2. LeaveCalculationService.calculateRequestDays(dto)
   สำหรับแต่ละวันใน [startDate, endDate]:
   ├─ เรียก ShiftProvider.resolveExpectedWorkMinutes(employeeId, date)
   │  ├─ Tier 1: หา EmployeeShift ที่มีอยู่จริง → SUM workMinutes ทุกกะของวันนั้น
   │  ├─ Tier 2: Look-ahead จาก ShiftAssignment ที่ active
   │  │         ├─ Repeat: เช็ค repeatDays + shiftId
   │  │         └─ NoRepeat: เช็ค cellShifts ของวันนั้น
   │  └─ Tier 3: คืน null → fallback ใช้ default_hours_per_day × 60
   │
   ├─ ถ้า source === 'LOOKAHEAD' หรือ 'DEFAULT' → set isShiftEstimated = true
   │
   ├─ คำนวณ hours สำหรับวันนั้น:
   │  ├─ isFullDay = true  → hours = workMinutes / 60
   │  └─ isFullDay = false → hours = (endTime - startTime) - overlapWithBreak
   │
   └─ สร้าง LeaveRequestDay (workDate, hours, workMinutesOfDay)

3. คำนวณ totalHours = SUM(days.hours)
   คำนวณ totalDays  = SUM(days.hours * 60 / workMinutesOfDay)  // วันเศษส่วน

4. บันทึก LeaveRequest:
   ├─ status = PENDING
   ├─ isPaid = false (default — จะคำนวณตอน approve)
   └─ days, totals, etc.

5. ยิง event 'leave.request.submitted' → notification หา approver

6. ตอบกลับ client พร้อม preview:
   {
     request: { ...บันทึก... },
     balance: { quotaDays, usedDays, remainingDays },
     projectedRemaining: remainingDays - totalDays,
     isOverQuota: (remainingDays - totalDays) < 0
   }
```

### 5.3 UI ที่ Client ต้องแสดง

- **ก่อนกดส่ง**: แสดง preview
  - จำนวนวันที่ลา (`totalDays`)
  - วันลาคงเหลือก่อนลาครั้งนี้ (`balance.remainingDays`)
  - วันลาคงเหลือหลังลาครั้งนี้ (`projectedRemaining`)
  - ถ้า `projectedRemaining < 0` → warning สีแดง "ลาเกินสิทธิ์"

- **หลังส่ง**: redirect ไปหน้า "ใบลาของฉัน" + toast "ส่งคำขอเรียบร้อย"

---

## 6. Flow B — อนุมัติ / ปฏิเสธ (Approve / Reject)

### 6.1 ขั้นตอนที่ผู้ใช้ทำ (Approver)

1. ได้รับ notification ใหม่
2. เปิดหน้า "ใบลารออนุมัติ"
3. คลิกใบลาเพื่อดูรายละเอียด
4. ระบบแสดง:
   - ข้อมูลใบลา
   - **Balance ปัจจุบันของพนักงาน**
   - **Projected remaining** ถ้า approve ใบนี้
   - ⚠️ ถ้า over quota → modal เตือน + ปุ่ม "รับทราบและอนุมัติต่อ" (client-side only)
5. กด **"อนุมัติ"** หรือ **"ปฏิเสธ"** (พร้อมเหตุผล)

### 6.2 ระบบทำอะไรหลังกด Approve

```
1. Validate
   ├─ status === PENDING?                            → ถ้าไม่: 409 Conflict
   └─ approver มีสิทธิ์อนุมัติคนนี้? (🔖 Future: approval flow)

2. คำนวณ isPaid (snapshot ณ ตอน approve)
   ├─ ดึง EmployeeLeaveSetting ปัจจุบัน
   ├─ ถ้า requiresEvidenceForPay = true:
   │     isPaid = evidenceUrls.length > 0
   └─ ถ้า requiresEvidenceForPay = false:
         isPaid = true

3. UPDATE LeaveRequest:
   ├─ status = APPROVED
   ├─ isPaid = <ค่าที่คำนวณ>
   ├─ approvedById = userId
   └─ approvedAt = now()

4. ยิง event 'leave.request.approved'
   { requestId, employeeId, dates[] }

5. Shift Module subscribe → cancel EmployeeShift ใน dates[]

6. ส่ง notification หา:
   ├─ พนักงานเจ้าของใบลา ("ใบลาของคุณได้รับการอนุมัติ")
   └─ HR (สำเนา — รับทราบ)
```

### 6.3 ระบบทำอะไรหลังกด Reject

```
1. Validate
   ├─ status === PENDING?
   └─ rejectReason ถูกกรอก?

2. UPDATE LeaveRequest:
   ├─ status = REJECTED
   ├─ approvedById = userId    // ใช้ field เดียวกัน (ผู้ตัดสินใจ)
   ├─ approvedAt = now()
   ├─ rejectReason = ...
   └─ isPaid = false (คงเดิม — ไม่ต้องแตะ)

3. ส่ง notification หาพนักงาน
```

> **หมายเหตุ:** Approval flow รายละเอียด (ใครคือ approver, มีหลายระดับไหม) — 🔖 **Open Question** ยังไม่ออกแบบ

---

## 7. Flow C — ยกเลิกใบลา (Cancel Leave Request)

### 7.1 สิทธิ์การยกเลิก (Role-based Cancel Policy)

| Role | PENDING | APPROVED (ก่อนวันลา) | APPROVED (ผ่านวันลาแล้ว) | REJECTED/CANCELLED |
|------|---------|----------------------|--------------------------|--------------------|
| พนักงาน | ✅ | ❌ (ต้องให้หัวหน้า cancel) | ❌ | ❌ |
| หัวหน้างาน | ✅ | ✅ | ✅ | ❌ |
| HR Admin | ✅ | ✅ | ✅ | ❌ |

> Implement ด้วย `LeaveCancelPolicyGuard` (NestJS Guard)

### 7.2 ขั้นตอนที่ผู้ใช้ทำ

1. เปิดใบลาที่ต้องการยกเลิก
2. กด **"ยกเลิก"**
3. กรอก **เหตุผลการยกเลิก** (required ถ้า status=APPROVED)
4. ยืนยัน

### 7.3 ระบบทำอะไรหลังกด Cancel

```
1. Validate (ผ่าน Guard)
   ├─ role + status ตรงตามตาราง 7.1?
   └─ cancelReason ถูกกรอกถ้าจำเป็น?

2. UPDATE LeaveRequest:
   ├─ status = CANCELLED
   ├─ isPaid = false (🆕 force reset — ป้องกัน payroll จ่ายผิด)
   ├─ cancelledById = userId
   ├─ cancelledAt = now()
   └─ cancelReason = ...

3. ถ้า status เดิม === APPROVED → ยิง event 'leave.request.cancelled'
   { requestId, employeeId, dates[] }

4. Shift Module subscribe → re-create EmployeeShift ใน dates[]

5. ส่ง notification:
   ├─ พนักงาน (ถ้า cancel โดยคนอื่น)
   ├─ หัวหน้า (ถ้า cancel ใบที่เคย approve)
   └─ HR (สำเนา)

6. ⚠️ ไม่ต้อง restore balance — balance คำนวณ live จาก status=APPROVED
   เมื่อ status เปลี่ยนเป็น CANCELLED → query ครั้งถัดไป remaining จะเพิ่มเอง
```

---

## 8. Flow D — แก้ไขใบลา (Edit Leave Request)

### 8.1 เงื่อนไข

- ✅ แก้ได้เฉพาะเมื่อ `status === PENDING`
- ❌ APPROVED / REJECTED / CANCELLED → แก้ไม่ได้

### 8.2 ขั้นตอน

1. เปิดใบลาที่ PENDING
2. กด **"แก้ไข"**
3. แก้ field ต่าง ๆ ได้ทั้งหมด (วัน, เวลา, เหตุผล, เอกสาร, ประเภท)
4. กด **"บันทึก"**

### 8.3 ระบบทำอะไร

```
1. Validate เหมือน Flow A ทั้งหมด
2. DELETE LeaveRequestDay เก่าทั้งหมด
3. คำนวณใหม่ → INSERT LeaveRequestDay ใหม่
4. UPDATE LeaveRequest (totalHours, totalDays, evidenceUrls, อื่น ๆ)
5. ❌ ไม่ต้องแตะ isPaid — จะคำนวณตอน approve
6. (Optional) เก็บ audit log การเปลี่ยนแปลง — 🔖 Future
7. ส่ง notification หา approver ("ใบลาถูกแก้ไข")
```

---

## 9. Flow E — Onboard พนักงานใหม่ (Initialize Settings)

### 9.1 Event Flow

```
Employee Module                       Leave Module
     │                                     │
     │ Create new employee                 │
     │ emit 'employee.created'             │
     ├────────────────────────────────────►│
     │   { id, type, ... }                 │
     │                                     │
     │                              EmployeeLeaveSettingService
     │                              .handleEmployeeCreated()
     │                                     │
     │                              ┌──────┴──────┐
     │                              │  Read       │
     │                              │  DEFAULT_   │
     │                              │  LEAVE_     │
     │                              │  SETTINGS   │
     │                              │  [type]     │
     │                              └──────┬──────┘
     │                                     │
     │                              INSERT rows ใน
     │                              employee_leave_settings
```

### 9.2 พฤติกรรม

- พนักงาน **MONTHLY** ใหม่ → seed 6 rows (ทุก leave type)
- พนักงาน **DAILY** ใหม่ → seed 1 row (SICK เท่านั้น)
- ถ้า Employee Type ไม่อยู่ใน `DEFAULT_LEAVE_SETTINGS` → seed 0 rows (พนักงานคนนี้ลาไม่ได้เลย — HR ต้องเพิ่มเอง)

### 9.3 Idempotency

- Service ตรวจก่อน insert: ถ้า row มีอยู่แล้ว → skip
- ป้องกันกรณี event ถูกยิงซ้ำ

---

## 10. State Machine

```
       ┌─────────────┐
       │             │
       ▼             │ (Edit — Flow D)
  ┌─────────┐        │
  │ PENDING │────────┘
  │ isPaid  │
  │ = false │
  └────┬────┘
       │
   ┌───┼────────┬──────────────┐
   │   │        │              │
   ▼   ▼        ▼              ▼
APPROVED REJECTED CANCELLED   (Pending Cancel)
isPaid=  isPaid=  isPaid=
<calc>   false    false
   │
   │ (Cancel — หัวหน้า/HR)
   ▼
CANCELLED
isPaid = false (force)
```

| State | คำอธิบาย | isPaid | Action ที่ทำได้ |
|-------|---------|--------|----------------|
| `PENDING` | ยื่นแล้ว รออนุมัติ | `false` (default) | Edit, Cancel (any role), Approve, Reject |
| `APPROVED` | อนุมัติแล้ว | **คำนวณตอน approve** | Cancel (หัวหน้า/HR) |
| `REJECTED` | ปฏิเสธแล้ว | `false` | (terminal) |
| `CANCELLED` | ยกเลิกแล้ว | `false` (force) | (terminal) |

> 📌 **`isPaid` มีความหมายเฉพาะเมื่อ `status === APPROVED`** — สถานะอื่น Payroll ควรเพิกเฉย

---

## 11. การคำนวณ `isPaid`

### 11.1 Logic

```typescript
function evaluateIsPaid(
  setting: EmployeeLeaveSetting,
  evidenceUrls: string[],
): boolean {
  if (setting.requiresEvidenceForPay) {
    return (evidenceUrls?.length ?? 0) > 0;
  }
  return true;
}
```

### 11.2 ตัวอย่าง

| Employee Type | Leave Type | requiresEvidenceForPay | มี Evidence? | isPaid |
|---------------|-----------|------------------------|--------------|--------|
| MONTHLY | VACATION | false | ❌ | ✅ true |
| MONTHLY | SICK | false | ❌ | ✅ true |
| MONTHLY | SICK | false | ✅ | ✅ true |
| MONTHLY | MATERNITY | false | ✅ (บังคับจาก isUseEvidence) | ✅ true |
| DAILY | SICK | true | ❌ | ❌ false |
| DAILY | SICK | true | ✅ | ✅ true |

### 11.3 Timing

| Action | `isPaid` |
|--------|---------|
| Create (PENDING) | `false` (default) |
| Update (PENDING) | ไม่แตะ |
| **Approve** | **คำนวณตอนนี้** |
| Reject | `false` (คงเดิม) |
| **Cancel** | **`false` (force reset)** |

---

## 12. Integration กับ Shift Module

### 12.1 Sequence Diagram: ยื่นใบลา + คำนวณวันลา

```
พนักงาน              LeaveRequestService    ShiftProvider        ShiftModule
   │                        │                    │                   │
   │ POST /leave-requests   │                    │                   │
   ├───────────────────────►│                    │                   │
   │                        │ canRequest()?      │                   │
   │                        │ (ตรวจ Setting)     │                   │
   │                        │                    │                   │
   │                        │ resolveExpected-   │                   │
   │                        │ WorkMinutes(eid,d) │                   │
   │                        ├───────────────────►│                   │
   │                        │                    │ getEmployeeShift  │
   │                        │                    ├──────────────────►│
   │                        │                    │◄──────── null ───┤
   │                        │                    │ (ยังไม่ generate)  │
   │                        │                    │                   │
   │                        │                    │ lookupAssignment  │
   │                        │                    ├──────────────────►│
   │                        │                    │◄── Shift(8h, ...)─┤
   │                        │                    │                   │
   │                        │◄── ResolvedShift───┤                   │
   │                        │    source=LOOKAHEAD                    │
   │                        │                                        │
   │                        │ (set isShiftEstimated=true)            │
   │                        │ SAVE LeaveRequest (PENDING, isPaid=F)  │
   │                        │                                        │
   │◄── 201 Created ────────┤                                        │
```

### 12.2 Sequence Diagram: Approve ใบลา → คำนวณ isPaid + Shift cancel

```
Approver           LeaveRequestService     EventEmitter        ShiftModule
   │                      │                     │                  │
   │ POST /approve        │                     │                  │
   ├─────────────────────►│                     │                  │
   │                      │ getSetting()        │                  │
   │                      │ evaluateIsPaid()    │                  │
   │                      │                     │                  │
   │                      │ UPDATE status=APPROVED, isPaid=<calc>  │
   │                      │                     │                  │
   │                      │ emit('leave.request.approved')         │
   │                      ├────────────────────►│                  │
   │                      │                     │ handleApproved() │
   │                      │                     ├─────────────────►│
   │                      │                     │ UPDATE Employee- │
   │                      │                     │ Shift skippedR   │
   │                      │                     │ eason='LEAVE'    │
   │◄── 200 OK ───────────┤                     │                  │
```

### 12.3 Sequence Diagram: Cancel ใบลา → isPaid reset + Shift re-create

```
HR/หัวหน้า         LeaveRequestService     EventEmitter        ShiftModule
   │                      │                     │                  │
   │ POST /cancel         │                     │                  │
   ├─────────────────────►│                     │                  │
   │                      │ UPDATE status=CANCELLED, isPaid=false  │
   │                      │                     │                  │
   │                      │ emit('leave.request.cancelled')        │
   │                      ├────────────────────►│                  │
   │                      │                     │ handleCancelled()│
   │                      │                     ├─────────────────►│
   │                      │                     │ re-create        │
   │                      │                     │ EmployeeShift    │
   │◄── 200 OK ───────────┤                     │                  │
```

### 12.4 Required: Shift Module ต้องแก้

🆕 **เพิ่มใน Shift Module:**

1. เพิ่ม field `Shift.breakEndTime: time` (nullable)
   - Invariant: ถ้า `breakMinutes > 0` → ต้องมีทั้ง `breakStartTime` + `breakEndTime`
   - Invariant: `breakEndTime - breakStartTime = breakMinutes`
2. Implement `IShiftProvider` interface (ใน Shift Module)
3. Subscribe events:
   - `leave.request.approved` → cancel EmployeeShift
   - `leave.request.cancelled` → re-create EmployeeShift
4. เปลี่ยนชื่อ "โอที" → "กะเย็น" ใน docs/seed/UI

---

## 13. Business Rules ภาพรวม

| หัวข้อ | กฎ |
|-------|-----|
| Eligibility | มี row ใน `EmployeeLeaveSetting` = ลาได้ |
| โควต้า | `EmployeeLeaveSetting.limitQuantity` (-1 = unlimited) |
| โควต้า reset | 1 มกราคม ทุกปี (config ได้) — ไม่ต้องมี cron เพราะ balance live |
| Carry-over | ❌ ไม่ทบ — balance ปีใหม่นับใหม่จาก year filter |
| พนักงานใหม่ | seed rows อัตโนมัติจาก `DEFAULT_LEAVE_SETTINGS` |
| HR แก้ default rule | ต้อง edit code + redeploy |
| HR แก้รายคน | ✅ แก้ `EmployeeLeaveSetting` ผ่าน UI |
| นับวัน | นับทุกวันถ้า approve (calendar days รวมเสาร์-อาทิตย์/วันหยุด) |
| ลาเกินสิทธิ์ | ✅ อนุญาต — client เตือน approver ตอน approve |
| ลาย้อนหลัง | ✅ อนุญาต ไม่จำกัด |
| ลาทับซ้อน | ❌ Block ตั้งแต่ยื่น |
| ลาข้ามวันแบบชั่วโมง | ❌ ต้องแยกเป็น 2 ใบ |
| ลาข้ามปี | ❌ ต้องแยกเป็น 2 ใบ |
| ขั้นต่ำชั่วโมง | 1 ชม. เต็มจำนวน (ไม่รับ 0.5) |
| ทับพักเที่ยง | ลาเต็มวัน → ใช้ `workMinutes` <br> ลาเป็นชั่วโมง → หักช่วงพักออก |
| 1 วัน = กี่ ชม. | 3-tier resolution |
| หลายกะ/วัน | รวม `workMinutes` ทุกกะ |
| `isPaid` | snapshot ตอน approve, reset ตอน cancel |

---

## 14. Edge Cases

| # | Case | Behavior |
|---|------|----------|
| 1 | ลาทับซ้อนใบลาเดิม (PENDING/APPROVED) | ❌ Block — 409 Conflict |
| 2 | ลาในวันหยุดบริษัท | ✅ อนุญาต — ใช้ default config |
| 3 | ลาในวันที่ไม่มีกะ | ✅ อนุญาต — ใช้ default config |
| 4 | ลาในวันที่ยังไม่มี EmployeeShift | 3-tier resolution + flag `isShiftEstimated=true` |
| 5 | ลาข้ามวันแบบชั่วโมง | ❌ Reject — แนะนำให้แยกเป็น 2 ใบ |
| 6 | ลาข้ามปี | ❌ Reject — แนะนำให้แยก 2 ใบ |
| 7 | ลาเป็นชั่วโมงทับพักเที่ยง | หักช่วงพักออก |
| 8 | ลาเกินโควต้า | ✅ ผ่าน — client เตือน approver ตอน approve |
| 9 | พนักงานลาประเภทที่ไม่มี `EmployeeLeaveSetting` row | ❌ 403 Forbidden |
| 10 | DAILY + SICK + ไม่มี evidence | ✅ Save (PENDING). Approve → isPaid=false |
| 11 | DAILY + SICK + มี evidence | ✅ Save. Approve → isPaid=true |
| 12 | HR ลด limitQuantity ต่ำกว่า used | ต้องส่ง `confirmBelowUsed: true` |
| 13 | Cancel ใบลา APPROVED | ยิง event → Shift re-create + isPaid=false |
| 14 | แก้ไข LeaveRequest PENDING | ลบ Days เก่า + สร้างใหม่ + ไม่แตะ isPaid |
| 15 | พนักงาน 1 วันมีหลายกะ | ลาเต็มวัน = รวม `workMinutes` ทุกกะ |
| 16 | ShiftProvider timeout/error | คืน `null` → fallback default + flag `isShiftEstimated=true` |
| 17 | `LeaveType.allowHourly=false` + `isFullDay=false` | ❌ Reject |
| 18 | HR ลบ `EmployeeLeaveSetting` row หลังมีใบลา APPROVED | ใบลาเก่าคงอยู่ (isPaid snapshot ไม่เปลี่ยน) <br> พนักงานยื่นใหม่ของประเภทนั้นไม่ได้ |
| 19 | HR เปลี่ยน `requiresEvidenceForPay` หลังใบลา APPROVED | ใบลาเก่าไม่กระทบ (snapshot) |
| 20 | HR เปลี่ยน `requiresEvidenceForPay` + ใบลา PENDING ค้าง | ตอน approve ใช้ค่า **ปัจจุบัน** |
| 21 | พนักงาน status = TERMINATED | 🔖 Future: cancel ใบลาในอนาคต auto |
| 22 | Employee Type เปลี่ยนกลางทาง | 🔖 ไม่ออกแบบ — assume ไม่เกิดบ่อย — HR ปรับ settings เอง |

---

## 15. การจัดการ EmployeeLeaveSetting (HR Operations)

### 15.1 Use Cases

| Action | Method | คำอธิบาย |
|--------|--------|---------|
| ดู settings ของพนักงาน | `GET /employees/:id/leave-settings` | List ทุก row |
| เพิ่มสิทธิ์ลาประเภทใหม่ | `POST /leave-settings` | เพิ่ม row (เช่น ให้พนักงาน DAILY ลา VACATION ได้) |
| แก้ limitQuantity | `PATCH /leave-settings/:id` | เปลี่ยนโควต้า |
| แก้ requiresEvidenceForPay | `PATCH /leave-settings/:id` | เปลี่ยน rule |
| ยกเลิกสิทธิ์ | `DELETE /leave-settings/:id` | ลบ row → พนักงานลาประเภทนั้นไม่ได้อีก |
| Reset เป็น default | `POST /employees/:id/leave-settings/reset` | ลบทั้งหมด + seed ใหม่จาก default matrix |

### 15.2 Safeguards

1. **Confirmation flag**: ถ้า `newLimitQuantity < currentUsedDays` → ต้องส่ง `confirmBelowUsed: true` ไม่งั้น 400
2. **Audit**: บังคับกรอก `note` ใน update — 🔖 Future: เก็บ history เต็มรูปแบบ
3. **Notification**: ยิง event `employee.leave-setting.changed` → notify พนักงาน

### 15.3 พฤติกรรมเมื่อแก้ Setting

| สถานการณ์ | ผลกระทบ |
|----------|--------|
| เพิ่ม `limitQuantity` | balance recompute → remainingDays เพิ่มทันที |
| ลด `limitQuantity` ต่ำกว่า used | balance ติดลบ (visible ใน UI) — ยังลาเพิ่มได้แต่ over quota |
| เปลี่ยน `requiresEvidenceForPay` | ใบลาเก่าไม่กระทบ (snapshot), ใบลาใหม่ใช้ค่าใหม่ |
| ลบ row | ใบลาเก่าคงอยู่, พนักงานยื่นใหม่ของประเภทนั้นไม่ได้ |

---

## 16. Daily Leave Summary (Skeleton — รายละเอียดทีหลัง)

> 🔖 **Open Question** — ต้องออกแบบรายละเอียดเพิ่ม

แนวคิดเบื้องต้น:
- รายการพนักงานที่ลาในวันที่เลือก
- Filter ตาม: แผนก, ประเภทลา, สถานะ
- กลุ่มเป้าหมาย: HR, หัวหน้างาน

---

## 17. Leave Reports (Skeleton — รายละเอียดทีหลัง)

> 🔖 **Open Question** — ต้องออกแบบรายละเอียดเพิ่ม

แนวคิดเบื้องต้น:
- รายงานยอดลาแต่ละพนักงาน (ตามประเภท, ตามปี)
- สถิติลาเกินสิทธิ์
- สถิติลาย้อนหลัง
- รายงาน Payroll (ใบลา APPROVED + isPaid=true)
- Export CSV/Excel/PDF

---

## 18. Open Questions / Future Work

| # | หัวข้อ | สถานะ |
|---|-------|------|
| 1 | **Approval Flow** — ใครคือ approver, มีกี่ระดับ, escalation? | 🔖 ยังไม่ออกแบบ |
| 2 | **Shift Reconciliation Service** — reconcile `isShiftEstimated=true` requests | 🔖 Future |
| 3 | **`LeaveSettingTemplate` entity** — HR แก้ default ผ่าน UI ได้ | 🔖 Future |
| 4 | **Audit log** — generic หรือเฉพาะ Leave? | 🔖 ยังไม่ออกแบบ |
| 5 | **Daily Leave Summary** — รายละเอียด | 🔖 Skeleton |
| 6 | **Leave Reports** — รายละเอียด | 🔖 Skeleton |
| 7 | **Notification channels** — email/in-app/Line? | 🔖 ยังไม่ออกแบบ |
| 8 | **TERMINATED employee auto-cancel** | 🔖 Future |
| 9 | **Employee Type change handling** | 🔖 ไม่คิด — HR ปรับเอง |
| 10 | **Pro-rate สำหรับลาออกกลางปี** | 🔖 ยังไม่พิจารณา |
