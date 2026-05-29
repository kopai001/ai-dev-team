# Database Design — โมดูลการลา (Leave Management)

## 1. ภาพรวม Entity Model

```
┌──────────────────┐         ┌──────────────────────────┐
│   LeaveType      │         │  EmployeeLeaveSetting    │
│ (Seed Catalog)   │◄────────│ (Per-Employee Config)    │
├──────────────────┤         │  - eligibility           │
│ code (PK)        │         │  - quota                 │
│ title            │         │  - rules                 │
│ color            │         ├──────────────────────────┤
│ description      │         │ id (PK)                  │
│ isUseEvidence    │         │ employeeId               │
│ allowHourly      │         │ leaveTypeCode (FK) ──────┘
└──────────────────┘         │ limitQuantity
                             │ requiresEvidenceForPay
                             │ note
                             │ createdAt / updatedAt
                             └──────────────────────────┘
                                       ▲
                                       │ resolved by
                                       │
                              ┌─────────────────────────────────────┐
                              │ LeaveBalanceService (COMPUTED)      │
                              │ → NOT an entity                     │
                              │ → Calculated from LeaveRequest      │
                              └─────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   LeaveRequest           │         │   LeaveRequestDay        │
│ (Source of Truth)        │         │ (Daily Breakdown)        │
├──────────────────────────┤         ├──────────────────────────┤
│ id (PK)                  │◄────────│ id (PK)                  │
│ employeeId               │         │ requestId (FK)           │
│ leaveTypeCode (FK) ─────┐│         │ workDate                 │
│ startDate / endDate     ││         │ hours                    │
│ isFullDay               ││         │ workMinutesOfDay         │
│ startTime / endTime     ││         └──────────────────────────┘
│ totalHours / totalDays  ││
│ reason                  ││
│ evidenceUrls (jsonb)    ││
│ status (enum)           ││
│ isPaid (snapshot)       ││
│ isShiftEstimated        ││
│ approvedById/At         ││
│ rejectReason            ││
│ cancelledById/At        ││
│ cancelReason            ││
│ createdAt / updatedAt   ││
└──────────────────────────┘│
                            └──► LeaveType (FK)
```

**สรุป Entity (4 ตัว):**
1. `LeaveType` — Seed catalog (6 ประเภท)
2. `EmployeeLeaveSetting` — Per-employee config (eligibility + quota + rules)
3. `LeaveRequest` — ใบลา (source of truth)
4. `LeaveRequestDay` — รายละเอียดแต่ละวันในใบลา

**ไม่ใช่ Entity (computed):**
- `LeaveBalance` — DTO คำนวณจาก `LeaveBalanceService`

---

## 2. Module Structure (NestJS)

```
src/modules/leave/
├── leave.module.ts
├── constants/
│   ├── leave.constants.ts
│   └── default-leave-settings.ts            // hardcoded matrix
├── enums/
│   ├── leave-status.enum.ts
│   ├── leave-type-code.enum.ts
│   └── employee-type.enum.ts
├── entities/
│   ├── leave-type.entity.ts
│   ├── employee-leave-setting.entity.ts
│   ├── leave-request.entity.ts
│   └── leave-request-day.entity.ts
├── dto/
│   ├── create-leave-request.dto.ts
│   ├── update-leave-request.dto.ts
│   ├── reject-leave-request.dto.ts
│   ├── cancel-leave-request.dto.ts
│   ├── query-leave-request.dto.ts
│   ├── create-leave-setting.dto.ts
│   ├── update-leave-setting.dto.ts
│   ├── leave-balance.dto.ts                  // response DTO
│   ├── leave-request-response.dto.ts         // response DTO (มี computed fields)
│   └── resolved-shift.dto.ts                 // จาก ShiftProvider
├── services/
│   ├── leave-type.service.ts
│   ├── employee-leave-setting.service.ts
│   ├── leave-balance.service.ts
│   ├── leave-calculation.service.ts
│   ├── leave-request.service.ts
│   └── leave-provider.service.ts             // implements ILeaveProvider
├── controllers/
│   ├── leave-type.controller.ts
│   ├── employee-leave-setting.controller.ts
│   ├── leave-request.controller.ts
│   └── leave-report.controller.ts            // skeleton
├── events/
│   ├── leave-request-approved.event.ts
│   ├── leave-request-cancelled.event.ts
│   ├── leave-request-adjusted.event.ts       // future: shift reconciliation
│   └── employee-leave-setting-changed.event.ts
├── listeners/
│   └── employee-created.listener.ts          // subscribe employee.created → seed
├── interfaces/
│   ├── leave-provider.interface.ts           // exported (Shift consumes)
│   └── shift-provider.interface.ts           // consumed (Shift implements)
├── guards/
│   └── leave-cancel-policy.guard.ts
└── seeds/
    └── leave-type.seed.ts
```

---

## 3. Enums

### 3.1 `leave-status.enum.ts`

```typescript
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
```

### 3.2 `leave-type-code.enum.ts`

```typescript
export enum LeaveTypeCode {
  PERSONAL = 'PERSONAL',       // ลากิจ
  VACATION = 'VACATION',       // ลาพักร้อน
  SICK = 'SICK',               // ลาป่วย
  MATERNITY = 'MATERNITY',     // ลาคลอด
  HAJJ = 'HAJJ',               // ฮัจญ์
  ORDINATION = 'ORDINATION',   // บวช
}
```

### 3.3 `employee-type.enum.ts`

```typescript
export enum EmployeeType {
  MONTHLY = 'MONTHLY',         // รายเดือน
  DAILY = 'DAILY',             // รายวัน
}
```

> หมายเหตุ: Enum นี้ควรมาจาก Employee Module — Leave Module ใช้เป็น reference เท่านั้น

---

## 4. Constants

### 4.1 `leave.constants.ts`

