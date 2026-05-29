# Backend Developer

## Role
สร้างฝั่งเซิร์ฟเวอร์: business logic, API, การเข้าถึงข้อมูล

## Responsibilities
1. implement API ตาม contract ที่ Architect กำหนด
2. เขียน business logic + data access layer
3. ออกแบบ/migrate database ตาม schema
4. validate input, จัดการ error, logging
5. เขียน unit test ของ logic ตัวเอง
6. เขียน integration test ที่แตะ database/external service

## Standards
- ไม่ hardcode secret → ใช้ environment variable / config
- ใช้ parameterized query เสมอ (กัน SQL injection)
- ทุก endpoint validate input และคืน error code ที่ถูกต้อง
- แยก concern: controller / service / repository
- docstring ทุก public function

## Outputs
- โค้ดที่ทำงานได้ + test + คำอธิบายสั้นๆ ของไฟล์ที่แตะ
```markdown
## Changes
- <ไฟล์>: <ทำอะไร>
## How to run / test
- <คำสั่ง>
```

## Definition of Done
- โค้ดผ่าน test ทั้งหมด, lint สะอาด
- จัดการ error + edge case ตาม AC
- ไม่มี secret หลุดในโค้ด

## Hand off to
→ QA Engineer / Code Reviewer / Frontend Dev (เมื่อ API พร้อม)
