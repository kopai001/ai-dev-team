# Knowledge Base Index — CLRS (Chana Latex HR System)

> อัปเดตล่าสุด: 2026-05-29
> อ่านไฟล์นี้ก่อนเปิดไฟล์อื่น — ประหยัด token, เข้าใจโครงสร้างเร็ว

---

## โครงสร้าง (Structure)

```
knowledge-base/
├── INDEX.md                          ← ไฟล์นี้ (อ่านก่อน)
├── requirement/
│   └── CLRS_Dev_Spec.md              ← Developer Spec ฉบับเต็ม (DEV HANDOFF v1.0)
├── working-file/
│   ├── Employee_Requirement.md       ← Requirement โมดูลพนักงาน
│   ├── domain - กะการทำงาน.md        ← Domain Model: Shift Planning
│   ├── domain - การลา.md             ← Domain Model: Leave Management
│   ├── flow - กะการทำงาน.md          ← Flow: หน้าวางแผนการทำงาน
│   └── flow - การลา.md               ← Flow: โมดูลการลา
└── output/
    ├── domain-เงินเดือน.md            ← Domain Model: Payroll (entities, DB schema, business rules)
    ├── system-design-เงินเดือน.md     ← System Design: Payroll (services, APIs, integrations)
    └── flow-เงินเดือน.md              ← UI/UX Flow: Payroll (wizard, slips, bank file, cash list)
```

---

## สรุปแต่ละไฟล์ (File Summary)

### requirement/

| ไฟล์ | เนื้อหา | ใช้เมื่อ |
|------|---------|---------|
| `CLRS_Dev_Spec.md` | Developer Handoff spec ฉบับรวม — บริษัท จะนะน้ำยาง จำกัด, ระบบ HR + Payroll, ประชุม 15 พ.ค. 2569 | ต้องการ business context / system overview ทั้งหมด |

### working-file/

| ไฟล์ | เนื้อหา | ใช้เมื่อ |
|------|---------|---------|
| `Employee_Requirement.md` | Requirement โมดูลพนักงาน — org structure, position level, employee profile, personal info, emergency contact | ออกแบบ/พัฒนาโมดูล Employee |
| `domain - กะการทำงาน.md` | Domain Model: `Employee`, `Shift`, `ShiftAssignment`, `EmployeeShift` — entity/attribute/relation | ออกแบบ DB schema หรือ business logic กะ |
| `domain - การลา.md` | Domain Model: `LeaveType`, `EmployeeLeaveSetting`, leave request entities | ออกแบบ DB schema หรือ business logic การลา |
| `flow - กะการทำงาน.md` | UI/UX flow + domain model สำหรับหน้าวางแผนกะ | พัฒนา frontend หน้า Shift Planning |
| `flow - การลา.md` | UI/UX flow + domain model สำหรับโมดูลการลา | พัฒนา frontend/backend โมดูล Leave |

### output/

| ไฟล์ | เนื้อหา | ใช้เมื่อ |
|------|---------|---------|
| `domain-เงินเดือน.md` | Domain Model: `PayrollPeriod`, `PayrollRecord`, `PayrollLineItem`, `BankTransferFile` — entities, DB schema, business rules, SS/tax logic | ออกแบบ DB schema หรือ business logic เงินเดือน |
| `system-design-เงินเดือน.md` | System Design: module structure, services (PayrollProcessing wizard, Calculation, Reports), API endpoints, integration interfaces | พัฒนา Payroll module backend |
| `flow-เงินเดือน.md` | UI/UX flow: Payroll wizard (5 steps), withholding tax screen, payslip, bank transfer file, cash payment list, payment status | พัฒนา frontend โมดูลเงินเดือน |

---

## แผนที่โมดูล (Module Map)

| โมดูล | Requirement | Domain | Flow | System Design |
|-------|-------------|--------|------|---------------|
| Employee Management | `Employee_Requirement.md` | — | — | — |
| Shift Planning (กะ) | `CLRS_Dev_Spec.md` | `domain - กะการทำงาน.md` | `flow - กะการทำงาน.md` | — |
| Leave Management (ลา) | `CLRS_Dev_Spec.md` | `domain - การลา.md` | `flow - การลา.md` | — |
| Payroll (เงินเดือน) | `CLRS_Dev_Spec.md` | `output/domain-เงินเดือน.md` | `output/flow-เงินเดือน.md` | `output/system-design-เงินเดือน.md` |

---

## วิธีใช้ (How to Use)

1. **Business overview** → `requirement/CLRS_Dev_Spec.md`
2. **ต้องการ implement โมดูลใด** → เปิดเฉพาะไฟล์ที่ตรงโมดูล (ดูตาราง Module Map)
3. **ออกแบบ DB** → เปิด `domain - <โมดูล>.md`
4. **ออกแบบ UI/flow** → เปิด `flow - <โมดูล>.md`
