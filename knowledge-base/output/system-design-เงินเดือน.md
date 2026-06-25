# System Design — ระบบเงินเดือน (Payroll Module)

## 1. Module Overview

```
src/modules/payroll/
├── payroll.module.ts
├── enums/
│   ├── payroll-period-status.enum.ts
│   ├── payroll-record-status.enum.ts
│   ├── payroll-category-type.enum.ts     // INCOME | DEDUCTION (ไม่ใช่ enum ของ code แล้ว)
│   ├── payroll-line-source.enum.ts
│   └── bank-transfer-status.enum.ts
├── entities/
│   ├── payroll-category.entity.ts        // Master Data
│   ├── payroll-period.entity.ts
│   ├── payroll-record.entity.ts
│   ├── payroll-line-item.entity.ts
│   ├── bank-transfer-file.entity.ts
│   └── cash-payment-document.entity.ts
├── dto/
│   ├── create-payroll-period.dto.ts
│   ├── process-payroll.dto.ts
│   ├── update-withholding-tax.dto.ts
│   ├── lock-period.dto.ts
│   ├── mark-paid.dto.ts
│   ├── payroll-record-response.dto.ts
│   ├── payslip.dto.ts
│   └── payroll-summary.dto.ts
├── services/
│   ├── payroll-category.service.ts        // CRUD Master Data รายรับ/รายหัก
│   ├── payroll-period.service.ts          // CRUD งวด + status transitions
│   ├── payroll-calculation.service.ts     // สูตรคำนวณ (pure/stateless)
│   ├── payroll-processing.service.ts      // orchestrate wizard steps
│   ├── payroll-record.service.ts          // CRUD records + line items + user override
│   ├── payroll-report.service.ts          // สลิป, ภ.ง.ด., สปส.
│   ├── bank-transfer.service.ts           // generate bank file (MONTHLY)
│   └── cash-payment.service.ts           // generate cash list (DAILY)
├── controllers/
│   ├── payroll-category.controller.ts     // Master Data CRUD
│   ├── payroll-period.controller.ts
│   ├── payroll-processing.controller.ts   // wizard endpoints
│   ├── payroll-record.controller.ts
│   ├── payslip.controller.ts
│   └── payroll-report.controller.ts
├── interfaces/
│   ├── payroll-employee-provider.interface.ts
│   ├── ot-provider.interface.ts
│   ├── special-pay-provider.interface.ts
│   ├── attendance-payroll-provider.interface.ts
│   └── leave-payroll-provider.interface.ts
├── guards/
│   └── period-lock.guard.ts               // ป้องกันแก้ไข record หลัง lock
└── exceptions/
    ├── period-locked.exception.ts
    └── period-not-found.exception.ts
```

---

## 2. Service Layer

### 2.1 `PayrollCategoryService` (Master Data)

```typescript
class PayrollCategoryService {
  // ดึง categories ทั้งหมด (สำหรับ UI Master Data page)
  async findAll(filter?: { type?: PayrollCategoryType; isActive?: boolean }): Promise<PayrollCategory[]>

  // ดึง active categories ที่จะใช้ในงวดใหม่ (เรียงตาม sortOrder)
  async getActiveCategories(type?: PayrollCategoryType): Promise<PayrollCategory[]>

  // สร้าง custom category
  async create(dto: CreatePayrollCategoryDto, userId: string): Promise<PayrollCategory>
  // validate: code unique, isDefault = false

  // แก้ไข (ชื่อ, sortOrder, isActive)
  async update(id: string, dto: UpdatePayrollCategoryDto, userId: string): Promise<PayrollCategory>
  // guard: isDefault = true → ห้ามแก้ isActive, ห้ามลบ

  // ลบ custom category
  async delete(id: string, userId: string): Promise<void>
  // guard: isDefault = true → 403
  // guard: มี PayrollLineItem ที่ใช้ code นี้ → 409 (soft-delete แทน)

  // toggle isActive (custom เท่านั้น)
  async toggleActive(id: string, userId: string): Promise<PayrollCategory>
}
```

---

### 2.2 `PayrollPeriodService`

