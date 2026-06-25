# Domain Design — ระบบเงินเดือน (Payroll)

## 1. ภาพรวม Domain Model

```
┌─────────────────┐
│  PayrollPeriod  │  ← Aggregate Root (งวด)
├─────────────────┤
│ id              │
│ year / month    │
│ periodNumber    │──────────────────────────────────────┐
│ employeeType    │                                      │
│ startDate       │                                      │
│ endDate (cutoff)│                                      │
│ payDate         │                                      │
│ status          │                                      │
│ lockedAt/By     │                                      │
│ paidAt/By       │                                      │
└────────┬────────┘                                      │
         │ 1                                             │
         │ has many                                      │
         ▼ N                                             │
┌─────────────────────┐          ┌────────────────────┐  │
│   PayrollRecord     │          │  BankTransferFile  │  │
│ (รายการต่อคนต่องวด)  │◄─────────│ (ไฟล์โอนธนาคาร)   │  │
├─────────────────────┤ generates├────────────────────┤  │
│ id                  │          │ id                 │  │
│ periodId (FK)       │          │ periodId (FK) ─────┘  │
│ employeeId          │          │ bankCode           │
│ ── Snapshots ──     │          │ totalAmount        │
│ employeeType        │          │ employeeCount      │
│ employeeNo          │          │ fileContent        │
│ fullName            │          │ generatedAt/By     │
│ departmentName      │          │ status             │
│ bankCode            │          └────────────────────┘
│ bankAccountNo       │
│ ── Computed Income ─┤          ┌────────────────────┐
│ basePay             │          │  CashPaymentDoc    │
│ otPay               │◄─────────│ (รายการเงินสด)     │
│ specialPay          │ generates├────────────────────┤
│ grossPay            │          │ id                 │
│ ── Deductions ──    │          │ periodId (FK)      │
│ socialSecurityAmt   │          │ totalAmount        │
│ withholdingTax      │          │ employeeCount      │
│ lateDeduction       │          │ generatedAt/By     │
│ otherDeductions     │          └────────────────────┘
│ ── Result ──        │
│ netPay              │
│ status (DRAFT/CONF) │
└──────────┬──────────┘
           │ 1
           │ has many
           ▼ N
┌────────────────────────┐
│    PayrollLineItem     │
│  (รายการรายรับ/รายหัก) │
├────────────────────────┤
│ id                     │
│ recordId (FK)          │
│ categoryCode           │
│ description            │
│ amount (+income/-deduct│
│ sourceType             │
│ sourceId (FK, nullable)│
└────────────────────────┘

┌──────────────────────────┐
│   PayrollCategory        │  ← Master Data (รายรับ/รายหัก)
├──────────────────────────┤
│ id                       │
│ code (unique)            │
│ name                     │
│ categoryType (INC/DED)   │
│ isDefault (bool)         │
│ isActive (bool)          │
│ sortOrder                │
└──────────────────────────┘
        ▲ referenced by PayrollLineItem.categoryCode

─── External Module Integration (Read-Only) ───────────────────────

┌───────────┐   ┌────────────┐   ┌─────────────────────┐   ┌───────────────┐   ┌──────────────────┐
│ Employee  │   │  OTRecord  │   │ SpecialPayRecord     │   │  LeaveRequest │   │ AttendanceRecord │
│ Module    │   │  Module    │   │  Module              │   │  Module       │   │  Module          │
├───────────┤   ├────────────┤   ├─────────────────────┤   ├───────────────┤   ├──────────────────┤
│ baseSalary│   │ approvedOT │   │ approvedSPHours      │   │ approvedLeave │   │ lateMinutes      │
│ dailyWage │   │ hours      │   │ (ไม่มีประเภทย่อย)   │   │ isPaid        │   │ absentDays       │
│ bankAcct  │   │ rate (1.5x │   │ rate = 1.0x          │   │ totalDays     │   │ per period       │
│ type      │   │  / 2.0x)  │   │                      │   │               │   │                  │
└─────▲─────┘   └─────▲──────┘   └──────────▲──────────┘   └───────▲───────┘   └────────▲─────────┘
      │               │                      │                      │                     │
      └───────────────┴──────────────────────┴──────────────────────┴─────────────────────┘
                    Payroll reads these when processing period
                    (via PayrollDataProviders — read-only interfaces)
```

---

## 2. รายละเอียด Entity

### 2.1 PayrollPeriod (งวดเงินเดือน)