```typescript
export const DEFAULT_HOURS_PER_DAY = 8;        // fallback เมื่อ shift resolve ไม่ได้
export const DEFAULT_MINUTES_PER_DAY = DEFAULT_HOURS_PER_DAY * 60;
export const MIN_LEAVE_HOURS = 1;              // ขั้นต่ำของการลาเป็นชั่วโมง
export const HOUR_INCREMENT = 1;               // step (เต็มจำนวนเท่านั้น)
export const QUOTA_RESET_MONTH = 1;            // ม.ค.
export const QUOTA_RESET_DAY = 1;

// DI Tokens
export const SHIFT_PROVIDER = Symbol('SHIFT_PROVIDER');
export const LEAVE_PROVIDER = Symbol('LEAVE_PROVIDER');
```

### 4.2 `default-leave-settings.ts` (Hardcoded Matrix)

> 📌 **เป็น template ใช้ตอน onboard เท่านั้น** <br>
> หลัง onboard ค่าจริงอยู่ใน `EmployeeLeaveSetting` DB rows <br>
> แก้ matrix นี้ → ต้อง redeploy

```typescript
import { EmployeeType } from '../enums/employee-type.enum';
import { LeaveTypeCode } from '../enums/leave-type-code.enum';

export interface DefaultSettingEntry {
  leaveTypeCode: LeaveTypeCode;
  limitQuantity: number;                     // -1 = unlimited
  requiresEvidenceForPay: boolean;
}

export const DEFAULT_LEAVE_SETTINGS: Record<
  EmployeeType,
  DefaultSettingEntry[]
> = {
  [EmployeeType.MONTHLY]: [
    { leaveTypeCode: LeaveTypeCode.PERSONAL,   limitQuantity: 6,   requiresEvidenceForPay: false },
    { leaveTypeCode: LeaveTypeCode.VACATION,   limitQuantity: 7,   requiresEvidenceForPay: false },
    { leaveTypeCode: LeaveTypeCode.SICK,       limitQuantity: 30,  requiresEvidenceForPay: false },
    { leaveTypeCode: LeaveTypeCode.MATERNITY,  limitQuantity: 120, requiresEvidenceForPay: false },
    { leaveTypeCode: LeaveTypeCode.HAJJ,       limitQuantity: -1,  requiresEvidenceForPay: false },
    { leaveTypeCode: LeaveTypeCode.ORDINATION, limitQuantity: -1,  requiresEvidenceForPay: false },
  ],
  [EmployeeType.DAILY]: [
    { leaveTypeCode: LeaveTypeCode.SICK, limitQuantity: 30, requiresEvidenceForPay: true },
    // ลาประเภทอื่นไม่อยู่ → DAILY ลาไม่ได้
  ],
};
```

---

## 5. Entities (TypeORM)

### 5.1 `LeaveType` — Catalog (Seed only)

```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm';
import { LeaveTypeCode } from '../enums/leave-type-code.enum';

@Entity('leave_types')
export class LeaveType {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code: LeaveTypeCode;

  @Column({ type: 'varchar', length: 100 })
  title: string;                              // 'ลาป่วย'

  @Column({ type: 'varchar', length: 7 })
  color: string;                              // '#FF0000' สำหรับ calendar

  @Column({ type: 'text', nullable: true })
  description?: string;                       // คำอธิบายประเภทลา (สำหรับ tooltip/info)

  @Column({ type: 'boolean', default: false })
  isUseEvidence: boolean;                     // ต้องแนบเอกสารตอนยื่นหรือไม่
                                              // (ไม่เกี่ยวกับ payroll — เป็น validation rule)

  @Column({ type: 'boolean', default: true })
  allowHourly: boolean;                       // ลาเป็นชั่วโมงได้หรือไม่
}
```

**Seed values:**

| code | title | color | description | isUseEvidence | allowHourly |
|------|-------|-------|-------------|---------------|-------------|
| `PERSONAL`   | ลากิจ | `#FFA500` | `null` | false | true |
| `VACATION`   | ลาพักร้อน | `#4CAF50` | `null` | false | true |
| `SICK`       | ลาป่วย | `#F44336` | `null` | false | true |
| `MATERNITY`  | ลาคลอด | `#E91E63` | `null` | true  | false |
| `HAJJ`       | ฮัจญ์ | `#9C27B0` | `null` | false | false |
| `ORDINATION` | บวช | `#FF9800` | `null` | false | false |

> 💡 `description` เป็น `null` ใน seed เริ่มต้น — fill ตอน production ตามต้องการ

> 💡 หมายเหตุ `isUseEvidence` ต่างจาก `requiresEvidenceForPay`:
> - `isUseEvidence` (LeaveType): บังคับแนบ → ไม่แนบ = ยื่นไม่ได้ (เช่น ลาคลอด)
> - `requiresEvidenceForPay` (EmployeeLeaveSetting): มีผลแค่ payroll → ไม่แนบก็ยื่นได้ แต่อาจไม่ได้เงิน

---

### 5.2 `EmployeeLeaveSetting` — Per-Employee Config

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  Unique, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { LeaveTypeCode } from '../enums/leave-type-code.enum';
import { LeaveType } from './leave-type.entity';

@Entity('employee_leave_settings')
@Unique(['employeeId', 'leaveTypeCode'])
@Index(['employeeId'])
export class EmployeeLeaveSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 20 })
  leaveTypeCode: LeaveTypeCode;

  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leaveTypeCode' })
  leaveType: LeaveType;

  // === Quota ===
  @Column({ type: 'int' })
  limitQuantity: number;                      // -1 = unlimited

  // === Payroll Rules ===
  @Column({ type: 'boolean', default: false })
  requiresEvidenceForPay: boolean;            // ต้องมี evidence ถึง isPaid=true

  // === Meta ===
  @Column({ type: 'text', nullable: true })
  note?: string;                              // เช่น "ตามสัญญาจ้าง", "ปรับลดตามรอบประเมิน"

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**พฤติกรรม:**
- มี row = พนักงานคนนี้ลาประเภทนี้ได้
- ไม่มี row = ลาไม่ได้ (`canRequest()` returns false)
- `limitQuantity` ใช้คำนวณ balance โดยตรง (ไม่มี override / default แยก)
- `requiresEvidenceForPay` ใช้ตอนคำนวณ `isPaid` ณ ตอน approve