```typescript
class PayrollPeriodService {
  // สร้างงวดใหม่
  async create(dto: CreatePayrollPeriodDto, userId: string): Promise<PayrollPeriod>

  // ดึงงวดทั้งหมด / filter by year/month/type/status
  async findAll(filter: PayrollPeriodFilterDto): Promise<PayrollPeriod[]>

  async findOne(id: string): Promise<PayrollPeriod>

  // Transition: DRAFT → PROCESSING (เริ่มคำนวณ)
  async startProcessing(periodId: string, userId: string): Promise<PayrollPeriod>

  // Transition: PROCESSING → LOCKED (ล็อกงวด — final step ของ wizard)
  async lock(periodId: string, userId: string): Promise<PayrollPeriod>

  // Transition: LOCKED → PAID (บันทึกการจ่ายจริง)
  async markAsPaid(periodId: string, paidAt: Date, userId: string): Promise<PayrollPeriod>

  // ตรวจว่า period นี้ edit ได้ไหม
  private assertEditable(period: PayrollPeriod): void  // throw PeriodLockedException ถ้า LOCKED/PAID
}
```

---

### 2.2 `PayrollCalculationService` (Pure / Stateless)

```typescript
class PayrollCalculationService {
  // คำนวณ base pay สำหรับงวด
  calculateBasePay(
    employeeType: EmployeePayType,
    baseSalary: number,   // monthly salary หรือ daily wage per day
    workingDays: number,  // วันทำงานในงวด (สำหรับ DAILY)
    period: { startDate: string; endDate: string },
  ): number

  // คำนวณ OT pay รวม
  calculateOTPay(otItems: OTLineItem[]): number

  // คำนวณ special pay รวม — สูตรเหมือน OT แต่ rate = 1.0 (ไม่มีประเภทย่อย)
  calculateSpecialPay(specialPayItems: SpecialPayLineItem[]): number
  // specialPayLineItem: { hours: number; hourlyRate: number } → amount = hours × hourlyRate × 1.0

  // คำนวณ SS amount
  calculateSocialSecurity(
    basePay: number,
    employeeType: EmployeePayType,
    periodNumber: 1 | 2,
    ssRate: number,  // default 0.05 (5%)
  ): { ssBase: number; ssAmt: number }
  // MONTHLY + periodNumber=1 → ssAmt = 0 (หักงวด 2 เท่านั้น)
  // DAILY → หักทุกงวด

  // คำนวณหักสาย
  calculateLateDeduction(
    lateMinutes: number,
    hourlyRate: number,
  ): number

  // คำนวณ net pay
  calculateNetPay(record: PayrollRecordInputDto): number
}
```

---

### 2.3 `PayrollProcessingService` (Wizard Orchestrator)

> Orchestrate การประมวลผลทีละ step

```typescript
class PayrollProcessingService {
  // Step 1: ดึงข้อมูลพนักงานในงวดนี้ + preview ก่อนคำนวณ
  async getProcessingPreview(periodId: string): Promise<ProcessingPreviewDto>
  // return: list พนักงาน + สถานะข้อมูล (OT มีไหม, attendance ครบไหม)

  // Step 2: คำนวณเงินเดือนทั้งงวด (batch)
  async calculateAll(periodId: string, userId: string): Promise<PayrollRecord[]>
  // 1. ดึงพนักงานทุกคนตาม employeeType ของ period
  // 2. batch query: OT, Attendance, Leave (1 call per provider)
  // 3. คำนวณต่อคน → INSERT/UPDATE PayrollRecord + PayrollLineItem
  // 4. period.status → PROCESSING

  // Step 3: อัพเดต withholding tax รายบุคคล
  async updateWithholdingTax(
    recordId: string,
    amount: number,
    userId: string,
  ): Promise<PayrollRecord>

  // Step 4: Preview summary ก่อน lock (ใช้แสดง Step 2 review table)
  async getSummary(periodId: string): Promise<PayrollSummaryDto>
  // return: {
  //   totalGross, totalSS, totalTax, totalNet, employeeCount,
  //   // สำหรับ Step 2 table — รายบุคคล พร้อม line items ครบทุกหมวด (default + custom รวมกัน)
  //   employees: Array<{
  //     recordId, employeeNo, fullName,
  //     incomeItems: { categoryCode, name, amount, isUserOverridden }[],  // เรียง sortOrder
  //     deductionItems: { categoryCode, name, amount, isUserOverridden }[], // เรียง sortOrder
  //     grossPay, totalDeductions, netPay,
  //   }>,
  //   userOverrideCount: number,  // จำนวนเซลล์ที่ user แก้ (แสดงใน ⚠️)
  // }

  // Step 5: Lock + generate outputs
  async lockAndGenerate(periodId: string, userId: string): Promise<LockResultDto>
  // 1. assertEditable(period)
  // 2. period.status → LOCKED + set confirmed on all records
  // 3. MONTHLY: generate BankTransferFile
  // 4. DAILY: generate CashPaymentDocument
  // 5. emit PayrollPeriodLocked event
}
```