> Aggregate Root — ควบคุมสถานะของงวด ป้องกันแก้ไขหลัง lock

| Field          | Type       | Required | Description                                   |
| -------------- | ---------- | -------- | --------------------------------------------- |
| `id`           | UUID       | ✓        | Primary key                                   |
| `year`         | int        | ✓        | ปีงบประมาณ (พ.ศ.)                             |
| `month`        | int (1-12) | ✓        | เดือน                                         |
| `periodNumber` | int (1\|2) | ✓        | งวด 1 (1-15) หรืองวด 2 (16-สิ้นเดือน)         |
| `employeeType` | enum       | ✓        | `MONTHLY` \| `DAILY` (แยกประมวลผล)            |
| `startDate`    | date       | ✓        | วันเริ่มงวด (1 หรือ 16 ของเดือน)              |
| `endDate`      | date       | ✓        | วันปิดงวด (15 หรือสิ้นเดือน)                  |
| `payDate`      | date       | ✓        | วันจ่ายเงิน (18 หรือ 3 ของเดือนถัดไป)         |
| `status`       | enum       | ✓        | `DRAFT` \| `PROCESSING` \| `LOCKED` \| `PAID` |
| `lockedAt`     | timestamp  | –        | เวลาที่ล็อกงวด                                |
| `lockedById`   | UUID       | –        | userId ของผู้ล็อก                             |
| `paidAt`       | timestamp  | –        | เวลาที่บันทึกว่าจ่ายแล้ว                      |
| `paidById`     | UUID       | –        | userId ของผู้ยืนยันการจ่าย                    |
| `note`         | text       | –        | หมายเหตุ                                      |
| `createdAt`    | timestamp  | ✓        |                                               |
| `updatedAt`    | timestamp  | ✓        |                                               |

**Business Rules:**

- Unique constraint: `(year, month, periodNumber, employeeType)` — ห้ามสร้างงวดซ้ำ
- งวด 1: startDate = วันที่ 1, endDate = วันที่ 15, payDate = วันที่ 18
- งวด 2: startDate = วันที่ 16, endDate = สิ้นเดือน, payDate = วันที่ 3 ของเดือนถัดไป
- Status flow: `DRAFT → PROCESSING → LOCKED → PAID`
- เมื่อ `LOCKED` → ห้ามแก้ไข PayrollRecord ใดๆ ใน period นี้
- ยกเลิกการ lock ต้องผ่านกระบวนการ "เปิดงวดใหม่" แยกต่างหาก

---

### 2.2 PayrollRecord (รายการเงินเดือนต่อคน)

> รายการเงินเดือนของพนักงาน 1 คน ใน 1 งวด — ใช้สร้างสลิป

| Field                | Type          | Required | Description                                               |
| -------------------- | ------------- | -------- | --------------------------------------------------------- |
| `id`                 | UUID          | ✓        | Primary key                                               |
| `periodId`           | UUID          | ✓        | FK → PayrollPeriod                                        |
| `employeeId`         | UUID          | ✓        | FK → Employee (logical)                                   |
| `employeeType`       | enum          | ✓        | snapshot: `MONTHLY` \| `DAILY`                            |
| `employeeNo`         | string        | ✓        | snapshot รหัสพนักงาน                                      |
| `fullName`           | string        | ✓        | snapshot ชื่อ-นามสกุล                                     |
| `departmentName`     | string        | ✓        | snapshot ชื่อแผนก                                         |
| `positionName`       | string        | ✓        | snapshot ตำแหน่ง                                          |
| `bankCode`           | string        | –        | snapshot รหัสธนาคาร (MONTHLY เท่านั้น)                    |
| `bankAccountNo`      | string        | –        | snapshot เลขบัญชี (MONTHLY เท่านั้น)                      |
| `basePay`            | decimal(12,2) | ✓        | ค่าจ้างพื้นฐาน (เงินเดือน/ค่าจ้างรายวัน × วันทำงาน)       |
| `otPay`              | decimal(12,2) | ✓        | รวม OT ทั้งงวด (คำนวณจาก OTRecord)                        |
| `specialPay`         | decimal(12,2) | ✓        | เงินพิเศษ (วันหยุดนักขัตฤกษ์, ขึ้นยาง ฯลฯ) default 0      |
| `grossPay`           | decimal(12,2) | ✓        | รายรับรวม = basePay + otPay + specialPay (computed)       |
| `socialSecurityBase` | decimal(12,2) | ✓        | ฐาน SS = basePay เท่านั้น (ไม่รวม OT/special)             |
| `socialSecurityAmt`  | decimal(12,2) | ✓        | ประกันสังคมที่หัก = socialSecurityBase × 5%               |
| `withholdingTax`     | decimal(12,2) | ✓        | ภาษีหัก ณ ที่จ่าย (กรอกโดย HR/Payroll ทุกงวด)             |
| `lateDeduction`      | decimal(12,2) | ✓        | หักสาย (คำนวณจาก AttendanceRecord)                        |
| `otherDeductions`    | decimal(12,2) | ✓        | หักอื่นๆ รวม default 0                                    |
| `netPay`             | decimal(12,2) | ✓        | เงินสุทธิ = grossPay − SS − tax − late − other (computed) |
| `status`             | enum          | ✓        | `DRAFT` \| `CONFIRMED`                                    |
| `createdAt`          | timestamp     | ✓        |                                                           |
| `updatedAt`          | timestamp     | ✓        |                                                           |

