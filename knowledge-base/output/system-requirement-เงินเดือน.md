# System Requirement — การคำนวณเงินเดือน (Payroll Calculation)

> ระบบ: CLRS — Chana Latex HR System | บริษัท จะนะน้ำยาง จำกัด
> ที่มา: CLRS_Dev_Spec.md + domain-เงินเดือน.md
> อัปเดต: 2026-05-29

---

## 1. ภาพรวมสูตรคำนวณ

```
grossPay  = basePay + otPay + specialPay
netPay    = grossPay − socialSecurityAmt − withholdingTax − lateDeduction − otherDeductions
```

---

## 2. การคำนวณค่าจ้างพื้นฐาน (basePay)

### 2.1 พนักงานรายเดือน (MONTHLY)

| เงื่อนไข | สูตร |
|---------|------|
| ทุกงวด (งวด 1 และ 2) | `basePay = baseSalary / 2` |

> พนักงานเข้า/ออกกลางงวด: **ไม่ pro-rate** — ได้รับ basePay เต็มงวดเสมอ (baseSalary / 2)

### 2.2 พนักงานรายวัน (DAILY)

| เงื่อนไข | สูตร |
|---------|------|
| ค่าจ้างต่องวด | `dailyWage × จำนวนวันทำงานจริงในงวด` |

> **ยืนยัน:** นับจากวันทำงานจริง (actual working days) ไม่นับวันปฏิทิน

### 2.3 งวดการจ่าย

| งวด | ช่วงวันที่ | วันจ่าย |
|-----|-----------|---------|
| งวด 1 | วันที่ 1–15 | วันที่ 18 ของเดือนเดียวกัน |
| งวด 2 | วันที่ 16–สิ้นเดือน | วันที่ 3 ของเดือนถัดไป |

---

## 3. การคำนวณ OT (otPay)

### 3.1 อัตราค่า OT

| ประเภท OT | อัตรา | เงื่อนไข |
|----------|-------|---------|
| OT วันทำงาน (หลังเวลาเลิกงาน) | × 1.5 | ขั้นต่ำ 30 นาที |
| OT วันหยุด — ชั่วโมงในกะปกติ | × 2.0 | ตรงกับช่วงเวลากะทำงานปกติ |
| OT วันหยุด — ชั่วโมงนอกกะปกติ | × 1.5 | เกินช่วงเวลากะทำงานปกติ |
| OT กะ STR ตี 3 (หลัง 12:00) | × 1.5 | กะข้ามคืน หลังเที่ยงวัน |

### 3.2 สูตรคำนวณ OT

```
otPayPerRecord = อัตราค่าจ้างต่อชั่วโมง × ชั่วโมง OT ที่อนุมัติ × อัตรา OT (1.5 หรือ 2.0)
otPay          = ∑ otPayPerRecord ทุกรายการในงวด
```

### 3.3 เงื่อนไข OT

- ดึงเฉพาะ OT ที่ **อนุมัติแล้ว** จาก OTRecord Module เท่านั้น
- เก็บเวลาออกจริงไว้ แต่ชั่วโมง OT ที่คิดเงินคือค่าที่หัวหน้าอนุมัติ (อาจต่างกัน)
- HR ตรวจทานรายการ OT ก่อนปิดงวดทุกครั้ง
- OT บันทึกแยก: วันทำงานปกติ (WF-02) และวันหยุด (WF-03)

---

## 4. การคำนวณเงินพิเศษ (specialPay)

- specialPay **ไม่มีประเภทย่อย** — เป็นรายรับประเภทเดียว ระดับเดียวกับ OT และ basePay
- HR / Payroll บันทึกชั่วโมงพิเศษใน SpecialPayRecord ต่อรายการ

### 4.1 สูตรคำนวณ specialPay

คำนวณเหมือน OT ทุกประการ แต่ **อัตราคูณ = 1.0 ทุกประเภท**

```
specialPayPerRecord = อัตราค่าจ้างต่อชั่วโมง × ชั่วโมงที่อนุมัติ × 1.0
specialPay          = ∑ specialPayPerRecord ทุกรายการในงวด
```

| ประเภทเวลา | อัตราคูณ | หมายเหตุ |
|-----------|---------|---------|
| วันทำงาน (หลังเวลาเลิกงาน) | × 1.0 | |
| วันหยุด — ชั่วโมงในกะปกติ | × 1.0 | |
| วันหยุด — ชั่วโมงนอกกะปกติ | × 1.0 | |

### 4.2 แหล่งข้อมูล (sourceType)

- sourceType = `SPECIAL_PAY_RECORD` (ไม่ใช่ `MANUAL`)
- บันทึกผ่าน **SpecialPayRecord domain** — แยกต่างหากจาก OTRecord แต่มีโครงสร้างการบันทึกเหมือนกัน
- เงินพิเศษ **ไม่มีประเภทย่อย** — บันทึกเป็นชั่วโมงพิเศษต่อรายการ ไม่มี specialPayType
- flow การอนุมัติ: เหมือน OT (บันทึก → อนุมัติ → ดึงเข้า Payroll)
- ดึงเฉพาะรายการที่ **อนุมัติแล้ว** เท่านั้น (เหมือน OTRecord)