**Onboard:**
- เมื่อมี event `employee.created` → Listener สร้าง rows ตาม `DEFAULT_LEAVE_SETTINGS[employeeType]`
- พนักงาน MONTHLY → 6 rows
- พนักงาน DAILY → 1 row

> 🔮 **Future: ขยาย rules ได้** โดยเพิ่ม field ใหม่ใน entity นี้ เช่น:
> - `minAdvanceNoticeDays`
> - `requiresHRApproval`
> - `maxConsecutiveDays`

---

### 5.3 `LeaveRequest` — ใบลา (Source of Truth)

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveTypeCode } from '../enums/leave-type-code.enum';
import { LeaveType } from './leave-type.entity';
import { LeaveRequestDay } from './leave-request-day.entity';

@Entity('leave_requests')
@Index(['employeeId', 'status'])
@Index(['employeeId', 'leaveTypeCode', 'status', 'startDate'])  // สำหรับ balance query
@Index(['startDate', 'endDate'])
@Index(['status', 'startDate'])
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === Owner ===
  @Column({ type: 'uuid' })
  employeeId: string;

  // === Leave Type ===
  @Column({ type: 'varchar', length: 20 })
  leaveTypeCode: LeaveTypeCode;

  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leaveTypeCode' })
  leaveType: LeaveType;

  // === Date Range ===
  @Column({ type: 'date' })
  startDate: string;                          // 'YYYY-MM-DD'

  @Column({ type: 'date' })
  endDate: string;                            // ปีเดียวกับ startDate

  // === Time (ถ้าลาเป็นชั่วโมง) ===
  @Column({ type: 'boolean' })
  isFullDay: boolean;

  @Column({ type: 'time', nullable: true })
  startTime?: string;                         // required เมื่อ isFullDay=false

  @Column({ type: 'time', nullable: true })
  endTime?: string;

  // === Computed totals (cached at create/update time) ===
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  totalHours: number;                         // SUM(days.hours)

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  totalDays: number;                          // SUM(days.hours / hoursPerDay)

  // === Reason & Evidence ===
  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidenceUrls: string[];

  // === Status ===
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  // === Business Flags (Stored) ===
  @Column({ type: 'boolean', default: false })
  isPaid: boolean;                            // 🔑 SNAPSHOT — set ตอน approve, reset ตอน cancel
                                              // มีความหมายเฉพาะ status === APPROVED

  @Column({ type: 'boolean', default: false })
  isShiftEstimated: boolean;                  // 🔖 Future: Shift Reconciliation
                                              // true = workMinutes ถูก estimate

  // === Approval Trail ===
  @Column({ type: 'uuid', nullable: true })
  approvedById?: string;                      // userId ของผู้ approve/reject

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectReason?: string;

  // === Cancellation Trail ===
  @Column({ type: 'uuid', nullable: true })
  cancelledById?: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  // === Relations ===
  @OneToMany(() => LeaveRequestDay, (d) => d.request, { cascade: true })
  days: LeaveRequestDay[];

  // === Timestamps ===
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**Business Invariants:**
- `startDate.year === endDate.year` (ลาข้ามปีไม่ได้)
- ถ้า `isFullDay = false` → `startDate === endDate` (ลาเป็นชั่วโมงข้ามวันไม่ได้)
- ถ้า `isFullDay = false` → `startTime`, `endTime` ต้องไม่ null
- `totalHours, totalDays > 0`
- `evidenceUrls` ต้องไม่ว่างเปล่าถ้า `leaveType.isUseEvidence = true`
- `isPaid = false` ตลอด เว้นแต่ `status = APPROVED` แล้ว `evaluateIsPaid()` คืน true

---

### 5.4 `LeaveRequestDay` — Daily Breakdown

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';

@Entity('leave_request_days')
@Unique(['requestId', 'workDate'])
export class LeaveRequestDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LeaveRequest, (r) => r.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: LeaveRequest;

  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'date' })
  workDate: string;                           // 'YYYY-MM-DD'

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  hours: number;                              // จำนวนชั่วโมงที่ลาในวันนี้

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  workMinutesOfDay: number;                   // นาทีทำงานของวันนี้ (จาก shift resolve)
                                              // ใช้คำนวณ days = hours * 60 / workMinutesOfDay
}
```

---

## 6. DTOs

### 6.1 `CreateLeaveRequestDto`

```typescript
import {
  IsEnum, IsDateString, IsBoolean, IsString, IsOptional,
  IsArray, ArrayMaxSize, MinLength, Matches,
} from 'class-validator';
import { LeaveTypeCode } from '../enums/leave-type-code.enum';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveTypeCode)
  leaveTypeCode: LeaveTypeCode;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  isFullDay: boolean;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime?: string;                         // required ถ้า isFullDay=false

  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime?: string;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  evidenceUrls?: string[];
}
```

### 6.2 `UpdateLeaveRequestDto`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaveRequestDto } from './create-leave-request.dto';

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
// แก้ได้ทุก field — แต่ Service ตรวจว่า status === PENDING ก่อน
// ไม่แตะ isPaid (จะคำนวณตอน approve)
```

### 6.3 `RejectLeaveRequestDto`

```typescript
export class RejectLeaveRequestDto {
  @IsString()
  @MinLength(3)
  rejectReason: string;
}
```

### 6.4 `CancelLeaveRequestDto`

```typescript
export class CancelLeaveRequestDto {
  @IsOptional()
  @IsString()
  cancelReason?: string;                      // required ถ้า status เดิม === APPROVED
}
```

### 6.5 `CreateLeaveSettingDto`

```typescript
export class CreateLeaveSettingDto {
  @IsUUID()
  employeeId: string;

  @IsEnum(LeaveTypeCode)
  leaveTypeCode: LeaveTypeCode;

  @IsInt() @Min(-1)
  limitQuantity: number;

  @IsBoolean()
  requiresEvidenceForPay: boolean;

  @IsOptional() @IsString()
  note?: string;
}
```