**Business Invariants:**

- Unique: `(periodId, employeeId)` — 1 คน 1 งวด มีได้ 1 record
- `socialSecurityBase = basePay` (ห้ามรวม OT หรือ specialPay)
- `grossPay = basePay + otPay + specialPay` (computed, ต้อง consistent)
- `netPay = grossPay − socialSecurityAmt − withholdingTax − lateDeduction − otherDeductions`
- ห้ามแก้ไขเมื่อ `period.status = LOCKED`
- MONTHLY: `bankCode` + `bankAccountNo` ต้องไม่ null (ใช้โอนธนาคาร)
- DAILY: `bankCode`, `bankAccountNo` = null (จ่ายเงินสด)

---

### 2.3 PayrollCategory (Master Data รายรับ/รายหัก)

> Master Data กำหนดหมวดรายรับ/รายหัก — default = built-in, custom = user-defined
> เมื่อสร้างงวดใหม่ ระบบ snapshot รายการที่ `isActive=true` ณ ขณะนั้น

| Field          | Type        | Required | Description                                         |
| -------------- | ----------- | -------- | --------------------------------------------------- |
| `id`           | UUID        | ✓        | Primary key                                         |
| `code`         | string(30)  | ✓        | รหัส unique (เช่น `BASE_SALARY`, `BONUS_DILIGENCE`) |
| `name`         | string(100) | ✓        | ชื่อที่แสดงใน UI และสลิป                            |
| `categoryType` | enum        | ✓        | `INCOME` \| `DEDUCTION`                             |
| `isDefault`    | boolean     | ✓        | true = built-in (ลบไม่ได้, ปิดไม่ได้)               |
| `isActive`     | boolean     | ✓        | false = ซ่อนจากงวดที่สร้างใหม่ (default ปิดไม่ได้)  |
| `sortOrder`    | int         | ✓        | ลำดับ column ใน wizard table                        |
| `createdAt`    | timestamp   | ✓        |                                                     |
| `updatedAt`    | timestamp   | ✓        |                                                     |

**Business Rules:**

- `isDefault = true` → `isActive` lock = true เสมอ ห้าม deactivate ห้ามลบ
- `isDefault = false` → ลบได้เฉพาะถ้าไม่มี `PayrollLineItem` ที่ใช้ `categoryCode` นี้อยู่
- Seed ค่า default 9 หมวด (ดูตาราง Seed ด้านล่าง)

**Default Seed:**

| code              | name              | categoryType | sortOrder |
| ----------------- | ----------------- | ------------ | --------- |
| `WORK_DAYS`       | เวลางานรวม (วัน)  | INCOME       | 1         |
| `BASE_SALARY`     | ฐานเงินเดือน      | INCOME       | 2         |
| `OT_DAYS`         | เวลา OT (วัน)     | INCOME       | 3         |
| `OT_PAY`          | เงิน OT           | INCOME       | 4         |
| `SPECIAL_DAYS`    | เวลาพิเศษ (วัน)   | INCOME       | 5         |
| `SPECIAL_PAY`     | เงินพิเศษ         | INCOME       | 6         |
| `SOCIAL_SECURITY` | ประกันสังคม       | DEDUCTION    | 1         |
| `WITHHOLDING_TAX` | ภาษีหัก ณ ที่จ่าย | DEDUCTION    | 2         |
| `LATE_DEDUCTION`  | หักสาย            | DEDUCTION    | 3         |

---

