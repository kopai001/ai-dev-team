# Domain — Module: สินค้า

## Entities หลัก

### 1. Product (สินค้า)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| name | String | ✓ | ชื่อสินค้า |
| barcode | String | - | บาร์โค้ด (unique ถ้ามี) |
| category_id | UUID | ✓ | อ้างอิงหมวดหมู่ย่อย |
| base_unit_id | UUID | ✓ | หน่วยฐาน (หน่วยเล็กสุด) |
| cost_price | Decimal | ✓ | ราคาทุน (ต่อหน่วยฐาน) |
| sell_price | Decimal | ✓ | ราคาขายปกติ (ต่อหน่วยฐาน) |
| image_url | String | - | URL รูปสินค้า |
| tags | String[] | - | แท็กสินค้า (ค้นหา/จัดกลุ่ม) |
| purpose | String | - | วัตถุประสงค์การใช้งาน |
| status | Enum | ✓ | active / hidden / disabled |
| is_pinned | Boolean | - | ติดหมุดในรายการโปรด |
| has_expiry_date | Boolean | ✓ | true = สินค้ามีวันหมดอายุ (ต้องกรอก expiry_date ตอนรับสินค้า) |
| created_at | DateTime | ✓ | วันที่สร้าง |
| updated_at | DateTime | ✓ | วันที่แก้ไขล่าสุด |
| updated_by | UUID | ✓ | พนักงานที่แก้ไขล่าสุด |

### 2. Category (หมวดหมู่)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| name | String | ✓ | ชื่อหมวด |
| parent_id | UUID | - | NULL = หมวดหลัก, มีค่า = หมวดย่อย |
| sort_order | Int | - | ลำดับแสดงผล |

### 3. ProductUnit (หน่วยสินค้า)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✓ | Primary key |
| product_id | UUID | ✓ | อ้างอิงสินค้า |
| name | String | ✓ | ชื่อหน่วย (ชิ้น, แพ็ค, ลัง) |
| ratio | Decimal | ✓ | อัตราเทียบกับหน่วยฐาน |
| sell_price | Decimal | ✓ | ราคาขายต่อหน่วยนี้ |
| is_base | Boolean | ✓ | true = หน่วยฐาน |
| is_pinned | Boolean | - | ตรึงในหน้าขาย |

---

## Business Rules

### กฎราคา
- ราคาขาย ≥ 0 (แต่ระบบแจ้งเตือนถ้าต่ำกว่าต้นทุน)
- ราคาชุด (bundle) คำนวณจากผลรวมราคาสินค้าย่อย
- ระบบคำนวณราคาต่อหน่วยซ้อนอัตโนมัติ: `ราคาหน่วยฐาน × ratio`

### กฎสถานะ
| Status | หน้าขาย | สต็อก | แก้ไขได้ |
|--------|---------|-------|---------|
| active | ✓ แสดง | ✓ แสดง | ✓ |
| hidden | ✗ ซ่อน | ✗ ซ่อน | ✓ |
| disabled | ✗ ปิด | ✗ ปิด | ✓ (เปิดคืนได้) |

### กฎหมวดหมู่
- หมวดหลัก (parent_id = NULL)
- หมวดย่อย สังกัดหมวดหลักเท่านั้น (1 ระดับ)
- สินค้า 1 รายการ สังกัด 1 หมวดย่อยเท่านั้น

### กฎหน่วย
- สินค้าต้องมีหน่วยฐาน (is_base = true) อย่างน้อย 1 หน่วย
- หน่วยฐาน: ratio = 1
- หน่วยซ้อน: ratio > 1 (เช่น 1 แพ็ค = 12 ชิ้น → ratio = 12)
- สต็อกนับในหน่วยฐานเสมอ

### กฎวันหมดอายุ
- `has_expiry_date = true`: บังคับกรอก expiry_date เมื่อรับสินค้าเข้า; ระบบติดตาม StockLot พร้อม expiry; Auto-Expire job ทำงาน
- `has_expiry_date = false`: ไม่กรอก expiry_date; StockLot ยังสร้าง (เพื่อ traceability รอบรับ) แต่ไม่มี expiry_date; FEFO ไม่มีผล — ระบบตัด lot เรียงตาม received_date (FIFO)

---

## Relationships
```
Category (หมวดหลัก) ─── has many ──► Category (หมวดย่อย)
Category (หมวดย่อย) ─── has many ──► Product
Product ─── has many ──► ProductUnit
Product ─── has many ──► StockMovement  [→ module สต็อก]
Product ─── has many ──► OrderLineItem  [→ module ขาย]
Product ─── has many ──► BundleItem     [→ module โปรโมชัน]
```

---

## Enum Values

### ProductStatus
- `active` — เปิดใช้งานปกติ
- `hidden` — ซ่อนจากหน้าขายและสต็อก
- `disabled` — ปิดถาวร (หยุดขาย)