### 6.6 `UpdateLeaveSettingDto`

```typescript
export class UpdateLeaveSettingDto {
  @IsOptional() @IsInt() @Min(-1)
  limitQuantity?: number;

  @IsOptional() @IsBoolean()
  requiresEvidenceForPay?: boolean;

  @IsOptional() @IsString()
  note?: string;

  @IsOptional() @IsBoolean()
  confirmBelowUsed?: boolean;                 // ต้อง true ถ้า new limit < current used
}
```

### 6.7 `LeaveBalanceDto` (response from `LeaveBalanceService`)

```typescript
export class LeaveBalanceDto {
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  leaveType: LeaveType;                       // populated
  year: number;
  quotaDays: number;                          // จาก EmployeeLeaveSetting.limitQuantity
  usedDays: number;                           // SUM(APPROVED) ของปีนี้
  pendingDays: number;                        // SUM(PENDING) ของปีนี้ (informational)
  remainingDays: number | null;               // null = unlimited
  isUnlimited: boolean;
}
```

### 6.8 `LeaveRequestResponseDto` (response with computed fields)

```typescript
export class LeaveRequestResponseDto {
  // === Persistent fields (from entity) ===
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  totalHours: number;
  totalDays: number;
  reason: string;
  evidenceUrls: string[];
  status: LeaveStatus;
  isPaid: boolean;                            // ✅ persistent — snapshot
  isShiftEstimated: boolean;
  approvedById?: string;
  approvedAt?: Date;
  rejectReason?: string;
  cancelledById?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
  days: LeaveRequestDay[];

  // === Computed fields (NOT stored) ===
  isBackdated: boolean;                       // createdAt > startDate
  isOverQuota: boolean;                       // balance.usedDays > quotaDays
  daysSinceSubmitted: number;
  remainingAfterThis?: number;                // preview สำหรับใบลา PENDING
}
```

### 6.9 `ResolvedShiftDto` (จาก ShiftProvider)

```typescript
export class ResolvedShiftDto {
  workMinutes: number;                        // นาทีทำงานจริงรวมทุกกะของวันนี้
  startTime: string;                          // ของกะแรก
  endTime: string;                            // ของกะสุดท้าย
  breakStartTime?: string;
  breakEndTime?: string;
  breakMinutes: number;
  source: 'EMPLOYEE_SHIFT' | 'LOOKAHEAD' | 'DEFAULT';
}
```

---

## 7. Service Layer

### 7.1 `LeaveTypeService`

```typescript
class LeaveTypeService {
  findAll(): Promise<LeaveType[]>;
  findOne(code: LeaveTypeCode): Promise<LeaveType>;
  findByCodes(codes: LeaveTypeCode[]): Promise<LeaveType[]>;
  // ไม่มี create/update/delete — fix ใน seed
}
```

### 7.2 `EmployeeLeaveSettingService`

```typescript
@Injectable()
class EmployeeLeaveSettingService {
  constructor(
    @InjectRepository(EmployeeLeaveSetting)
    private readonly settingRepo: Repository<EmployeeLeaveSetting>,
    private readonly leaveTypeService: LeaveTypeService,
    private readonly balanceService: LeaveBalanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 1. ส่ง employeeId → return ประเภทลาที่ลาได้ (สำหรับ client dropdown)
  async getEligibleLeaveTypes(employeeId: string): Promise<LeaveType[]> {
    const settings = await this.settingRepo.find({
      where: { employeeId },
      relations: ['leaveType'],
    });
    return settings.map(s => s.leaveType);
    // ไม่มี sort — caller จัดการเอง
  }

  // 2. เช็คว่าลาประเภทนี้ได้ไหม (validate ใน server)
  async canRequest(employeeId: string, leaveTypeCode: LeaveTypeCode): Promise<boolean> {
    return this.settingRepo.exist({ where: { employeeId, leaveTypeCode } });
  }

  // 3. ดึง setting เต็ม (ใช้โดย LeaveBalanceService + LeaveRequestService)
  async getSetting(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
  ): Promise<EmployeeLeaveSetting | null> {
    return this.settingRepo.findOne({ where: { employeeId, leaveTypeCode } });
  }

  // 4. List ทั้งหมดของ employee
  async findByEmployee(employeeId: string): Promise<EmployeeLeaveSetting[]> {
    return this.settingRepo.find({
      where: { employeeId },
      relations: ['leaveType'],
    });
  }

  // 5. CRUD by HR
  async create(dto: CreateLeaveSettingDto, hrUserId: string): Promise<EmployeeLeaveSetting>;
  async update(id: string, dto: UpdateLeaveSettingDto, hrUserId: string): Promise<EmployeeLeaveSetting>;
  async delete(id: string, hrUserId: string): Promise<void>;

  // 6. Initialize ตอน onboard (เรียกจาก listener)
  async initializeForEmployee(employeeId: string, employeeType: EmployeeType): Promise<void> {
    const defaults = DEFAULT_LEAVE_SETTINGS[employeeType] ?? [];
    const existing = await this.settingRepo.find({
      where: { employeeId },
      select: ['leaveTypeCode'],
    });
    const existingCodes = new Set(existing.map(s => s.leaveTypeCode));

    const toInsert = defaults
      .filter(d => !existingCodes.has(d.leaveTypeCode))   // idempotent
      .map(d => this.settingRepo.create({ ...d, employeeId }));

    if (toInsert.length > 0) {
      await this.settingRepo.save(toInsert);
    }
  }

  // 7. Reset เพื่อกลับไปใช้ default
  async resetToDefault(employeeId: string, employeeType: EmployeeType): Promise<void> {
    await this.settingRepo.delete({ employeeId });
    await this.initializeForEmployee(employeeId, employeeType);
  }
}
```

**`update()` Logic:**