```typescript
interface SpecialPayRecord {
  id: string
  employeeId: string
  periodId: string
  workDate: Date
  approvedHours: number         // ชั่วโมงที่อนุมัติ (เหมือน OTRecord.approvedHours)
  actualHours?: number          // ชั่วโมงจริง (เก็บไว้ แต่ไม่ใช้คำนวณ)
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  note?: string
}
```

### 4.3 กฎ specialPay

- บันทึกเป็น `PayrollLineItem` แยกรายการ (sourceType = `SPECIAL_PAY_RECORD`)
- **ไม่นำไปคิดฐาน SS** (ห้ามรวมใน `socialSecurityBase`)
- นำไปรวมใน `grossPay` ปกติ

---

## 5. การคำนวณประกันสังคม (Social Security — มาตรา 33)

### 5.1 สูตร

```
socialSecurityBase = basePay  ← เท่านั้น (ห้ามรวม otPay, ห้ามรวม specialPay)
socialSecurityAmt  = socialSecurityBase × 5%
```

### 5.2 เงื่อนไขการหัก

| ประเภทพนักงาน | หักงวดไหน | หมายเหตุ |
|-------------|----------|---------|
| รายเดือน (MONTHLY) | **งวด 2 เท่านั้น** (`periodNumber = 2`) | หักครั้งเดียวต่อเดือน |
| รายวัน (DAILY) | **ทุกงวด** (งวด 1 และ 2) | หักทั้ง 2 งวด |

> **ยืนยัน:** ฐาน SS ของรายวัน = `dailyWage × วันทำงานจริง` = `basePay`

> **ยืนยัน:** ไม่มีกองทุนสำรองเลี้ยงชีพ

### 5.3 การตั้งค่าระบบ

- Sys Admin กำหนดอัตรา (ปัจจุบัน 5%) และ Active Date ใน "ตั้งค่าประกันสังคม"
- รองรับ 2 โหมด: `Every Time` (หักทุกงวด) | `Last Round` (หักงวดสุดท้ายของเดือน)
- แยกการตั้งค่าระหว่างรายเดือนและรายวัน

---

## 6. การคำนวณภาษีหัก ณ ที่จ่าย (Withholding Tax)

### 6.1 หลักการ

- **ไม่มีสูตรอัตโนมัติ** — HR Admin หรือ Payroll กรอกมือทุกงวด รายบุคคล
- ค่าไม่ fixed สามารถเปลี่ยนได้ก่อน lock งวดเท่านั้น
- **ไม่มีผลย้อนหลัง** — งวดที่ lock แล้วไม่กระทบ
- รองรับ "กำหนดล่วงหน้า" = กรอกเผื่อไว้ใน record ก่อน lock แล้วแก้ได้ก่อน lock

### 6.2 ผู้มีสิทธิ์กรอก

| Role | สิทธิ์ |
|------|--------|
| HR Admin รายเดือน (R05) | กรอกภาษีพนักงานรายเดือน |
| HR Admin รายวัน (R08) | กรอกภาษีพนักงานรายวัน |
| Payroll (R06) | กรอกได้ทุกคน |

### 6.3 รายงานภาษีที่เกี่ยวข้อง

| รายงาน | ความถี่ |
|--------|---------|
| ภ.ง.ด. 1 (รายเดือน) | ทุกเดือน |
| ภ.ง.ด. 1ก (รายปี) | ปีละครั้ง |
| หนังสือรับรอง ทวิ 50 | ปีละครั้ง |

---

## 7. การหักอื่น ๆ

### 7.1 หักสาย (lateDeduction)

- คำนวณอัตโนมัติจาก `AttendanceRecord` (lateMinutes ต่องวด)
- สูตรการหัก: กำหนดโดย Sys Admin ใน "กฎ OT / Attendance"

### 7.2 การหักการลาไม่ได้รับเงิน

| ประเภทพนักงาน | เงื่อนไข |
|-------------|---------|
| รายเดือน | ลาเกินสิทธิ์ = หักเงิน (unpaidDeduction จาก LeaveRequest) |
| รายวัน | ลาส่วนใหญ่ไม่ได้รับเงิน ยกเว้นลาป่วยมีใบแพทย์ |

---

## 8. สรุปสูตรทั้งหมด (Quick Reference)

```
─── รายรับ ───────────────────────────────────────────────
basePay      = baseSalary (รายเดือน) หรือ dailyWage × วันทำงาน (รายวัน)
otPay        = ∑ (ชั่วโมง OT × อัตราค่าจ้าง/ชั่วโมง × rate[1.5|2.0]) per งวด
specialPay   = ∑ (ชั่วโมงพิเศษ × อัตราค่าจ้าง/ชั่วโมง × 1.0) per งวด  ← จาก SpecialPayRecord (ไม่มีประเภทย่อย)
grossPay     = basePay + otPay + specialPay

─── รายหัก ───────────────────────────────────────────────
SS Base      = basePay  (ห้ามรวม OT + specialPay)
SS Amt       = SS Base × 5%
               └─ รายเดือน: หักงวด 2 เท่านั้น
               └─ รายวัน:   หักทุกงวด

withholdingTax  = กรอกมือ รายบุคคล รายงวด (ไม่มีสูตร auto)
lateDeduction   = คำนวณจาก AttendanceRecord (lateMinutes)
otherDeductions = ∑ รายการหักอื่นๆ (custom)

─── สุทธิ ────────────────────────────────────────────────
netPay = grossPay − SS Amt − withholdingTax − lateDeduction − otherDeductions
```