---

### 2.4 `PayrollRecordService`

```typescript
class PayrollRecordService {
  async findByPeriod(periodId: string, filter?: RecordFilterDto): Promise<PayrollRecord[]>

  async findOne(id: string): Promise<PayrollRecord>

  // User แก้ไขค่าใน cell ของ PayrollLineItem
  async overrideLineItemValue(
    lineItemId: string,
    userAmount: number | null,   // null = ยกเลิก override กลับไปใช้ autoAmount
    userId: string,
  ): Promise<PayrollLineItem>
  // 1. assertEditable(period)
  // 2. UPDATE payroll_line_item SET user_amount = userAmount,
  //                                  is_user_overridden = (userAmount IS NOT NULL),
  //                                  amount = COALESCE(userAmount, auto_amount)
  // 3. recalc PayrollRecord.netPay (aggregate)

  // ดึงรายการ line items ที่ user แก้ไข (สำหรับ summary modal)
  async getUserOverriddenItems(periodId: string): Promise<UserOverrideItemDto[]>
  // return: [{ employeeNo, fullName, categoryName, autoAmount, userAmount }]

  // Recalculate auto values (ดึงจาก providers ใหม่)
  // เซลล์ที่ user override ไว้จะ UPDATE autoAmount เท่านั้น ไม่แตะ userAmount
  async recalculate(id: string, userId: string): Promise<PayrollRecord>

  // Recalculate ทั้งงวด (batch)
  async recalculateAll(periodId: string, userId: string): Promise<PayrollRecord[]>
}
```

**Override Logic (สำคัญ):**

```typescript
async overrideLineItemValue(lineItemId, userAmount, userId) {
  const item = await this.lineItemRepo.findOne({
    where: { id: lineItemId },
    relations: ['record', 'record.period'],
  });

  this.assertEditable(item.record.period);  // throw if LOCKED/PAID

  item.userAmount = userAmount;
  item.isUserOverridden = userAmount !== null;
  item.amount = userAmount ?? item.autoAmount;  // null amount = ไม่แสดงในสลิป

  await this.lineItemRepo.save(item);

  // recalc netPay ของ record นี้
  await this.recomputeRecordTotals(item.recordId);

  return item;
}

async recalculateAll(periodId, userId) {
  // re-fetch auto values จาก providers
  // สำหรับแต่ละ line item:
  //   UPDATE auto_amount = newValue
  //   amount = COALESCE(user_amount, newValue)  ← user override ยังอยู่
  // ไม่ reset user_amount ทุกกรณี
}
```

---

### 2.5 `PayrollReportService`

```typescript
class PayrollReportService {
  // สร้างสลิปรายบุคคล (PDF/HTML)
  async generatePayslip(recordId: string): Promise<PayslipDto>

  // สลิปรายงวด (batch)
  async generateAllPayslips(periodId: string): Promise<PayslipDto[]>

  // รายงานประจำงวด (สรุปเงินเดือน)
  async getPeriodReport(
    periodId: string,
    filter?: { departmentId?: string; employeeType?: EmployeePayType },
  ): Promise<PeriodReportDto>

  // ภ.ง.ด.1 (ภาษีรายเดือน)
  async generatePND1(year: number, month: number): Promise<PND1ReportDto>

  // ภ.ง.ด.1ก (ภาษีรายปี)
  async generatePND1A(year: number): Promise<PND1AReportDto>

  // หนังสือรับรองการหักภาษี ณ ที่จ่าย (ทวิ 50)
  async generateWithholdingCertificate(
    employeeId: string,
    year: number,
  ): Promise<WithholdingCertDto>

  // สปส.1-10 (ประกันสังคมรายเดือน)
  async generateSSO110(year: number, month: number): Promise<SSO110ReportDto>

  // กท.20 (กองทุนเงินทดแทน)
  async generateWorkersComp(year: number): Promise<WorkersCompReportDto>
}
```

---

### 2.6 `BankTransferService`

```typescript
class BankTransferService {
  // Generate Krungthai Payroll file format
  async generate(periodId: string, userId: string): Promise<BankTransferFile>
  // 1. ดึง PayrollRecord ทุก MONTHLY ของงวดนี้
  // 2. Format ตาม Krungthai spec (fixed-width / CSV ตาม config)
  // 3. INSERT BankTransferFile row
  // 4. Return file object

  async download(fileId: string): Promise<Buffer>

  async markSubmitted(fileId: string, userId: string): Promise<BankTransferFile>
}
```