```typescript
async update(id, dto, hrUserId) {
  const setting = await this.settingRepo.findOneOrFail({ where: { id } });
  const oldLimit = setting.limitQuantity;

  if (dto.limitQuantity !== undefined && dto.limitQuantity !== -1) {
    const currentUsed = await this.balanceService.calculateUsedDays(
      setting.employeeId,
      setting.leaveTypeCode,
      new Date().getFullYear(),
    );
    if (dto.limitQuantity < currentUsed && !dto.confirmBelowUsed) {
      throw new BadRequestException(
        `New limit (${dto.limitQuantity}) below current used (${currentUsed}). ` +
        `Pass confirmBelowUsed=true to proceed.`
      );
    }
  }

  Object.assign(setting, dto);
  const saved = await this.settingRepo.save(setting);

  this.eventEmitter.emit('employee.leave-setting.changed', {
    employeeId: setting.employeeId,
    leaveTypeCode: setting.leaveTypeCode,
    oldLimit,
    newLimit: setting.limitQuantity,
    changedById: hrUserId,
  });

  return saved;
}
```

### 7.3 `LeaveBalanceService` (COMPUTED — ไม่มี persistent state)

```typescript
class LeaveBalanceService {
  async getBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    year: number,
  ): Promise<LeaveBalanceDto>;

  async getAllBalances(employeeId: string, year: number): Promise<LeaveBalanceDto[]>;

  // === Internal ===
  async calculateUsedDays(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    year: number,
  ): Promise<number>;

  async calculatePendingDays(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    year: number,
  ): Promise<number>;
}
```

**Implementation:**

```typescript
async getBalance(employeeId, leaveTypeCode, year) {
  const setting = await this.settingService.getSetting(employeeId, leaveTypeCode);
  if (!setting) {
    throw new ForbiddenException(
      `Employee ${employeeId} not eligible for ${leaveTypeCode}`
    );
  }

  const [usedDays, pendingDays] = await Promise.all([
    this.calculateUsedDays(employeeId, leaveTypeCode, year),
    this.calculatePendingDays(employeeId, leaveTypeCode, year),
  ]);

  const isUnlimited = setting.limitQuantity === -1;
  return {
    employeeId,
    leaveTypeCode,
    leaveType: setting.leaveType,
    year,
    quotaDays: setting.limitQuantity,
    usedDays,
    pendingDays,
    remainingDays: isUnlimited ? null : setting.limitQuantity - usedDays,
    isUnlimited,
  };
}

async getAllBalances(employeeId, year) {
  const settings = await this.settingService.findByEmployee(employeeId);
  return Promise.all(
    settings.map(s => this.getBalance(employeeId, s.leaveTypeCode, year))
  );
}

async calculateUsedDays(employeeId, leaveTypeCode, year) {
  const result = await this.requestRepo
    .createQueryBuilder('r')
    .select('COALESCE(SUM(r.totalDays), 0)', 'used')
    .where('r.employeeId = :employeeId', { employeeId })
    .andWhere('r.leaveTypeCode = :leaveTypeCode', { leaveTypeCode })
    .andWhere('r.status = :status', { status: LeaveStatus.APPROVED })
    .andWhere('EXTRACT(YEAR FROM r.startDate) = :year', { year })
    .getRawOne();
  return Number(result.used);
}
```

### 7.4 `LeaveCalculationService`

```typescript
class LeaveCalculationService {
  // คำนวณรายวันทั้ง range
  async calculateRequestDays(
    employeeId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<{
    days: Partial<LeaveRequestDay>[];
    totalHours: number;
    totalDays: number;
    isShiftEstimated: boolean;
  }>;

  // คำนวณชั่วโมงสำหรับ 1 วัน
  async calculateHoursForDay(
    employeeId: string,
    date: string,
    isFullDay: boolean,
    startTime?: string,
    endTime?: string,
  ): Promise<{ hours: number; workMinutesOfDay: number; source: string }>;

  // หักช่วงทับพักเที่ยง
  private calculateBreakOverlap(
    leaveStart: string,
    leaveEnd: string,
    breakStart?: string,
    breakEnd?: string,
  ): number;
}
```

**Logic หลัก:**

```typescript
async calculateHoursForDay(employeeId, date, isFullDay, startTime, endTime) {
  const resolved = await this.shiftProvider.resolveExpectedWorkMinutes(employeeId, date);
  const workMinutes = resolved?.workMinutes ?? DEFAULT_MINUTES_PER_DAY;
  const source = resolved?.source ?? 'DEFAULT';

  if (isFullDay) {
    // เต็มวัน → ใช้ workMinutes (พักหักให้แล้ว)
    return { hours: workMinutes / 60, workMinutesOfDay: workMinutes, source };
  }

  // ลาเป็นชั่วโมง → หักช่วงพัก
  const rawMinutes = diffMinutes(endTime, startTime);
  const breakOverlap = this.calculateBreakOverlap(
    startTime, endTime, resolved?.breakStartTime, resolved?.breakEndTime,
  );
  const netMinutes = rawMinutes - breakOverlap;
  return { hours: netMinutes / 60, workMinutesOfDay: workMinutes, source };
}
```

### 7.5 `LeaveRequestService` (Main use cases)

```typescript
class LeaveRequestService {
  async create(employeeId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequestResponseDto>;
  async update(id: string, dto: UpdateLeaveRequestDto, userId: string): Promise<LeaveRequestResponseDto>;
  async approve(id: string, approverId: string): Promise<LeaveRequestResponseDto>;
  async reject(id: string, dto: RejectLeaveRequestDto, approverId: string): Promise<LeaveRequestResponseDto>;
  async cancel(id: string, dto: CancelLeaveRequestDto, userId: string, role: Role): Promise<LeaveRequestResponseDto>;
  async findOne(id: string): Promise<LeaveRequestResponseDto>;
  async query(filter: QueryLeaveRequestDto): Promise<LeaveRequestResponseDto[]>;

  // === Helpers ===
  private async checkOverlap(employeeId, startDate, endDate, excludeId?): Promise<void>;
  private evaluateIsPaid(setting: EmployeeLeaveSetting, evidenceUrls: string[]): boolean;
  private async enrichWithComputedFields(req: LeaveRequest): Promise<LeaveRequestResponseDto>;
}
```