---

## 9. กฎการล็อกงวดและแก้ไข

| สถานะงวด | แก้ไข PayrollRecord | หมายเหตุ |
|---------|---------------------|---------|
| DRAFT | ✅ ได้ | ยังไม่เริ่มประมวลผล |
| PROCESSING | ✅ ได้ | กำลังแก้ไขอยู่ |
| LOCKED | ❌ ไม่ได้ | throw `PeriodLockedException` |
| PAID | ❌ ไม่ได้ | จ่ายเงินแล้ว |

- หลัง lock ห้ามแก้ไขทุกกรณี
- หากพบข้อผิดพลาดหลัง lock → สร้าง **adjustment period ใหม่** (ไม่ unlock)

---

## 10. Configurable Values (ค่าที่ต้องเป็น Config — ห้าม Hardcode)

> ทุกค่าในตารางนี้ต้องอ่านจาก DB / config table ไม่ฝังใน code

### OT Config

| ค่า | ค่าเริ่มต้น | จัดการโดย |
|-----|-----------|---------|
| OT rate — วันทำงาน (หลังเลิก) | `1.5` | Sys Admin |
| OT rate — วันหยุด in-shift | `2.0` | Sys Admin |
| OT rate — วันหยุด out-of-shift | `1.5` | Sys Admin |
| OT rate — กะ STR หลัง 12:00 | `1.5` | Sys Admin |
| ขั้นต่ำ OT วันทำงาน (นาที) | `30` | Sys Admin |
| ขั้นต่ำ OT วันหยุด (นาที) | `20` | Sys Admin |

### ประกันสังคม Config

| ค่า | ค่าเริ่มต้น | จัดการโดย |
|-----|-----------|---------|
| อัตรา SS ฝั่งลูกจ้าง | `5%` | Sys Admin / HR Admin |
| โหมดหัก — รายเดือน | `Last Round` (งวด 2 เท่านั้น) | Sys Admin / HR Admin |
| โหมดหัก — รายวัน | `Every Time` (ทุกงวด) | Sys Admin / HR Admin |
| Active Date ของ SS rule | วันที่มีผล | Sys Admin / HR Admin |

### งวดการจ่าย Config

| ค่า | ค่าเริ่มต้น | จัดการโดย |
|-----|-----------|---------|
| วันตัดงวด 1 | `15` | Sys Admin |
| วันตัดงวด 2 | สิ้นเดือน | Sys Admin |
| วันจ่าย งวด 1 | `18` | Sys Admin |
| วันจ่าย งวด 2 | `3` (เดือนถัดไป) | Sys Admin |

### Payroll Category Config

| ค่า | รายละเอียด | จัดการโดย |
|-----|-----------|---------|
| หมวดรายรับ (code, name, sortOrder) | 6 default + custom เพิ่มได้ | Sys Admin / HR Admin |
| หมวดรายหัก (code, name, sortOrder) | 3 default + custom เพิ่มได้ | Sys Admin / HR Admin |
| `isActive` ของหมวด custom | toggle ได้ (default ปิดไม่ได้) | Sys Admin / HR Admin |

### ธนาคาร Config

| ค่า | ค่าเริ่มต้น | จัดการโดย |
|-----|-----------|---------|
| ธนาคารหลัก | `KRUNGTHAI` | Sys Admin |
| Format ไฟล์โอนเงิน | ตามมาตรฐาน Krungthai Payroll | Sys Admin |
| Mapping รหัสพนักงาน → รหัสในไฟล์ธนาคาร | custom per employee | Sys Admin |

### ค่าที่ **ไม่ใช่** Config — กรอกมือรายงวด

| ค่า | หมายเหตุ |
|-----|---------|
| `withholdingTax` | กรอกรายบุคคลทุกงวด ไม่มี formula auto |

---

## 11. Open Questions (รอยืนยัน)

| # | หัวข้อ | ผลกระทบ |
|---|--------|---------|
| 1 | กระบวนการ "เปิดงวดใหม่" หลัง lock: flow เป็นอย่างไร? | adjustment period design |

---

## 12. การ Snapshot ข้อมูลพนักงาน (Employee Snapshot Rules)

เมื่อสร้าง `PayrollRecord` ต้อง snapshot ข้อมูล ณ วันประมวลผล ไม่ใช่อ้างอิง live

| Field ที่ต้อง Snapshot | แหล่งข้อมูล | เหตุผล |
|----------------------|------------|--------|
| `employeeNo` | Employee Module | รหัสพนักงานอาจเปลี่ยนได้ |
| `fullName` | Employee Module | ชื่อเปลี่ยนได้ (แต่งงาน ฯลฯ) |
| `departmentName` | Employee Module | ย้ายแผนกได้ |
| `positionName` | Employee Module | เลื่อนตำแหน่งได้ |
| `employeeType` | Employee Module | เปลี่ยนประเภทได้ |
| `bankCode` / `bankAccountNo` | Employee Module | MONTHLY เท่านั้น |

**กฎ:** DAILY ไม่มี `bankCode`/`bankAccountNo` (จ่ายเงินสด ไม่ต้องโอน)

---

## 13. กฎ User Override ใน PayrollLineItem

ระบบรองรับ 2 ค่าต่อ line item: `autoAmount` (ระบบคำนวณ) และ `userAmount` (user กรอก)