### 2.4 PayrollLineItem (รายการรายรับ/รายหัก)

> รายละเอียด breakdown ของ PayrollRecord — แสดงในสลิปและใช้ audit
> เก็บทั้ง auto-calculated value และ user-overridden value แยกกัน

| Field              | Type          | Required | Description                                                                                 |
| ------------------ | ------------- | -------- | ------------------------------------------------------------------------------------------- |
| `id`               | UUID          | ✓        |                                                                                             |
| `recordId`         | UUID          | ✓        | FK → PayrollRecord                                                                          |
| `categoryCode`     | string(30)    | ✓        | FK → PayrollCategory.code                                                                   |
| `description`      | string        | ✓        | คำอธิบาย เช่น "OT วันที่ 5 ม.ค."                                                            |
| `autoAmount`       | decimal(12,2) | –        | ค่าที่ระบบคำนวณอัตโนมัติ (null = ไม่ได้คำนวณ)                                               |
| `userAmount`       | decimal(12,2) | –        | ค่าที่ user กรอก/แก้ไข (null = ไม่ได้แก้)                                                   |
| `amount`           | decimal(12,2) | ✓        | ค่าจริงที่ใช้ = `userAmount ?? autoAmount ?? null`                                          |
| `isUserOverridden` | boolean       | ✓        | true = user แก้จากค่า auto (แสดง ✎ ใน UI)                                                   |
| `isDeduction`      | boolean       | ✓        | true = รายหัก                                                                               |
| `sourceType`       | enum          | ✓        | `BASE` \| `OT` \| `SPECIAL_PAY_RECORD` \| `LEAVE` \| `ATTENDANCE` \| `MANUAL` \| `COMPUTED` |
| `sourceId`         | UUID          | –        | อ้างถึง OTRecord.id / LeaveRequest.id (ถ้ามี)                                               |
| `sortOrder`        | int           | ✓        | ลำดับแสดงผลในสลิป                                                                           |
| `createdAt`        | timestamp     | ✓        |                                                                                             |
| `updatedAt`        | timestamp     | ✓        |                                                                                             |

**Business Rules:**

- `amount = userAmount ?? autoAmount` — ถ้า user ไม่แก้ไข ใช้ auto; ถ้าทั้งคู่ null = null (ไม่แสดงในสลิป)
- `isUserOverridden = (userAmount IS NOT NULL)`
- เมื่อ [คำนวณใหม่ทั้งหมด]: update `autoAmount`, **อย่า** reset `userAmount` โดยอัตโนมัติ → ถาม user ก่อน
- null amount = รายการที่ยังไม่กรอก → ไม่นับใน grossPay/netPay, ไม่แสดงในสลิป

---

### 2.4 BankTransferFile (ไฟล์โอนธนาคาร)

> MONTHLY เท่านั้น — สร้างหลัง period LOCKED

| Field           | Type          | Required | Description                                |
| --------------- | ------------- | -------- | ------------------------------------------ |
| `id`            | UUID          | ✓        |                                            |
| `periodId`      | UUID          | ✓        | FK → PayrollPeriod                         |
| `bankCode`      | string        | ✓        | `KRUNGTHAI` (default)                      |
| `totalAmount`   | decimal(12,2) | ✓        | ยอดโอนรวม                                  |
| `employeeCount` | int           | ✓        | จำนวนพนักงาน                               |
| `fileFormat`    | string        | ✓        | รูปแบบไฟล์ตามมาตรฐานธนาคาร                 |
| `filePath`      | string        | –        | path ไฟล์ที่ generate แล้ว                 |
| `status`        | enum          | ✓        | `GENERATED` \| `DOWNLOADED` \| `SUBMITTED` |
| `generatedAt`   | timestamp     | ✓        |                                            |
| `generatedById` | UUID          | ✓        |                                            |
| `downloadedAt`  | timestamp     | –        |                                            |

---

### 2.5 CashPaymentDocument (รายการจ่ายเงินสด)

> DAILY เท่านั้น — พิมพ์ใบเซ็นรับเงิน

| Field           | Type          | Required | Description        |
| --------------- | ------------- | -------- | ------------------ |
| `id`            | UUID          | ✓        |                    |
| `periodId`      | UUID          | ✓        | FK → PayrollPeriod |
| `totalAmount`   | decimal(12,2) | ✓        | ยอดรวม             |
| `employeeCount` | int           | ✓        | จำนวนพนักงาน       |
| `generatedAt`   | timestamp     | ✓        |                    |
| `generatedById` | UUID          | ✓        |                    |