**Implementation ของ `approve()` และ `cancel()`:**

```typescript
async approve(id, approverId) {
  const request = await this.requestRepo.findOneOrFail({ where: { id }, relations: ['days'] });
  if (request.status !== LeaveStatus.PENDING) {
    throw new ConflictException('Only PENDING requests can be approved');
  }

  // 🔑 คำนวณ isPaid ตอนนี้ (snapshot)
  const setting = await this.settingService.getSetting(
    request.employeeId,
    request.leaveTypeCode,
  );
  if (!setting) throw new ForbiddenException();
  const isPaid = this.evaluateIsPaid(setting, request.evidenceUrls);

  request.status = LeaveStatus.APPROVED;
  request.isPaid = isPaid;
  request.approvedById = approverId;
  request.approvedAt = new Date();
  const saved = await this.requestRepo.save(request);

  this.eventEmitter.emit('leave.request.approved', new LeaveRequestApprovedEvent(saved));
  return this.enrichWithComputedFields(saved);
}

async cancel(id, dto, userId, role) {
  const request = await this.requestRepo.findOneOrFail({ where: { id }, relations: ['days'] });

  // Guard logic (handled by LeaveCancelPolicyGuard)
  const previousStatus = request.status;

  request.status = LeaveStatus.CANCELLED;
  request.isPaid = false;                     // 🔑 force reset
  request.cancelledById = userId;
  request.cancelledAt = new Date();
  request.cancelReason = dto.cancelReason;
  const saved = await this.requestRepo.save(request);

  if (previousStatus === LeaveStatus.APPROVED) {
    this.eventEmitter.emit('leave.request.cancelled', new LeaveRequestCancelledEvent(saved));
  }

  return this.enrichWithComputedFields(saved);
}

private evaluateIsPaid(setting, evidenceUrls): boolean {
  if (setting.requiresEvidenceForPay) {
    return (evidenceUrls?.length ?? 0) > 0;
  }
  return true;
}
```

### 7.6 `LeaveProviderService` (implements `ILeaveProvider`)

```typescript
class LeaveProviderService implements ILeaveProvider {
  async getApprovedLeaves(employeeId: string, range: DateRange): Promise<ApprovedLeaveDto[]> {
    return this.requestRepo.find({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(range.end),
        endDate: MoreThanOrEqual(range.start),
      },
      relations: ['days'],
    }).then(reqs => reqs.map(r => ({
      requestId: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days.map(d => d.workDate),
    })));
  }

  async isOnLeave(employeeId: string, date: string): Promise<boolean> {
    return this.requestRepo.exist({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
      },
    });
  }
}
```

---

## 8. Listeners (Event-driven)

### 8.1 `EmployeeCreatedListener`

```typescript
@Injectable()
export class EmployeeCreatedListener {
  constructor(
    private readonly settingService: EmployeeLeaveSettingService,
  ) {}

  @OnEvent('employee.created')
  async handleEmployeeCreated(event: EmployeeCreatedEvent): Promise<void> {
    await this.settingService.initializeForEmployee(event.id, event.type);
  }
}
```

> 📌 Employee Module ต้องยิง event `employee.created` ที่มี payload `{ id, type, ... }`

---

## 9. Cross-Module Interfaces

### 9.1 `IShiftProvider` (Leave consumes, Shift implements)

```typescript
// interfaces/shift-provider.interface.ts

export interface IShiftProvider {
  resolveExpectedWorkMinutes(
    employeeId: string,
    date: string,
  ): Promise<ResolvedShiftDto | null>;

  getEmployeeShifts(
    employeeId: string,
    range: DateRange,
  ): Promise<EmployeeShiftDto[]>;
}
```

### 9.2 `ILeaveProvider` (Shift consumes, Leave implements)

```typescript
// interfaces/leave-provider.interface.ts

export interface ILeaveProvider {
  getApprovedLeaves(
    employeeId: string,
    range: DateRange,
  ): Promise<ApprovedLeaveDto[]>;

  isOnLeave(employeeId: string, date: string): Promise<boolean>;
}
```

### 9.3 Module wiring (DI)

```typescript
// leave.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([
    LeaveType, EmployeeLeaveSetting, LeaveRequest, LeaveRequestDay,
  ])],
  providers: [
    LeaveTypeService,
    EmployeeLeaveSettingService,
    LeaveBalanceService,
    LeaveCalculationService,
    LeaveRequestService,
    EmployeeCreatedListener,
    { provide: LEAVE_PROVIDER, useClass: LeaveProviderService },
  ],
  exports: [LEAVE_PROVIDER, EmployeeLeaveSettingService],
})
export class LeaveModule {}

// shift.module.ts
@Module({
  imports: [LeaveModule],
  providers: [
    { provide: SHIFT_PROVIDER, useClass: ShiftProviderService },
  ],
  exports: [SHIFT_PROVIDER],
})
export class ShiftModule {}
```

> ⚠️ **Circular dependency**: Leave needs Shift, Shift needs Leave. แก้ด้วย:
> - แยก interface ออกเป็น package/folder กลาง
> - หรือใช้ `forwardRef()` ใน NestJS

---

## 10. Domain Events