```
amount = userAmount ?? autoAmount   ← ค่าจริงที่ใช้คำนวณ
```

| กรณี | ผลลัพธ์ |
|------|---------|
| ระบบคำนวณเท่านั้น | `autoAmount = X`, `userAmount = null`, `amount = X` |
| User แก้ไข | `autoAmount = X`, `userAmount = Y`, `amount = Y`, `isUserOverridden = true` |
| User ยกเลิก override | `userAmount = null`, `amount = autoAmount` |
| ระบบคำนวณใหม่ (recalculate) | UPDATE `autoAmount` เท่านั้น — **ห้าม reset `userAmount`** |
| `amount = null` | ไม่แสดงในสลิป ไม่นำไปคิดใน grossPay/netPay |

**UI:** เซลล์ที่ user แก้แสดง ✎ สีส้ม — ต่างจากค่า auto

---

## 14. หมวดรายรับ/รายหัก Default (PayrollCategory Seed)

> ห้ามลบ ห้ามปิด — แก้ไขชื่อได้เท่านั้น

| code | ชื่อ | ประเภท | sortOrder |
|------|------|--------|-----------|
| `WORK_DAYS` | เวลางานรวม (วัน) | INCOME | 1 |
| `BASE_SALARY` | ฐานเงินเดือน | INCOME | 2 |
| `OT_DAYS` | เวลา OT (วัน) | INCOME | 3 |
| `OT_PAY` | เงิน OT | INCOME | 4 |
| `SPECIAL_DAYS` | เวลาพิเศษ (วัน) | INCOME | 5 |
| `SPECIAL_PAY` | เงินพิเศษ | INCOME | 6 |
| `SOCIAL_SECURITY` | ประกันสังคม | DEDUCTION | 1 |
| `WITHHOLDING_TAX` | ภาษีหัก ณ ที่จ่าย | DEDUCTION | 2 |
| `LATE_DEDUCTION` | หักสาย | DEDUCTION | 3 |

**Custom Category:** Sys Admin / HR Admin เพิ่มได้ไม่จำกัด (เปิด/ปิด/ลบได้)
- เมื่อ `isActive = false` → ไม่แสดงในงวดที่สร้างใหม่ (งวดเก่าไม่กระทบ)
- ลบได้เฉพาะกรณีไม่มี `PayrollLineItem` ใช้ code นั้นอยู่

---

## 15. กระบวนการประมวลผล (Wizard 3 ขั้นตอน)

```
Step 1: คำนวณและกรอกข้อมูล
   ├─ ระบบ batch query: Employee + OT + SpecialPay + Attendance + Leave (parallel)
   ├─ UPSERT PayrollRecord + PayrollLineItem ทุกหมวด (default + custom active)
   ├─ ค่า auto-fill: WORK_DAYS, BASE_SALARY, OT_DAYS, OT_PAY, SPECIAL_DAYS, SPECIAL_PAY, SS, LATE_DEDUCTION
   ├─ ค่า null (user กรอกเอง): WITHHOLDING_TAX, custom ทุกตัว
   ├─ SPECIAL_DAYS / SPECIAL_PAY: ดึงจาก SpecialPayRecord ที่อนุมัติแล้ว (เหมือน OT flow)
   ├─ User แก้ไขเซลล์ได้ → mark isUserOverridden = true
   ├─ [คำนวณใหม่ทั้งหมด]: re-fetch จาก providers, preserve user override
   └─ [นำเข้าภาษีจากงวดก่อน]: copy WITHHOLDING_TAX ทั้งหมดจากงวดล่าสุด

Step 2: ยืนยันก่อนล็อก
   ├─ Read-only summary table (รายบุคคล)
   ├─ แสดง ✎ เซลล์ที่ user เคยแก้
   ├─ แสดง ⚠️ จำนวน override cells + [ดูรายการ] → modal รายละเอียด
   ├─ ยอดรวม: รายรับ / หักรวม / สุทธิรวม
   └─ [ดาวน์โหลด Preview PDF]

Step 3: ล็อกงวด + สร้างผลลัพธ์
   ├─ period.status → LOCKED
   ├─ PayrollRecord.status ทุกรายการ → CONFIRMED
   ├─ MONTHLY: สร้าง BankTransferFile (Krungthai format)
   └─ DAILY: สร้าง CashPaymentDocument (ใบเซ็นรับเงิน)
```

**หลังล็อก:** ถ้าพบข้อผิดพลาด → สร้าง Adjustment Period ใหม่ (ห้าม unlock)

---

## 16. วิธีการจ่ายเงิน (Payment Methods)

| ประเภทพนักงาน | วิธีจ่าย | เงื่อนไข |
|-------------|---------|---------|
| MONTHLY (รายเดือน) | โอนธนาคาร — Krungthai Payroll | ต้องมี `bankCode` + `bankAccountNo` ใน profile |
| DAILY (รายวัน) | เงินสด — พิมพ์ใบเซ็นรับเงิน | ไม่มีเลขบัญชี |

### 16.1 ไฟล์โอนธนาคาร Krungthai

- Format: fixed-width ตามมาตรฐาน Krungthai Corporate Payroll
- Mapping: `internalEmployeeId → bankRef` (กำหนดใน Payroll Config)
- Status flow: `GENERATED → DOWNLOADED → SUBMITTED`
- สร้างได้เฉพาะหลัง period `LOCKED`

