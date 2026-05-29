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
| งวด 1 (1–15) | `baseSalary × (วันทำงานจริงในงวด / 15)` |
| งวด 2 (16–สิ้นเดือน) | `baseSalary × (วันทำงานจริงในงวด / วันทำงานที่เหลือในเดือน)` |
| พนักงานทำงานเต็มงวด | `basePay = baseSalary / 2` (ครึ่งเดือน per งวด) |

> ❓ **Open Question #2:** กรณีพนักงานเข้าหรือออกกลางงวด — วิธี pro-rate รอยืนยัน

### 2.2 พนักงานรายวัน (DAILY)

| เงื่อนไข | สูตร |
|---------|------|
| ค่าจ้างต่องวด | `dailyWage × จำนวนวันทำงานจริงในงวด` |

> ❓ **Open Question #1:** นับจากวันทำงานจริงหรือวันปฏิทิน — รอยืนยัน

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

| ประเภท | รายละเอียด | ผู้บันทึก |
|--------|-----------|---------|
| วันหยุดนักขัตฤกษ์ | เงินพิเศษสำหรับการทำงานในวันหยุดราชการ | HR / Payroll |
| ขึ้นยาง | เงินพิเศษสำหรับงานขึ้นยาง | HR / Payroll |
| รายการ custom อื่นๆ | หมวดที่ Sys Admin สร้างเพิ่ม (PayrollCategory) | HR / Payroll |

> ❓ **Open Question #4:** ประเภท specialPay ทั้งหมดและผู้มีสิทธิ์รับรอยืนยัน

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

> ⚠️ **[MOCK — design ยังไม่ชัดเจน]** โครงสร้างด้านล่างเป็น draft รอยืนยัน

- sourceType = `SPECIAL_PAY_RECORD` (ไม่ใช่ `MANUAL`)
- บันทึกผ่าน **SpecialPayRecord domain** — แยกต่างหากจาก OTRecord แต่มีโครงสร้างการบันทึกเหมือนกัน
- flow การอนุมัติ: คาดว่าคล้าย OT (บันทึก → อนุมัติ → ดึงเข้า Payroll)
- ดึงเฉพาะรายการที่ **อนุมัติแล้ว** เท่านั้น (เหมือน OTRecord)

```typescript
// [MOCK] SpecialPayRecord — โครงสร้างเบื้องต้น รอ domain design จริง
interface SpecialPayRecord {
  id: string
  employeeId: string
  periodId: string
  specialPayType: string        // e.g. "วันหยุดนักขัตฤกษ์", "ขึ้นยาง", custom
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

> ❓ **Open Question #3:** ฐาน SS ของรายวัน = `dailyWage × วันทำงาน` หรือไม่ — รอยืนยัน

> ❓ **Open Question #5:** กองทุนสำรองเลี้ยงชีพ — มีหรือไม่ รอยืนยัน

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
specialPay   = ∑ (ชั่วโมงพิเศษ × อัตราค่าจ้าง/ชั่วโมง × 1.0) per งวด  ← จาก SpecialPayRecord [MOCK]
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
| 1 | รายวัน: นับวันทำงานจริงหรือวันปฏิทิน? | สูตร basePay รายวัน |
| 2 | พนักงานเข้า/ออกกลางงวด: pro-rate อย่างไร? | basePay ทั้งรายเดือนและรายวัน |
| 3 | ฐาน SS รายวัน = dailyWage × วันทำงาน? | socialSecurityBase รายวัน |
| 4 | specialPay: มีประเภทอะไรบ้าง? ใครบันทึก? | PayrollCategory master data |
| 5 | กองทุนสำรองเลี้ยงชีพ: มีหรือไม่? | รายการหักเพิ่มเติม |
| 6 | กระบวนการ "เปิดงวดใหม่" หลัง lock: flow เป็นอย่างไร? | adjustment period design |

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
   ├─ ระบบ batch query: Employee + OT + SpecialPay[MOCK] + Attendance + Leave (parallel)
   ├─ UPSERT PayrollRecord + PayrollLineItem ทุกหมวด (default + custom active)
   ├─ ค่า auto-fill: WORK_DAYS, BASE_SALARY, OT_DAYS, OT_PAY, SPECIAL_DAYS, SPECIAL_PAY, SS, LATE_DEDUCTION
   ├─ ค่า null (user กรอกเอง): WITHHOLDING_TAX, custom ทุกตัว
   ├─ [MOCK] SPECIAL_DAYS / SPECIAL_PAY: ดึงจาก SpecialPayRecord ที่อนุมัติแล้ว (เหมือน OT flow)
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