```typescript
// events/leave-request-approved.event.ts
export class LeaveRequestApprovedEvent {
  constructor(
    public readonly requestId: string,
    public readonly employeeId: string,
    public readonly leaveTypeCode: LeaveTypeCode,
    public readonly dates: string[],            // ['2026-06-01', '2026-06-02']
    public readonly isFullDay: boolean,
    public readonly startTime?: string,
    public readonly endTime?: string,
    public readonly isPaid: boolean,            // snapshot
  ) {}
}

// events/leave-request-cancelled.event.ts
export class LeaveRequestCancelledEvent {
  constructor(
    public readonly requestId: string,
    public readonly employeeId: string,
    public readonly previousStatus: LeaveStatus,   // เคย APPROVED หรือ PENDING
    public readonly dates: string[],
  ) {}
}

// events/leave-request-adjusted.event.ts  🔖 Future
export class LeaveRequestAdjustedEvent {
  constructor(
    public readonly requestId: string,
    public readonly oldTotalHours: number,
    public readonly newTotalHours: number,
    public readonly reason: 'SHIFT_RECONCILIATION',
  ) {}
}

// events/employee-leave-setting-changed.event.ts
export class EmployeeLeaveSettingChangedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly leaveTypeCode: LeaveTypeCode,
    public readonly oldLimit: number | null,
    public readonly newLimit: number | null,
    public readonly changedById: string,
  ) {}
}
```

**Event Topics (`@nestjs/event-emitter`):**

| Topic | Payload | Subscriber |
|-------|---------|------------|
| `leave.request.submitted` | LeaveRequestSubmittedEvent | Notification → approver |
| `leave.request.approved` | LeaveRequestApprovedEvent | Shift → cancel EmployeeShift |
| `leave.request.rejected` | LeaveRequestRejectedEvent | Notification → employee |
| `leave.request.cancelled` | LeaveRequestCancelledEvent | Shift → re-create EmployeeShift |
| `leave.request.adjusted` | LeaveRequestAdjustedEvent | 🔖 Future: Shift Reconciliation |
| `employee.leave-setting.changed` | EmployeeLeaveSettingChangedEvent | Notification → employee |
| `employee.created` | EmployeeCreatedEvent (จาก Employee Module) | Leave → seed settings |

---

## 11. Indexes & Performance

### 11.1 Indexes ที่จำเป็น

```sql
-- LeaveRequest
CREATE INDEX idx_leave_request_employee_status
  ON leave_requests (employee_id, status);

CREATE INDEX idx_leave_request_balance_query
  ON leave_requests (employee_id, leave_type_code, status, start_date);
  -- ใช้โดย LeaveBalanceService.calculateUsedDays()

CREATE INDEX idx_leave_request_date_range
  ON leave_requests (start_date, end_date);

CREATE INDEX idx_leave_request_status_date
  ON leave_requests (status, start_date);
  -- ใช้โดย ILeaveProvider.getApprovedLeaves()

-- LeaveRequestDay
CREATE UNIQUE INDEX idx_leave_request_day_unique
  ON leave_request_days (request_id, work_date);

-- EmployeeLeaveSetting
CREATE UNIQUE INDEX idx_emp_setting_unique
  ON employee_leave_settings (employee_id, leave_type_code);

CREATE INDEX idx_emp_setting_employee
  ON employee_leave_settings (employee_id);
```

### 11.2 Performance Considerations

- **Balance query** ใช้ index `(employee_id, leave_type_code, status, start_date)` → fast aggregate
- **Overlap check** ใช้ index `(start_date, end_date)` + employee_id filter
- **Bulk balance** (`getAllBalances`) ใช้ 1 query รวม join → process ใน application
- ถ้า scale ใหญ่ขึ้น → พิจารณา materialized view สำหรับ yearly totals (🔖 future)

---

## 12. Edge Cases (Technical)

| # | Case | Handling |
|---|------|----------|
| 1 | ลาทับซ้อน | `LeaveRequestService.checkOverlap()` → throw 409 |
| 2 | ลาในวันหยุดบริษัท | ไม่ตรวจ — อนุญาตเสมอ |
| 3 | ลาในวันที่ไม่มีกะ | ShiftProvider คืน null → fallback DEFAULT_MINUTES_PER_DAY + `isShiftEstimated` |
| 4 | ลาในอนาคตยังไม่มี EmployeeShift | Tier 2: ShiftProvider look-ahead จาก ShiftAssignment |
| 5 | ลาข้ามวันแบบชั่วโมง | DTO validation: `!isFullDay && startDate !== endDate` → 400 |
| 6 | ลาข้ามปี | DTO validation: `startDate.year !== endDate.year` → 400 |
| 7 | ลาเป็นชั่วโมงทับพักเที่ยง | `calculateBreakOverlap()` → หักออก |
| 8 | ลาเกินโควต้า | ผ่าน save — client เตือนตอน approve |
| 9 | พนักงานไม่มี EmployeeLeaveSetting row | `canRequest()` returns false → 403 |
| 10 | DAILY + SICK + ไม่มี evidence | save PENDING. Approve → `isPaid=false` |
| 11 | DAILY + SICK + มี evidence | save PENDING. Approve → `isPaid=true` |
| 12 | HR ลด `limitQuantity` ต่ำกว่า used | `update()` ต้อง `confirmBelowUsed: true` |
| 13 | Cancel ใบลา APPROVED | event `leave.request.cancelled` + `isPaid=false` (force) |
| 14 | แก้ไข LeaveRequest PENDING | ลบ days เก่า + recalc + save (ไม่แตะ isPaid) |
| 15 | หลายกะ/วัน | ShiftProvider SUM workMinutes ทุกกะ |
| 16 | ShiftProvider timeout/error | catch → fallback DEFAULT + `isShiftEstimated` |
| 17 | `leaveType.allowHourly = false` + `isFullDay=false` | DTO/Service → 400 |
| 18 | HR ลบ EmployeeLeaveSetting หลังมีใบลา APPROVED | ใบลาเก่าคงอยู่ (snapshot isPaid) — ยื่นใหม่ไม่ได้ |
| 19 | HR เปลี่ยน `requiresEvidenceForPay` หลังใบลา APPROVED | ใบลาเก่าไม่กระทบ (isPaid snapshot) |
| 20 | HR เปลี่ยน `requiresEvidenceForPay` + ใบลา PENDING ค้าง | ตอน approve ใช้ค่าปัจจุบัน |
| 21 | พนักงาน TERMINATED | 🔖 Future: cancel ใบลา APPROVED ในอนาคต auto |
| 22 | Employee Type เปลี่ยน | 🔖 ไม่ออกแบบ — HR ปรับ settings เอง |
| 23 | Concurrent approve (race condition) | ใช้ optimistic locking ผ่าน `version` column หรือ DB transaction |
| 24 | Onboard listener ยิงซ้ำ | `initializeForEmployee()` idempotent (เช็ค existing rows ก่อน insert) |

