# Domain — Module: สมาชิก (Member / Loyalty)

## Entities หลัก

### 1. Member (สมาชิก)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| first_name | String | ✓ | ชื่อ |
| last_name | String | - | นามสกุล |
| phone | String | ✓ | เบอร์โทร (unique) |
| birth_date | Date | - | วันเกิด |
| national_id | String | - | เลขบัตรประชาชน |
| register_date | Date | ✓ | วันที่สมัคร |
| register_branch_id | UUID | ✓ | สาขาที่สมัคร |
| registered_by | UUID | ✓ | พนักงานที่รับสมัคร |
| total_points | Int | ✓ | แต้มสะสมรวม (ที่ยังไม่หมดอายุ) |
| total_spent | Decimal | ✓ | ยอดซื้อสะสมรวม |
| note | String | - | หมายเหตุ |
| is_active | Boolean | ✓ | ใช้งานอยู่หรือไม่ |

### 2. PointTransaction (ธุรกรรมแต้ม)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| member_id | UUID | ✓ | อ้างอิงสมาชิก |
| type | Enum | ✓ | earn/redeem/expire/manual |
| points | Int | ✓ | จำนวนแต้ม (+ ได้รับ, - ใช้/หมดอายุ) |
| reference_id | UUID | - | อ้างอิง Order |
| expire_date | Date | - | วันหมดอายุ (31 ธ.ค. ของปีนั้น สำหรับ type=expire) |
| note | String | - | หมายเหตุ |
| created_at | DateTime | ✓ | เวลาบันทึก |
| created_by | UUID | ✓ | พนักงาน/ระบบที่บันทึก |

### 3. LoyaltyConfig (การตั้งค่าระบบแต้ม)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| earn_rate | Decimal | ✓ | ทุก X บาท = 1 แต้ม |
| redeem_rate | Decimal | ✓ | 1 แต้ม = Y บาท |
| min_redeem_points | Int | ✓ | แต้มขั้นต่ำต่อการแลก |
| max_redeem_pct | Decimal | ✓ | % สูงสุดของยอดบิลที่แลกได้ |
| point_expiry_month | Int | ✓ | เดือนที่แต้มหมดอายุ (fixed = 12) |
| point_expiry_day | Int | ✓ | วันที่แต้มหมดอายุ (fixed = 31) |
| allow_with_promotion | Boolean | ✓ | ใช้แต้มพร้อมโปรได้หรือไม่ |
| updated_at | DateTime | ✓ | อัปเดตล่าสุด |
| updated_by | UUID | ✓ | ผู้อัปเดต |

---

## Business Rules

### กฎแต้มสะสม
- แต้มสะสม = floor(ยอดบิลสุทธิ / earn_rate)
- แต้มบวกทันทีเมื่อบิลสำเร็จ
- แต้มทุกชุดหมดอายุพร้อมกันวันที่ 31 ธันวาคมของทุกปี (annual reset)

### กฎแลกแต้ม
- ส่วนลดจากแต้ม = แต้มที่ใช้ × redeem_rate
- จำกัดสูงสุดต่อบิล = ยอดบิล × max_redeem_pct / 100
- แต้มขั้นต่ำ: ต้องมีแต้ม ≥ min_redeem_points ถึงแลกได้

### กฎหมดอายุแต้มประจำปี
- ทุกวันที่ 31 ธันวาคม เวลาสิ้นวัน ระบบรีเซ็ต total_points = 0 ทุกสมาชิก
- สร้าง PointTransaction type=`expire` เฉพาะสมาชิกที่ total_points > 0 ก่อนรีเซ็ต
- ไม่มีการแจ้งเตือนล่วงหน้า
- แต้มที่ได้รับหลังเที่ยงคืน 31 ธ.ค. (= วันที่ 1 ม.ค. ปีใหม่) เป็นแต้มปีถัดไป

### กฎยกเลิกบิล
- ยกเลิกบิล → หักแต้มที่ได้รับจากบิลนั้น
- ถ้าสมาชิกใช้แต้มในบิลนั้น → คืนแต้มที่ใช้กลับมา

---

## Relationships
```
Member ─── has many ──► PointTransaction
Member ─── has many ──► Order           [→ module ขาย]
LoyaltyConfig ─── (global/branch level)
```

## Enum Values

### PointTransactionType
- `earn` — สะสมแต้ม (จากการซื้อ)
- `redeem` — ใช้แต้มแลกส่วนลด
- `expire` — หมดอายุ (ระบบตัดอัตโนมัติ)
- `manual` — ปรับแต้มด้วยมือ (แอดมิน)
- `reverse` — คืนแต้ม (จากยกเลิกบิล)