---

## 3. API Endpoints

### 3.0 Category Master Data

```
GET    /payroll/categories                    รายการ categories ทั้งหมด  [HR Admin, Payroll]
POST   /payroll/categories                    สร้าง custom category       [HR Admin, Payroll]
PATCH  /payroll/categories/:id                แก้ชื่อ / sortOrder         [HR Admin, Payroll]
PATCH  /payroll/categories/:id/toggle-active  เปิด/ปิด custom category    [HR Admin, Payroll]
DELETE /payroll/categories/:id                ลบ custom category          [HR Admin, Payroll]
```

### 3.1 Period Management

```
POST   /payroll/periods                       สร้างงวดใหม่           [Payroll]
GET    /payroll/periods                       รายการงวด              [HR, Payroll]
GET    /payroll/periods/:id                   รายละเอียดงวด          [HR, Payroll]
POST   /payroll/periods/:id/start             เริ่มประมวลผล          [Payroll]
POST   /payroll/periods/:id/lock              ล็อกงวด               [Payroll]
POST   /payroll/periods/:id/mark-paid         บันทึกว่าจ่ายแล้ว     [Payroll]
```

### 3.2 Payroll Processing (Wizard)

```
GET    /payroll/periods/:id/preview           ดู preview ก่อนคำนวณ  [Payroll]
POST   /payroll/periods/:id/calculate         คำนวณทั้งงวด          [Payroll]
GET    /payroll/periods/:id/summary           Step 2 review table (รายบุคคล + ยอดรวม)  [Payroll]
```

### 3.3 Records & Line Item Override

```
GET    /payroll/periods/:id/records              รายการพนักงานในงวด + line items   [HR, Payroll]
GET    /payroll/records/:id                      รายละเอียด 1 record               [HR, Payroll]
PATCH  /payroll/line-items/:id/override          user override ค่าใน cell          [HR Admin, Payroll]
                                                 body: { userAmount: number|null }
GET    /payroll/periods/:id/user-overrides        รายการ cell ที่ user แก้ไข        [HR, Payroll]
POST   /payroll/records/:id/recalculate          คำนวณซ้ำ 1 คน                    [Payroll]
POST   /payroll/periods/:id/recalculate-all      คำนวณซ้ำทั้งงวด                   [Payroll]
```

### 3.4 Payslips

```
GET    /payroll/records/:id/payslip           สลิปรายบุคคล (HR view) [HR, Payroll]
GET    /payroll/me/payslips                   สลิปของฉัน             [Employee+]
GET    /payroll/me/payslips/:periodId         สลิปงวดใดงวดหนึ่ง      [Employee+]
```

### 3.5 Output Files

```
POST   /payroll/periods/:id/bank-transfer     Generate bank file     [Payroll]
GET    /payroll/bank-transfer/:fileId         Download              [Payroll]
POST   /payroll/bank-transfer/:fileId/submit  Mark submitted        [Payroll]
POST   /payroll/periods/:id/cash-payment      Generate cash list    [Payroll]
GET    /payroll/cash-payment/:docId/print     Print PDF             [Payroll]
```

### 3.6 Reports

```
GET    /payroll/reports/period/:periodId      รายงานประจำงวด        [HR, Payroll]
GET    /payroll/reports/pnd1                  ภ.ง.ด.1              [Payroll]
GET    /payroll/reports/pnd1a                 ภ.ง.ด.1ก             [Payroll]
GET    /payroll/reports/certificate/:empId    ทวิ 50               [Payroll]
GET    /payroll/reports/sso110                สปส.1-10             [Payroll]
GET    /payroll/reports/workers-comp          กท.20                [Payroll]
GET    /payroll/reports/attendance            รายงานเข้า-ออก        [Head, HR, Payroll]
```

---