### 16.2 ใบรายการเงินสด (DAILY)

- พิมพ์ได้เท่านั้น (ไม่มี digital workflow)
- มีช่องลายเซ็นต์รับเงินต่อรายคน
- แสดง: ลำดับ, ชื่อ-นามสกุล, แผนก, เงินสุทธิ, ช่องลายเซ็น

---

## 17. รายงานตามกฎหมาย (Legal Reports)

| รายงาน | รายละเอียด | ความถี่ | ผู้มีสิทธิ์ |
|--------|-----------|---------|-----------|
| ภ.ง.ด. 1 | ภาษีหัก ณ ที่จ่าย — ใบสรุปบริษัท + ใบแนบรายบุคคล | รายเดือน | Payroll |
| ภ.ง.ด. 1ก | ภาษีทั้งปี ม.ค.–ธ.ค. ทุกคน — ใบสรุป + ใบแนบ | รายปี | Payroll |
| หนังสือรับรอง ทวิ 50 | ใบรับรองภาษีรายบุคคล | รายปี | Payroll |
| สปส. 1-10 | ประกันสังคมรายเดือน (รวมพนักงานต่างชาติ) | รายเดือน | Payroll |
| สปส. 1-03 | แจ้งพนักงานเข้าใหม่ | ตามเหตุการณ์ | Payroll |
| สปส. 6-09 | แจ้งพนักงานลาออก | ตามเหตุการณ์ | Payroll |
| กท.20 | กองทุนเงินทดแทน (นายจ้างจ่าย) | รายปี | Payroll |
| รายงานประจำงวด | สรุปเงินเดือน กรองแผนก/ประเภทพนักงาน | ทุกงวด | HR Admin, Payroll |
| รายงานเข้า-ออก | สรุปการเข้า-ออกรายบุคคล/รายแผนก — Export PDF/Excel | ตามต้องการ | Dept Head, HR Admin, Payroll |

---

## 18. สิทธิ์การเข้าถึง (Permission Matrix)

| การกระทำ | Employee | Dept Head | Factory Mgr | GM | HR Monthly (R05) | HR Daily (R08) | Payroll (R06) | Sys Admin |
|----------|----------|-----------|-------------|-----|-----------------|----------------|---------------|-----------|
| ดูสลิปตัวเอง | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| ดูสลิปพนักงาน | – | – | – | – | รายเดือน | รายวัน | ทั้งหมด | – |
| สร้าง/จัดการ Period | – | – | – | – | – | – | ✓ | – |
| คำนวณ/ล็อก Period | – | – | – | – | – | – | ✓ | – |
| กรอก Withholding Tax | – | – | – | – | รายเดือน | รายวัน | ✓ | – |
| Generate Bank File | – | – | – | – | – | – | ✓ | – |
| ออกรายงานกฎหมาย | – | – | – | – | – | – | ✓ | – |
| ดูรายงานประจำงวด | – | – | – | – | รายเดือน | รายวัน | ✓ | – |
| ตั้งค่า PayrollCategory | – | – | – | – | ✓ | ✓ | ✓ | ✓ |
| ตั้งค่า SS / OT / งวด | – | – | – | – | ✓ (SS) | ✓ (SS) | – | ✓ |
| Payroll Config (ธนาคาร) | – | – | – | – | – | – | – | ✓ |

> หมายเหตุ: พนักงาน 1 คนมีหลาย Role ได้ (เช่น R05 + R06 พร้อมกัน)

---

## 19. การแจ้งเตือน (Notifications)

| เหตุการณ์ | ผู้รับ | ข้อความ |
|-----------|--------|---------|
| ล็อกงวดแล้ว | Payroll, HR Admin | "งวด [ปี/เดือน/งวด] ล็อกแล้ว สลิปพร้อมดูแล้ว" |
| ไฟล์ธนาคารพร้อม | Payroll | "ไฟล์โอนเงิน [งวด] พร้อมดาวน์โหลด" |
| งวด PAID | Payroll, HR Admin | "จ่ายเงินงวด [ปี/เดือน/งวด] เรียบร้อย วันที่ [X]" |
| มีสลิปใหม่ | พนักงานทุกคน (in-app) | "สลิปเงินเดือน [เดือน] พร้อมดูแล้ว" |

---

## 20. ประวัติเงินเดือน (Salary History)

- บันทึกการปรับเงินเดือนแต่ละครั้ง (วันที่มีผล, ค่าเก่า, ค่าใหม่)
- บันทึกวันเริ่มงาน + คำนวณอายุงาน (ปี/เดือน)
- ใช้อ้างอิงใน report ทวิ 50 (รายได้สะสมทั้งปี)
- ผู้มีสิทธิ์แก้ไข: HR Admin รายเดือน, HR Admin รายวัน, Payroll

---

## 21. Error Cases & Edge Cases

> ทุก error ต้องไม่ทิ้ง partial state ไว้ในระบบ — ใช้ transaction wrapping เสมอ

---

### 21.1 Period Management

#### E-PM-01: สร้างงวดซ้ำ (Duplicate Period)

