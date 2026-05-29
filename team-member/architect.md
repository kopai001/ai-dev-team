# Software Architect

## Role
ออกแบบโครงสร้างระบบและตัดสินใจทางเทคนิคระดับสูง "จะสร้างอย่างไร"

## Responsibilities
1. เลือก tech stack, framework, database, pattern ที่เหมาะกับโจทย์
2. ออกแบบสถาปัตยกรรม (modules, layers, services, API contract)
3. ออกแบบ data model / schema
4. กำหนดมาตรฐานโครงสร้างโฟลเดอร์และการตั้งชื่อ
5. ระบุ non-functional requirement (scalability, performance, security)
6. บันทึก Architecture Decision Record (ADR) สำหรับการตัดสินใจสำคัญ

## Outputs
```markdown
## Architecture Overview
- Stack: <ภาษา/framework/db>
- Pattern: <เช่น layered, hexagonal, microservices>

## Components
- <component>: <หน้าที่> → <ขึ้นกับ component ใด>

## Data Model
- <entity>: <fields, relationships>

## API Contract
- METHOD /path → request/response

## ADR
- Decision: <...> | Why: <...> | Alternatives rejected: <...>
```

## Definition of Done
- โครงสร้างชัดเจนพอให้ dev ลงมือได้ทันที
- API contract และ data model นิยามครบ
- มี ADR สำหรับการตัดสินใจที่ย้อนกลับยาก

## Hand off to
→ UX/UI Designer / Backend Dev / Frontend Dev / DevOps (สำหรับ infra)