---

## 3. Enumerations

```typescript
enum PayrollPeriodStatus {
  DRAFT = "DRAFT", // กำลังเตรียม ยังไม่คำนวณ
  PROCESSING = "PROCESSING", // กำลังคำนวณ/แก้ไขอยู่
  LOCKED = "LOCKED", // ล็อกแล้ว ห้ามแก้
  PAID = "PAID", // จ่ายเงินแล้ว
}

enum PayrollRecordStatus {
  DRAFT = "DRAFT", // ยังแก้ไขได้
  CONFIRMED = "CONFIRMED", // ยืนยันแล้ว (auto-set ตอน period LOCKED)
}

// PayrollCategoryCode ไม่ใช่ Enum แล้ว — เป็น DB table `payroll_category`
// code string ที่ใช้บ่อย (default built-in):
// INCOME:    WORK_DAYS, BASE_SALARY, OT_DAYS, OT_PAY, SPECIAL_DAYS, SPECIAL_PAY
// DEDUCTION: SOCIAL_SECURITY, WITHHOLDING_TAX, LATE_DEDUCTION
// Custom: user กำหนด code เอง ผ่าน PayrollCategory master data

enum PayrollCategoryType {
  INCOME = "INCOME",
  DEDUCTION = "DEDUCTION",
}

enum PayrollLineSourceType {
  BASE = "BASE", // คำนวณจาก baseSalary/dailyWage
  OT = "OT", // มาจาก OTRecord
  SPECIAL_PAY_RECORD = "SPECIAL_PAY_RECORD", // มาจาก SpecialPayRecord domain
  LEAVE = "LEAVE", // มาจาก LeaveRequest (หักไม่ได้รับเงิน)
  ATTENDANCE = "ATTENDANCE", // มาจาก AttendanceRecord (สาย/ขาด)
  MANUAL = "MANUAL", // กรอกมือ (custom categories เท่านั้น)
  COMPUTED = "COMPUTED", // คำนวณอัตโนมัติ (SS, tax)
}

enum BankTransferFileStatus {
  GENERATED = "GENERATED",
  DOWNLOADED = "DOWNLOADED",
  SUBMITTED = "SUBMITTED", // ส่งธนาคารแล้ว
}

enum EmployeePayType {
  MONTHLY = "MONTHLY",
  DAILY = "DAILY",
}
```

---

## 4. Business Rules ที่สำคัญ

### 4.1 สูตรคำนวณเงินเดือน

```
grossPay    = basePay + otPay + specialPay

SS Base     = basePay  (ห้ามรวม OT, ห้ามรวม specialPay)
SS Amount   = SS Base × 5%

netPay      = grossPay
            − socialSecurityAmt
            − withholdingTax
            − lateDeduction
            − otherDeductions
```

### 4.2 ประกันสังคม (มาตรา 33)

| ประเภท   | หักเมื่อ                            | หมายเหตุ                 |
| -------- | ----------------------------------- | ------------------------ |
| รายเดือน | งวด 2 เท่านั้น (งวดสุดท้ายของเดือน) | `periodNumber = 2`       |
| รายวัน   | ทุกงวด (งวด 1 และ 2)                | ทั้ง 2 งวด               |
| ฐานคำนวณ | basePay เท่านั้น                    | ไม่รวม OT ไม่รวม special |

### 4.3 ภาษีหัก ณ ที่จ่าย

- กรอกรายบุคคลทุกงวด โดย HR Admin หรือ Payroll
- ค่าไม่ Fixed — เปลี่ยนได้ก่อน lock งวดเท่านั้น
- ไม่มีผลย้อนหลัง (งวดที่ lock ไปแล้วไม่กระทบ)
- "กำหนดล่วงหน้า" = กรอกค่าเผื่อไว้ใน record ก่อน lock แล้วเปลี่ยนได้ก่อน lock

### 4.4 OT Rate

| ประเภท                      | Rate |
| --------------------------- | ---- |
| OT วันทำงาน (หลังเวลาเลิก)  | ×1.5 |
| OT วันหยุด ในชั่วโมงกะปกติ  | ×2.0 |
| OT วันหยุด นอกชั่วโมงกะปกติ | ×1.5 |
| OT กะ STR ตี 3 หลัง 12:00   | ×1.5 |

### 4.5 Special Pay Rate