| | |
|--|--|
| **เงื่อนไข** | มีงวดที่ `(year, month, periodNumber, employeeType)` เดียวกันอยู่แล้ว |
| **ผลลัพธ์** | HTTP 409 `DuplicatePeriodException` |
| **ข้อความ** | `"มีงวด [year]/[month]/[periodNo]/[type] อยู่แล้ว"` |
| **ห้าม** | สร้างงวดใหม่ซ้อนทับ แม้ status เดิมจะเป็น DRAFT |

#### E-PM-02: เปลี่ยน status ผิดลำดับ (Invalid Transition)

| Transition ที่ห้าม | ผลลัพธ์ |
|-------------------|---------|
| DRAFT → LOCKED (ข้าม PROCESSING) | HTTP 422 `InvalidStatusTransitionException` |
| LOCKED → PROCESSING (ย้อนกลับ) | HTTP 422 |
| PAID → LOCKED | HTTP 422 |
| PROCESSING → PAID (ข้าม LOCKED) | HTTP 422 |

**ข้อความ:** `"ไม่สามารถเปลี่ยนสถานะจาก [A] ไป [B] ได้"`

#### E-PM-03: payDate อยู่ก่อน endDate

| | |
|--|--|
| **เงื่อนไข** | `payDate < endDate` เมื่อสร้างงวด |
| **ผลลัพธ์** | HTTP 400 validation error |
| **ข้อความ** | `"วันจ่ายต้องไม่อยู่ก่อนวันปิดงวด"` |

---

### 21.2 การคำนวณ (calculateAll)

#### E-CALC-01: External Provider ไม่ตอบสนอง

| Provider | เงื่อนไข | ผลลัพธ์ |
|---------|---------|---------|
| Employee Module | timeout / 5xx | HTTP 503 `ProviderUnavailableException: Employee` — **rollback ทั้งหมด** |
| OT Module | timeout / 5xx | HTTP 503 — rollback, ไม่ insert record ใดเลย |
| Attendance Module | timeout / 5xx | HTTP 503 — rollback |
| Leave Module | timeout / 5xx | HTTP 503 — rollback |
| SpecialPay Module | timeout / 5xx | **Warning เท่านั้น** (ไม่ rollback) — `specialPay = 0`, แสดง banner ใน UI |

#### E-CALC-02: พนักงาน MONTHLY ไม่มีบัญชีธนาคาร

| | |
|--|--|
| **เงื่อนไข** | `employeeType = MONTHLY` และ `bankCode IS NULL` หรือ `bankAccountNo IS NULL` |
| **ขั้นตอน** | คำนวณและสร้าง PayrollRecord ปกติ |
| **การแจ้งเตือน** | แสดง warning badge ในตาราง Step 1 — `⚠ ไม่มีบัญชีธนาคาร` |
| **ผลต่อ Lock** | **บล็อกการ lock** — ต้องแก้ไขข้อมูลธนาคารในโปรไฟล์พนักงานก่อน |
| **ข้อความ lock** | `"พนักงาน [รหัส] ไม่มีบัญชีธนาคาร ไม่สามารถล็อกงวดได้"` |

#### E-CALC-03: พนักงานไม่มีวันทำงาน (workingDays = 0)

| | |
|--|--|
| **เงื่อนไข** | Attendance ส่งกลับ `workingDays = 0` สำหรับพนักงานคนนั้น |
| **ผลลัพธ์** | `basePay = 0`, `grossPay = 0 + otPay + specialPay` — สร้าง record ตามปกติ |
| **ห้าม** | throw error หรือ skip พนักงานคนนั้น |
| **เหตุผล** | พนักงานอาจลาทั้งงวดแต่ยังมี OT หรือ specialPay |

#### E-CALC-04: basePay เป็นลบหลัง pro-rate

| | |
|--|--|
| **เงื่อนไข** | สูตร pro-rate คำนวณออกมาแล้ว `basePay < 0` (edge case จากข้อมูลผิดพลาด) |
| **ผลลัพธ์** | **clamp `basePay = 0`** + log warning |
| **ห้าม** | บันทึก basePay < 0 ลงฐานข้อมูล |

#### E-CALC-05: netPay เป็นลบ (หักมากกว่ารายรับ)

| | |
|--|--|
| **เงื่อนไข** | `grossPay − SS − tax − late − other < 0` |
| **ผลลัพธ์** | บันทึก `netPay` ตามค่าจริง (อาจติดลบ) — **ไม่ clamp** |
| **การแจ้งเตือน** | แสดง warning badge สีแดงในตาราง `⚠ netPay ติดลบ` |
| **ผลต่อ Lock** | **อนุญาตให้ lock ได้** แต่ต้องมี user acknowledgement |
| **เหตุผล** | กรณีจริง: พนักงานลาเกินสิทธิ์ หักเงินกู้มาก — business decision ไม่ใช่ system error |

#### E-CALC-06: ข้อมูล OT ของงวดที่ผิด (Date range mismatch)

| | |
|--|--|
| **เงื่อนไข** | OT Provider ส่งกลับรายการที่ `workDate` อยู่นอกช่วง `[startDate, endDate]` ของงวด |
| **ผลลัพธ์** | **filter ออก** ทุกรายการที่อยู่นอกช่วง — log warning |
| **ห้าม** | นำ OT นอกงวดไปคิดเงินในงวดนี้ |

---

### 21.3 User Override

#### E-OVR-01: Override หลัง Period Lock