## 4. Integration Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     Payroll Module                                 │
│                                                                    │
│  ┌─────────────────────────────────────────────────┐              │
│  │         PayrollProcessingService                │              │
│  │  ─────────────────────────────────────────────  │              │
│  │  1. getPayrollEmployees()  ──► IEmployeeProvider│──► Employee  │
│  │  2. getApprovedOT()        ──► IOTProvider      │──► OT Module │
│  │  3. getApprovedSpecialPay()──► ISpecialPayProv  │──► SpecialPay│
│  │  4. getAttendanceSummary() ──► IAttendProvider  │──► Attendance│
│  │  5. getLeavePayrollData()  ──► ILeaveProvider   │──► Leave Mod │
│  │                                                 │              │
│  │  All providers: batch query (1 call per step)   │              │
│  └─────────────────────────────────────────────────┘              │
│                                                                    │
│  ┌──────────────────┐  ┌───────────────────┐                      │
│  │ PayrollCalcSvc   │  │ PayrollReportSvc   │                      │
│  │ (pure functions) │  │ (PDF/Excel gen)    │                      │
│  └──────────────────┘  └───────────────────┘                      │
└────────────────────────────────────────────────────────────────────┘
```

**Integration Rules:**
- Payroll module **อ่านอย่างเดียว** จาก module อื่น — ไม่เขียนกลับ
- ใช้ interface abstraction (Anti-Corruption Layer)
- Batch query ก่อน loop เสมอ (ป้องกัน N+1 problem)
- ถ้า provider ตอบไม่ได้ → throw `ProviderUnavailableException` (ห้าม silently skip)

---

## 5. Permission Matrix

| Action | Employee | Dept Head | Factory Mgr | GM | HR Monthly | HR Daily | Payroll | Sys Admin |
|--------|----------|-----------|-------------|-----|-----------|---------|---------|-----------|
| ดูสลิปตัวเอง | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| ดูสลิปพนักงาน | - | - | - | - | รายเดือน | รายวัน | ทั้งหมด | - |
| สร้าง/จัดการ Period | - | - | - | - | - | - | ✓ | - |
| คำนวณ/ล็อก Period | - | - | - | - | - | - | ✓ | - |
| กรอก Withholding Tax | - | - | - | - | รายเดือน | รายวัน | ✓ | - |
| Generate Bank File | - | - | - | - | - | - | ✓ | - |
| ออกรายงานกฎหมาย | - | - | - | - | - | - | ✓ | - |
| ดูรายงานประจำงวด | - | - | - | - | รายเดือน | รายวัน | ✓ | - |

---

## 6. PeriodLock Guard

```typescript
// guards/period-lock.guard.ts
@Injectable()
export class PeriodLockGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const recordId = context.switchToHttp().getRequest().params.id;
    const record = await this.recordRepo.findOne({
      where: { id: recordId },
      relations: ['period'],
    });

    if (!record) throw new NotFoundException();

    if (record.period.status === PayrollPeriodStatus.LOCKED ||
        record.period.status === PayrollPeriodStatus.PAID) {
      throw new ForbiddenException(
        `Period ${record.period.id} is ${record.period.status} — cannot modify records`
      );
    }

    return true;
  }
}
```

---

## 7. Payroll Calculation Flow (Step-by-Step)

```
calculateAll(periodId):

1. ดึง period → validate status ≠ LOCKED/PAID

2. ดึงพนักงานในระบบที่ employeeType ตรงกับ period.employeeType
   (status = ACTIVE เท่านั้น)

3. ดึง active PayrollCategories (snapshot ณ วันนี้)
   activeCategories = PayrollCategoryService.getActiveCategories()

4. Batch query (parallel):
   employees      = IEmployeeProvider.getBatch(employeeIds, period.endDate)
   otData         = IOTProvider.getApprovedOTByPeriod(employeeIds, startDate, endDate)
   specialPayData = ISpecialPayProvider.getApprovedSpecialPayByPeriod(employeeIds, startDate, endDate)
   attendance     = IAttendanceProvider.getAttendanceSummary(employeeIds, startDate, endDate)
   leaveData      = ILeaveProvider.getLeavePayrollSummary(employeeIds, startDate, endDate)

5. For each employee:
   a. UPSERT payroll_record (snapshot employee data)

   b. Compute autoAmount per default category:
      WORK_DAYS:        attendance.workingDays
      BASE_SALARY:      calcBasePay(type, wage, workingDays)
      OT_DAYS:          otData.totalOTDays
      OT_PAY:           calcOTPay(otData.items)
      SPECIAL_DAYS:     specialPayData.totalSpecialPayDays
      SPECIAL_PAY:      calcSpecialPay(specialPayData.items)  // rate × 1.0
      SOCIAL_SECURITY:  calcSS(basePay, type, periodNumber).ssAmt
      WITHHOLDING_TAX:  null  (user กรอกเอง)
      LATE_DEDUCTION:   calcLateDeduction(attendance.lateMinutes)

   c. Custom categories: autoAmount = null (user กรอกเอง ทุกตัว)

   d. For each line item — preserve user override:
      - ถ้ามี record เก่า (recalculate):
        UPDATE auto_amount = newAutoAmount
        amount = COALESCE(user_amount, newAutoAmount)
        → ไม่แตะ user_amount (preserve override ✎)
      - ถ้าไม่มี record (calculate ใหม่):
        INSERT { autoAmount, userAmount=null, amount=autoAmount, isUserOverridden=false }

   e. recomputeRecordTotals(recordId)
      → grossPay / netPay จาก line items ที่ amount IS NOT NULL เท่านั้น