> ใช้สูตรเหมือน OT แต่อัตราคูณ = 1.0 ทุกประเภท — ไม่มีประเภทย่อย

| ประเภทเวลา                 | อัตราคูณ |
| -------------------------- | -------- |
| วันทำงาน (หลังเวลาเลิกงาน) | × 1.0    |
| วันหยุด — ชั่วโมงในกะปกติ  | × 1.0    |
| วันหยุด — ชั่วโมงนอกกะปกติ | × 1.0    |

### 4.6 การจ่ายเงิน

| ประเภท   | วิธีจ่าย               | เงื่อนไข                |
| -------- | ---------------------- | ----------------------- |
| รายเดือน | โอนธนาคาร Krungthai    | ต้องมีเลขบัญชีในโปรไฟล์ |
| รายวัน   | เงินสด (มีช่องเซ็นรับ) | พิมพ์ใบจ่ายเงินสด       |

### 4.7 Period Lock Rules

- เมื่อ lock: status → `LOCKED`, `PayrollRecord.status` ทุกรายการ → `CONFIRMED`
- หลัง lock ห้ามแก้ PayrollRecord ทุกกรณี
- หาก payroll ผิดพลาดหลัง lock → ต้องสร้าง adjustment period ใหม่ (ไม่ unlock)

---

## 5. Database Schema (PostgreSQL)