| | |
|--|--|
| **เงื่อนไข** | PATCH `/payroll/line-items/:id/override` เมื่อ `period.status = LOCKED` หรือ `PAID` |
| **ผลลัพธ์** | HTTP 403 `PeriodLockedException` |
| **ข้อความ** | `"งวด [id] ถูกล็อกแล้ว ไม่สามารถแก้ไขได้"` |

#### E-OVR-02: Override ด้วยค่าลบ (Negative userAmount)

| categoryType | เงื่อนไข | ผลลัพธ์ |
|-------------|---------|---------|
| INCOME | `userAmount < 0` | HTTP 400 — `"รายรับไม่สามารถเป็นลบได้"` |
| DEDUCTION | `userAmount < 0` | HTTP 400 — `"รายหักไม่สามารถเป็นลบได้"` |

#### E-OVR-03: ยกเลิก Override (userAmount = null) เมื่อ autoAmount ก็เป็น null

| | |
|--|--|
| **เงื่อนไข** | `userAmount = null` และ `autoAmount = null` (custom category ที่ไม่เคยกรอก) |
| **ผลลัพธ์** | `amount = null`, `isUserOverridden = false` — ไม่แสดงในสลิป |
| **ห้าม** | throw error — นี่คือ valid state |

#### E-OVR-04: Recalculate ล้าง user override

| | |
|--|--|
| **เงื่อนไข** | เรียก `recalculateAll()` เมื่อมี line items ที่ `isUserOverridden = true` |
| **ผลลัพธ์** | อัปเดต `autoAmount` เท่านั้น — **ห้ามแตะ `userAmount`** |
| **UI action** | แสดง confirmation modal: `"มี [N] เซลล์ที่ user แก้ไว้ ต้องการ override ด้วยค่าใหม่หรือไม่?"` |
| **ถ้า user เลือก "ใช่"** | reset `userAmount = null`, `isUserOverridden = false`, `amount = newAutoAmount` |
| **ถ้า user เลือก "ไม่"** | `amount = userAmount` (ไม่เปลี่ยน) — อัปเดตเฉพาะ `autoAmount` |

---

### 21.4 นำเข้าภาษีจากงวดก่อน (Import Withholding Tax)

#### E-TAX-01: ไม่มีงวดก่อนหน้า

| | |
|--|--|
| **เงื่อนไข** | ไม่มีงวดที่ `status = LOCKED/PAID` ของ `employeeType` เดียวกันก่อนหน้างวดนี้ |
| **ผลลัพธ์** | HTTP 404 — `"ไม่พบงวดก่อนหน้าที่ใช้อ้างอิงภาษีได้"` |
| **UI** | ปุ่ม `[นำเข้าภาษีจากงวดก่อน]` ต้อง disabled พร้อม tooltip แจ้งเหตุ |

#### E-TAX-02: พนักงานใหม่ไม่มีในงวดก่อน

| | |
|--|--|
| **เงื่อนไข** | พนักงาน A อยู่ในงวดปัจจุบัน แต่ไม่อยู่ในงวดก่อน |
| **ผลลัพธ์** | `withholdingTax = null` สำหรับพนักงานนั้น — ไม่ import |
| **ห้าม** | throw error หรือ abort การ import ทั้งหมด |

#### E-TAX-03: Import ทับ user override เดิม

| | |
|--|--|
| **เงื่อนไข** | มี `withholdingTax` ที่ user กรอกไว้แล้ว แล้ว user กด import ใหม่ |
| **ผลลัพธ์** | แสดง confirmation: `"จะเขียนทับค่าภาษีที่กรอกไว้ [N] คน ยืนยัน?"` |
| **ถ้ายืนยัน** | overwrite ทุก record รวมถึงที่ `isUserOverridden = true` |

---

### 21.5 Lock Period

#### E-LOCK-01: Lock เมื่อมีพนักงาน MONTHLY ไม่มีบัญชี

| | |
|--|--|
| **เงื่อนไข** | มี PayrollRecord ที่ `employeeType = MONTHLY` และ `bankAccountNo IS NULL` |
| **ผลลัพธ์** | **บล็อกการ lock** — HTTP 422 |
| **ข้อความ** | `"ไม่สามารถล็อกงวดได้ พนักงานต่อไปนี้ไม่มีบัญชีธนาคาร: [รายชื่อ]"` |

#### E-LOCK-02: Lock พร้อมกัน 2 request (Concurrent Lock)

| | |
|--|--|
| **เงื่อนไข** | User 2 คนกด lock งวดเดียวกันพร้อมกัน |
| **ผลลัพธ์** | ใช้ **Optimistic Locking** (`version` column) — request แรกสำเร็จ, request ที่สองได้ HTTP 409 |
| **ข้อความ** | `"งวดนี้ถูกล็อกไปแล้วโดย [user] กรุณา refresh"` |

#### E-LOCK-03: Lock เมื่อ netPay บางรายการติดลบ

| | |
|--|--|
| **เงื่อนไข** | มี PayrollRecord ที่ `netPay < 0` |
| **ผลลัพธ์** | แสดง warning modal รายชื่อพนักงาน netPay ติดลบ — user ต้องคลิก `"รับทราบและล็อกต่อ"` |
| **ห้าม** | บล็อกการ lock โดยอัตโนมัติ — เป็น business decision ของ Payroll |

---

### 21.6 Bank Transfer File

#### E-BANK-01: Generate ก่อน Period Lock