6. period.status → PROCESSING

7. Return PayrollRecord[]
```

---

## 8. Social Security Calculation Logic

```typescript
calculateSocialSecurity(
  basePay: number,
  employeeType: EmployeePayType,
  periodNumber: 1 | 2,
  ssRate = 0.05,
): { ssBase: number; ssAmt: number } {

  // MONTHLY: หักงวด 2 เท่านั้น
  if (employeeType === EmployeePayType.MONTHLY && periodNumber === 1) {
    return { ssBase: basePay, ssAmt: 0 };
  }

  // DAILY: หักทุกงวด
  // MONTHLY งวด 2: หัก
  const ssBase = basePay;  // ไม่รวม OT ไม่รวม special — ตาม domain rule
  const ssAmt = ssBase * ssRate;

  return { ssBase, ssAmt };
}
```

---

## 9. Payslip Structure (สลิป)

```typescript
interface PayslipDto {
  // Header
  companyName: string;
  employeeNo: string;
  fullName: string;
  department: string;
  position: string;
  period: { year: number; month: number; periodNumber: number };
  payDate: string;

  // Income items
  incomeItems: PayslipLineItem[];
  totalIncome: number;

  // Deduction items
  deductionItems: PayslipLineItem[];
  totalDeductions: number;

  // Summary
  grossPay: number;
  netPay: number;

  // Payment info
  paymentMethod: 'BANK_TRANSFER' | 'CASH';
  bankCode?: string;
  bankAccountNo?: string;
}

interface PayslipLineItem {
  label: string;    // "เงินเดือน", "OT วันธรรมดา", "ประกันสังคม", ...
  amount: number;
}
```

---

## 10. Krungthai Bank File Format

```typescript
// format ตามมาตรฐาน Krungthai Corporate Payroll
// ตัวอย่าง fixed-width format:
// [employee_bank_ref(20)][account_no(12)][amount(12)][name(100)][ref(20)]

interface KrungthaiBankRecord {
  bankRef: string;      // รหัสพนักงานในระบบธนาคาร (Mapping จาก Payroll Config)
  accountNo: string;    // เลขบัญชีปลายทาง
  amount: string;       // ยอดโอน (padded, no decimal point × 100)
  name: string;         // ชื่อผู้รับ
  referenceNo: string;  // period reference
}

// BankTransferConfig (Sys Admin ตั้ง):
// - bankCode: 'KRUNGTHAI'
// - fileFormat: 'FIXED_WIDTH' | 'CSV'
// - employeeIdMapping: Map<internalId, bankRef>
```

---

## 11. Error Handling

| Error | HTTP | Message |
|-------|------|---------|
| `PeriodLockedException` | 403 | "งวด [id] ถูกล็อกแล้ว ไม่สามารถแก้ไขได้" |
| `PeriodNotFoundException` | 404 | "ไม่พบงวดที่ระบุ" |
| `DuplicatePeriodException` | 409 | "มีงวด [year/month/periodNo/type] อยู่แล้ว" |
| `ProviderUnavailableException` | 503 | "ไม่สามารถดึงข้อมูลจาก [module] ได้ กรุณาลองใหม่" |
| `InvalidStatusTransitionException` | 422 | "ไม่สามารถเปลี่ยนสถานะจาก [A] ไป [B] ได้" |

---

## 12. Future Work

| # | หัวข้อ |
|---|--------|
| 1 | Payroll adjustment period (เปิด period ใหม่หลัง lock) |
| 2 | Employer SS report (นายจ้างจ่าย 5% — สำหรับ สปส.1-10) |
| 3 | Pro-rate สำหรับพนักงานเข้า/ออกกลางงวด (ปัจจุบัน: ไม่ pro-rate) |
| 4 | Payroll audit log (ใครแก้อะไรเมื่อไหร่) |
| 5 | Pro-rate สำหรับพนักงานเข้า/ออกกลางงวด |
| 6 | Employee salary history → ใช้ใน report ทวิ 50 |
| 7 | Multi-currency support |