```sql
-- ============== PAYROLL PERIOD ==============
CREATE TYPE payroll_period_status AS ENUM
  ('DRAFT','PROCESSING','LOCKED','PAID');

CREATE TYPE employee_pay_type AS ENUM
  ('MONTHLY','DAILY');

CREATE TABLE payroll_period (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            SMALLINT NOT NULL,
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_number   SMALLINT NOT NULL CHECK (period_number IN (1, 2)),
  employee_type   employee_pay_type NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  pay_date        DATE NOT NULL,
  status          payroll_period_status NOT NULL DEFAULT 'DRAFT',
  locked_at       TIMESTAMPTZ,
  locked_by_id    UUID,
  paid_at         TIMESTAMPTZ,
  paid_by_id      UUID,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT period_date_order CHECK (end_date >= start_date),
  CONSTRAINT period_unique UNIQUE (year, month, period_number, employee_type)
);

CREATE INDEX idx_payroll_period_status ON payroll_period(status);
CREATE INDEX idx_payroll_period_ym ON payroll_period(year, month);


-- ============== PAYROLL RECORD ==============
CREATE TYPE payroll_record_status AS ENUM ('DRAFT','CONFIRMED');

CREATE TABLE payroll_record (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id             UUID NOT NULL REFERENCES payroll_period(id),
  employee_id           UUID NOT NULL,
  employee_type         employee_pay_type NOT NULL,
  employee_no           VARCHAR(20) NOT NULL,
  full_name             VARCHAR(200) NOT NULL,
  department_name       VARCHAR(100) NOT NULL,
  position_name         VARCHAR(100) NOT NULL,
  bank_code             VARCHAR(20),
  bank_account_no       VARCHAR(30),
  base_pay              NUMERIC(12,2) NOT NULL DEFAULT 0,
  ot_pay                NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_pay             NUMERIC(12,2) GENERATED ALWAYS AS (base_pay + ot_pay + special_pay) STORED,
  social_security_base  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- = base_pay (SS rule)
  social_security_amt   NUMERIC(12,2) NOT NULL DEFAULT 0,
  withholding_tax       NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_deduction        NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay               NUMERIC(12,2) GENERATED ALWAYS AS (
                          base_pay + ot_pay + special_pay
                          - social_security_amt
                          - withholding_tax
                          - late_deduction
                          - other_deductions
                        ) STORED,
  status                payroll_record_status NOT NULL DEFAULT 'DRAFT',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pr_unique_per_period UNIQUE (period_id, employee_id),
  CONSTRAINT pr_ss_base_eq_base CHECK (social_security_base = base_pay)
);

CREATE INDEX idx_pr_period    ON payroll_record(period_id);
CREATE INDEX idx_pr_employee  ON payroll_record(employee_id);
CREATE INDEX idx_pr_period_emp ON payroll_record(period_id, employee_id);


-- ============== PAYROLL CATEGORY (Master Data) ==============
CREATE TYPE payroll_category_type AS ENUM ('INCOME','DEDUCTION');

CREATE TABLE payroll_category (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(30) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  category_type payroll_category_type NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT default_always_active CHECK (
    NOT (is_default = true AND is_active = false)
  )
);

CREATE INDEX idx_pc_type_active ON payroll_category(category_type, is_active);

-- Seed default categories
INSERT INTO payroll_category (code, name, category_type, is_default, sort_order) VALUES
  ('WORK_DAYS',        'เวลางานรวม (วัน)',        'INCOME',    true, 1),
  ('BASE_SALARY',      'ฐานเงินเดือน',            'INCOME',    true, 2),
  ('OT_DAYS',          'เวลา OT (วัน)',           'INCOME',    true, 3),
  ('OT_PAY',           'เงิน OT',                 'INCOME',    true, 4),
  ('SPECIAL_DAYS',     'เวลาพิเศษ (วัน)',          'INCOME',    true, 5),
  ('SPECIAL_PAY',      'เงินพิเศษ',               'INCOME',    true, 6),
  ('SOCIAL_SECURITY',  'ประกันสังคม',              'DEDUCTION', true, 1),
  ('WITHHOLDING_TAX',  'ภาษีหัก ณ ที่จ่าย',        'DEDUCTION', true, 2),
  ('LATE_DEDUCTION',   'หักสาย',                  'DEDUCTION', true, 3);


-- ============== PAYROLL LINE ITEM ==============
CREATE TYPE payroll_line_source AS ENUM
  ('BASE','OT','SPECIAL_PAY_RECORD','LEAVE','ATTENDANCE','MANUAL','COMPUTED');
-- SPECIAL_PAY_RECORD: จาก SpecialPayRecord domain (ไม่มีประเภทย่อย)

CREATE TABLE payroll_line_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id           UUID NOT NULL REFERENCES payroll_record(id) ON DELETE CASCADE,
  category_code       VARCHAR(30) NOT NULL REFERENCES payroll_category(code),
  description         VARCHAR(200) NOT NULL,
  auto_amount         NUMERIC(12,2),      -- ค่าที่ระบบคำนวณ (null = ไม่ได้คำนวณ)
  user_amount         NUMERIC(12,2),      -- ค่าที่ user กรอก/แก้ (null = ไม่ได้แก้)
  amount              NUMERIC(12,2),      -- = COALESCE(user_amount, auto_amount)
  is_user_overridden  BOOLEAN NOT NULL DEFAULT false,
  is_deduction        BOOLEAN NOT NULL,
  source_type         payroll_line_source NOT NULL,
  source_id           UUID,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pli_override_consistent CHECK (
    is_user_overridden = (user_amount IS NOT NULL)
  )
);

CREATE INDEX idx_pli_record    ON payroll_line_item(record_id);
CREATE INDEX idx_pli_overridden ON payroll_line_item(record_id, is_user_overridden)
  WHERE is_user_overridden = true;  -- index สำหรับ query "user-edited cells"


-- ============== BANK TRANSFER FILE ==============
CREATE TYPE bank_transfer_status AS ENUM
  ('GENERATED','DOWNLOADED','SUBMITTED');

CREATE TABLE bank_transfer_file (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       UUID NOT NULL REFERENCES payroll_period(id),
  bank_code       VARCHAR(20) NOT NULL DEFAULT 'KRUNGTHAI',
  total_amount    NUMERIC(12,2) NOT NULL,
  employee_count  INT NOT NULL,
  file_format     VARCHAR(50) NOT NULL,
  file_path       TEXT,
  status          bank_transfer_status NOT NULL DEFAULT 'GENERATED',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by_id UUID NOT NULL,
  downloaded_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_btf_period ON bank_transfer_file(period_id);


-- ============== CASH PAYMENT DOCUMENT ==============
CREATE TABLE cash_payment_document (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       UUID NOT NULL REFERENCES payroll_period(id),
  total_amount    NUMERIC(12,2) NOT NULL,
  employee_count  INT NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by_id UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cpd_period ON cash_payment_document(period_id);
```

---

## 6. Aggregate Boundaries (DDD)

```
┌─────────────────────────────────────────────────────────┐
│               PayrollPeriod Aggregate                   │
│  (Root: PayrollPeriod)                                  │
│  ─────────────────────────────                          │
│  • PayrollPeriod                                        │
│  • PayrollRecord[] (scoped to this period)              │
│  • PayrollLineItem[] (scoped via record)                │
│  • BankTransferFile? (optional, MONTHLY only)           │
│  • CashPaymentDocument? (optional, DAILY only)          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               External (Read-Only)                      │
│  ─────────────────────────────                          │
│  • Employee (baseSalary, bankAccount, type)             │
│  • OTRecord (approved OT per period)                    │
│  • SpecialPayRecord (approved special pay hours)        │
│  • AttendanceRecord (late/absent)                       │
│  • LeaveRequest (approved, isPaid flag)                 │
└─────────────────────────────────────────────────────────┘
```