---

## 13. Computed Fields Summary

**Never stored in DB — always computed at response time:**

| Field | Source | Where Computed |
|-------|--------|----------------|
| `LeaveBalanceDto.quotaDays` | `EmployeeLeaveSetting.limitQuantity` | `LeaveBalanceService.getBalance()` |
| `LeaveBalanceDto.usedDays` | SUM(LeaveRequest.totalDays WHERE APPROVED) | `LeaveBalanceService.calculateUsedDays()` |
| `LeaveBalanceDto.pendingDays` | SUM(LeaveRequest.totalDays WHERE PENDING) | `LeaveBalanceService.calculatePendingDays()` |
| `LeaveBalanceDto.remainingDays` | quotaDays - usedDays | `LeaveBalanceService.getBalance()` |
| `LeaveRequestResponseDto.isBackdated` | `createdAt > startDate` | `LeaveRequestService.enrichWithComputedFields()` |
| `LeaveRequestResponseDto.isOverQuota` | `balance.usedDays > balance.quotaDays` | `LeaveRequestService.enrichWithComputedFields()` |
| `LeaveRequestResponseDto.daysSinceSubmitted` | `now - createdAt` | `LeaveRequestService.enrichWithComputedFields()` |
| `LeaveRequestResponseDto.remainingAfterThis` | `balance.remainingDays - totalDays` | `LeaveRequestService.enrichWithComputedFields()` |

**Stored as snapshot (persistent):**

| Field | When Set | When Reset |
|-------|----------|------------|
| `LeaveRequest.isPaid` | ตอน `approve()` คำนวณจาก setting + evidence | ตอน `cancel()` → `false` (force) |
| `LeaveRequest.isShiftEstimated` | ตอน `create()` / `update()` (ถ้า shift resolve ผ่าน Tier 2/3) | 🔖 Future: Shift Reconciliation |

---

## 14. Open Questions / Future Work

| # | หัวข้อ | ผลกระทบกับ Schema |
|---|-------|---------------------|
| 1 | **Approval Flow** (หลายระดับ, escalation) | อาจเพิ่ม `LeaveRequestApprovalStep` entity |
| 2 | **Shift Reconciliation Service** | ใช้ event `leave.request.adjusted` |
| 3 | **`LeaveSettingTemplate` entity** (HR แก้ default ผ่าน UI) | เพิ่ม entity แล้ว resolve: Template → Hardcoded |
| 4 | **Setting change audit log** | เพิ่ม `EmployeeLeaveSettingHistory` entity |
| 5 | **Daily Leave Summary** | ใช้ existing entity + view/query |
| 6 | **Leave Reports** | ใช้ existing entity + materialized view |
| 7 | **Notification channels** | external — ไม่กระทบ schema |
| 8 | **Audit log generic** | generic module หรือ AspectJ-style interceptor |
| 9 | **TERMINATED employee auto-cancel** | listen `employee.terminated` event |
| 10 | **Pro-rate สำหรับลาออกกลางปี** | ยังไม่พิจารณา |
| 11 | **เพิ่ม rule ใน EmployeeLeaveSetting** (`minAdvanceNoticeDays`, `requiresHRApproval`, etc.) | เพิ่ม field ใน entity + update `evaluateIsPaid()` |

---

## 15. หมายเหตุสำคัญสำหรับ AI / Developer

> 📌 **อ่านก่อนเริ่ม implement:**

1. **`LeaveBalance` ไม่ใช่ entity** — เป็น DTO ที่คำนวณ live จาก `LeaveRequest`
2. **`EmployeeLeaveSetting` คือ source of truth ของ "ลาได้/ไม่ได้" และ "โควต้า"** — ไม่ใช่ matrix แยก
3. **มี row ใน `EmployeeLeaveSetting` = ลาประเภทนั้นได้** — ไม่มี = ลาไม่ได้
4. **`LeaveType.isUseEvidence` ≠ `EmployeeLeaveSetting.requiresEvidenceForPay`**:
   - `isUseEvidence`: บังคับแนบไฟล์ตอนยื่น (validation)
   - `requiresEvidenceForPay`: มีผลกับ payroll (ไม่มี evidence = ไม่ได้เงิน)
5. **`isPaid` เป็น snapshot** — set ตอน approve, reset ตอน cancel ห้ามคำนวณ live
6. **`isPaid` มีความหมายเฉพาะ `status === APPROVED`** — สถานะอื่น Payroll ควรเพิกเฉย
7. **ทุก mutation ของ `LeaveRequest.status`** ต้องยิง event ที่ตรงกัน (อย่าลืม)
8. **Index `(employee_id, leave_type_code, status, start_date)` สำคัญมาก**
9. **`isShiftEstimated = true`** = mark ใบลาที่ workMinutes ถูก estimate → 🔖 Future: Shift Reconciliation
10. **`isOverQuota` และ `isBackdated` ไม่อยู่ใน DB** — เป็น computed field ใน response DTO
11. **ลาข้ามปี / ลาข้ามวันแบบชั่วโมง = reject เสมอ** — ห้ามพยายาม support
12. **Shift Module ต้องเพิ่ม `breakEndTime` field ก่อน** Leave Module จะใช้ได้เต็มที่
13. **Circular dependency Leave ↔ Shift** — แก้ด้วย interface ที่อยู่ใน package กลาง หรือ `forwardRef()`
14. **Approval flow ยังไม่ออกแบบ** — ตอนนี้ `approve()` ไม่มี authorization check ที่ซับซ้อน
15. **Onboard listener ต้อง idempotent** — `initializeForEmployee()` เช็ค existing rows ก่อน insert
16. **Default Leave Settings เป็น hardcoded** — แก้ default = แก้ code + redeploy
