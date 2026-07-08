# Domain — Module: โปรโมชัน (Promotion)

## Entities หลัก

### 1. Promotion (โปรโมชัน)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| name | String | ✓ | ชื่อโปรโมชัน |
| type | Enum | ✓ | discount/bundle/member_price |
| discount_type | Enum | - | percent/fixed_amount |
| discount_value | Decimal | - | ค่าส่วนลด (% หรือบาท) |
| min_purchase_amount | Decimal | - | ยอดซื้อขั้นต่ำ |
| min_purchase_qty | Int | - | จำนวนชิ้นขั้นต่ำ |
| customer_group | Enum | ✓ | all/general/member |
| apply_to | Enum | ✓ | order/item/category |
| apply_to_id | UUID | - | สินค้า/หมวดที่ใช้ (NULL = ทั้งหมด) |
| start_date | DateTime | ✓ | เริ่มมีผล |
| end_date | DateTime | - | สิ้นสุด (NULL = ไม่มีวันสิ้นสุด) |
| is_active | Boolean | ✓ | เปิด/ปิดโปร |
| stackable | Boolean | ✓ | ใช้พร้อมโปรอื่นได้หรือไม่ |
| allow_with_points | Boolean | ✓ | ใช้พร้อมแต้มสมาชิกได้หรือไม่ |
| branch_ids | UUID[] | - | NULL = ทุกสาขา |
| usage_count | Int | ✓ | จำนวนครั้งที่ใช้ |
| created_by | UUID | ✓ | ผู้สร้าง |
| created_at | DateTime | ✓ | วันที่สร้าง |

### 2. Bundle (โปรชุด)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| promotion_id | UUID | ✓ | อ้างอิงโปรโมชัน |
| bundle_price | Decimal | ✓ | ราคาชุด |

### 3. BundleItem (สินค้าในชุด)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| bundle_id | UUID | ✓ | อ้างอิงชุด |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| unit_id | UUID | ✓ | หน่วยที่ใช้ในชุด |
| quantity | Decimal | ✓ | จำนวนในชุด |

---

## Business Rules

### กฎการใช้โปร
- โปรใช้ได้เฉพาะในช่วงวันที่กำหนด (start_date ≤ now ≤ end_date)
- is_active = true เท่านั้น
- กลุ่มลูกค้าต้องตรงกัน
- สาขาต้องอยู่ใน branch_ids (หรือ NULL = ทุกสาขา)

### กฎการ Stack โปร
- stackable = false → ใช้โปรสูงสุดอันเดียว
- stackable = true → ใช้หลายโปรพร้อมกันได้
- แต้มสมาชิก: ใช้พร้อมโปรได้เฉพาะเมื่อ allow_with_points = true

### กฎโปรชุด
- ราคาชุด < ผลรวมราคาปกติของสินค้าทุกชิ้น (ระบบไม่บังคับ แต่แจ้งเตือน)
- ขายชุดเป็น 1 unit — แยกรายการได้ในบิล
- สต็อกตัดตามรายการสินค้าในชุด

### กฎ Discount
- discount_type = `percent`: ส่วนลด = ยอดบิล × discount_value / 100
- discount_type = `fixed_amount`: ส่วนลด = discount_value (บาท)
- ส่วนลดสูงสุดไม่เกินยอดบิล

---

## Relationships
```
Promotion ─── has one  ──► Bundle
Bundle ─── has many ──► BundleItem
BundleItem ─── belongs to ► Product    [→ module สินค้า]
Promotion ─── has many ──► OrderItem (via promotion_id)  [→ module ขาย]
```

## Enum Values

### PromotionType
- `discount` — ส่วนลดราคา (% หรือบาท)
- `bundle` — โปรชุดสินค้า
- `member_price` — ราคาพิเศษสำหรับสมาชิก

### DiscountType
- `percent` — ส่วนลดเป็น %
- `fixed_amount` — ส่วนลดเป็นจำนวนบาท

### PromotionApplyTo
- `order` — ลดทั้งบิล
- `item` — ลดเฉพาะสินค้าที่กำหนด
- `category` — ลดสินค้าในหมวดที่กำหนด