**กฎสำคัญ:**

- สร้าง/แก้ PayrollRecord ต้องผ่าน PayrollPeriod (ตรวจ status ก่อน)
- หาก `period.status = LOCKED` → throw `PeriodLockedException`
- PayrollLineItem เป็น child ของ PayrollRecord — cascade delete

---

## 7. Cross-Module Interfaces (Read-Only)

```typescript
// PayrollProvider interfaces — Payroll MODULE consumes เท่านั้น

interface IPayrollEmployeeProvider {
  // ดึงข้อมูลพนักงานสำหรับ snapshot + คำนวณ
  getPayrollEmployeeData(
    employeeId: string,
    periodDate: string,
  ): Promise<PayrollEmployeeDto>;
  // return: { employeeNo, fullName, department, position, type,
  //           baseSalary | dailyWage, bankCode, bankAccountNo }
}

interface IOTProvider {
  // ดึง OT ที่ approved ของพนักงานในช่วงงวด
  getApprovedOTByPeriod(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Map<string, OTSummaryDto>>;
  // OTSummaryDto: { totalOTPay, items: [{ date, hours, rate, amount }] }
}

interface IAttendancePayrollProvider {
  // ดึงข้อมูลสาย/ขาดสำหรับคำนวณหัก
  getAttendanceSummary(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Map<string, AttendanceSummaryDto>>;
  // AttendanceSummaryDto: { lateMinutes, lateDeduction, absentDays, absentDeduction }
}

interface ILeavePayrollProvider {
  // ดึง leave ที่มีผลกับเงินเดือน (isPaid = false = หักเงิน)
  getLeavePayrollSummary(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Map<string, LeavePayrollSummaryDto>>;
  // LeavePayrollSummaryDto: { unpaidDays, unpaidDeduction }
}

interface ISpecialPayProvider {
  // ดึง special pay ที่ approved ของพนักงานในช่วงงวด
  getApprovedSpecialPayByPeriod(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Map<string, SpecialPaySummaryDto>>;
  // SpecialPaySummaryDto: { totalSpecialPayDays, totalSpecialPay,
  //   items: [{ date, hours, hourlyRate, amount }] }  ← ไม่มี specialPayType
}
```

---

## 8. Domain Events

```typescript
PayrollPeriodCreated      { periodId, year, month, periodNumber, employeeType }
PayrollPeriodProcessing   { periodId }
PayrollPeriodLocked       { periodId, lockedById, recordCount, totalNetPay }
PayrollPeriodPaid         { periodId, paidById, paidAt }

PayrollRecordCalculated   { recordId, employeeId, netPay }
PayrollRecordUpdated      { recordId, employeeId, field, oldValue, newValue }

BankTransferFileGenerated { fileId, periodId, totalAmount, employeeCount }
CashPaymentDocGenerated   { docId, periodId, totalAmount, employeeCount }
```

---

## 9. Open Questions / ขอยืนยัน

| #   | หัวข้อ                                                   | สถานะ                                                     |
| --- | -------------------------------------------------------- | --------------------------------------------------------- |
| 1   | เงินเดือนรายวัน: คำนวณจากจำนวนวันทำงานจริงหรือวันปฏิทิน? | ✅ วันทำงานจริง (actual working days)                     |
| 2   | กรณีพนักงานเข้าหรือออกกลางงวด: pro-rate ยังไง?           | ✅ ไม่ pro-rate — ได้รับ basePay เต็มงวด (baseSalary / 2) |
| 3   | ฐาน SS ของรายวัน: ใช้ค่าจ้างต่อวัน × วันทำงาน?           | ✅ ใช่ — SS Base = dailyWage × วันทำงานจริง = basePay     |
| 4   | เงินพิเศษ (specialPay): มีประเภทอะไรบ้าง? ใครบันทึก?     | ✅ ไม่มีประเภทย่อย — เป็นรายรับระดับเดียวกับ OT/basePay   |
| 5   | กองทุนสำรองเลี้ยงชีพ: มีหรือไม่?                         | ✅ ไม่มี                                                  |