| | |
|--|--|
| **เงื่อนไข** | POST `/payroll/periods/:id/bank-transfer` เมื่อ `period.status ≠ LOCKED` |
| **ผลลัพธ์** | HTTP 422 — `"ต้องล็อกงวดก่อนสร้างไฟล์โอนเงิน"` |

#### E-BANK-02: Generate สำหรับ DAILY Period

| | |
|--|--|
| **เงื่อนไข** | `period.employeeType = DAILY` |
| **ผลลัพธ์** | HTTP 422 — `"งวดรายวันใช้การจ่ายเงินสด ไม่มีไฟล์โอนธนาคาร"` |

#### E-BANK-03: รูปแบบเลขบัญชีผิด

| | |
|--|--|
| **เงื่อนไข** | `bankAccountNo` ไม่ผ่าน format validation ของ Krungthai |
| **ผลลัพธ์** | **บล็อกการ generate** — HTTP 422 พร้อมรายชื่อพนักงานที่มีปัญหา |
| **ข้อความ** | `"รูปแบบบัญชีไม่ถูกต้อง: [รหัสพนักงาน] บัญชี [xxx]"` |

#### E-BANK-04: Generate ซ้ำ

| | |
|--|--|
| **เงื่อนไข** | มี BankTransferFile status `GENERATED/DOWNLOADED/SUBMITTED` อยู่แล้วสำหรับงวดนี้ |
| **ผลลัพธ์** | แสดง confirmation: `"มีไฟล์โอนเงินอยู่แล้ว ต้องการสร้างใหม่แทนที่?"` |
| **ถ้ายืนยัน** | สร้างไฟล์ใหม่ — status เดิม `SUBMITTED` จะเป็น `SUPERSEDED` |

---

### 21.7 Social Security Edge Cases

#### E-SS-01: MONTHLY งวด 1 — SS ต้องเป็น 0

| | |
|--|--|
| **เงื่อนไข** | `employeeType = MONTHLY` และ `periodNumber = 1` |
| **ผลลัพธ์ที่ถูกต้อง** | `ssBase = basePay`, `ssAmt = 0` |
| **ห้าม** | คำนวณ `ssAmt = basePay × 5%` สำหรับ MONTHLY งวด 1 |

#### E-SS-02: SS Config ไม่มีในระบบ

| | |
|--|--|
| **เงื่อนไข** | ไม่มี SS config row ที่ active ใน DB (misconfiguration) |
| **ผลลัพธ์** | **block calculateAll** — HTTP 503 `"ไม่พบการตั้งค่าประกันสังคม กรุณาตรวจสอบใน System Settings"` |
| **ห้าม** | fallback เป็น hardcode 5% โดยไม่แจ้ง |

---

### 21.8 Payroll Category (Master Data)

#### E-CAT-01: ลบ Default Category

| | |
|--|--|
| **เงื่อนไข** | DELETE `/payroll/categories/:id` เมื่อ `isDefault = true` |
| **ผลลัพธ์** | HTTP 403 — `"ไม่สามารถลบหมวดหลักได้"` |

#### E-CAT-02: ลบ Custom Category ที่มีข้อมูลอยู่

| | |
|--|--|
| **เงื่อนไข** | มี `PayrollLineItem` ที่ `categoryCode = code` นี้อยู่ |
| **ผลลัพธ์** | HTTP 409 — `"หมวดนี้มีข้อมูลในงวดที่ผ่านมา ไม่สามารถลบได้"` |
| **ทางเลือก** | เสนอให้ `toggle isActive = false` แทน |

#### E-CAT-03: ปิด (deactivate) Default Category

| | |
|--|--|
| **เงื่อนไข** | PATCH toggle-active เมื่อ `isDefault = true` |
| **ผลลัพธ์** | HTTP 403 — `"ไม่สามารถปิดหมวดหลักได้"` |

#### E-CAT-04: code ซ้ำ

| | |
|--|--|
| **เงื่อนไข** | POST สร้าง category ด้วย `code` ที่มีอยู่แล้ว |
| **ผลลัพธ์** | HTTP 409 — `"รหัสหมวด [code] มีอยู่แล้ว"` |

---

### 21.9 Payslip

#### E-SLIP-01: ดูสลิปงวดที่ยังไม่ lock

| | |
|--|--|
| **เงื่อนไข** | GET payslip เมื่อ `period.status = DRAFT/PROCESSING` |
| **ผลลัพธ์** | HTTP 422 — `"สลิปพร้อมดูเมื่องวดถูกล็อกแล้วเท่านั้น"` |

#### E-SLIP-02: พนักงานดูสลิปของคนอื่น

| | |
|--|--|
| **เงื่อนไข** | Employee (R01) เรียก `/payroll/me/payslips/:periodId` ของ employeeId อื่น |
| **ผลลัพธ์** | HTTP 403 — ใช้ JWT subject เป็น employeeId เสมอ ไม่รับ param |

---

### 21.10 สรุปตาราง HTTP Status Codes

| Code | เมื่อไหร่ |
|------|----------|
| 400 | Validation error (field format ผิด, ค่าลบ ฯลฯ) |
| 403 | Permission denied, period locked, default category constraint |
| 404 | Period / Record / File ไม่พบ |
| 409 | Duplicate period, duplicate category code, concurrent lock conflict |
| 422 | Invalid business state transition, precondition not met |
| 503 | External provider unavailable |
