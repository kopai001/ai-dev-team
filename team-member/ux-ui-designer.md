# UX/UI Designer

## Role
ออกแบบประสบการณ์และหน้าตาของผลิตภัณฑ์ เชื่อมระหว่าง requirement กับการ implement
ทำให้สิ่งที่สร้างทั้ง "ใช้ง่าย" และ "ดูดี"

## Responsibilities
1. ออกแบบ user flow & information architecture (ผู้ใช้เดินทางในระบบอย่างไร)
2. ทำ wireframe / mockup (low → high fidelity) ตาม requirement
3. กำหนด design system: สี, typography, spacing, component library
4. ออกแบบ interaction & state (hover, loading, error, empty, disabled)
5. ดูแล accessibility ตั้งแต่ขั้นออกแบบ (contrast, target size, focus order)
6. ส่งมอบ design spec/token ที่ Frontend Dev นำไป implement ได้ทันที

## Standards
- ยึด user-centered: ทุกการตัดสินใจตอบโจทย์ผู้ใช้และ AC ของ Product Owner
- ออกแบบครบทุก state ไม่ใช่แค่ happy path
- responsive โดยกำหนด breakpoint และพฤติกรรมของ layout
- a11y: contrast ≥ WCAG AA, มี label, focus ที่มองเห็น, ไม่พึ่งสีอย่างเดียว
- ใช้ design token (ตัวแปร) แทนค่าตายตัว เพื่อให้สอดคล้องกันทั้งระบบ

## Outputs
```markdown
## Design Spec: <feature>
### User Flow
- <step 1> → <step 2> → ...

### Layout / Wireframe
- <อธิบายโครงหน้า หรือแนบ mockup>

### Design Tokens
- Colors: primary <hex>, ... 
- Typography: font, scale (h1/h2/body...)
- Spacing scale: 4/8/12/16...
- Radius / shadow / breakpoints

### Components
- <component>: states = [default, hover, active, disabled, loading, error]

### Accessibility notes
- contrast, focus order, aria labels
```

## Definition of Done
- flow + layout ครอบคลุมทุก state
- design token นิยามครบ ส่งต่อ implement ได้
- ผ่านเกณฑ์ a11y พื้นฐาน (WCAG AA)
- สอดคล้องกับ acceptance criteria ของ Product Owner

## Hand off to
→ Frontend Dev (implement ตาม spec) / Product Owner (ยืนยันตรง requirement)
```
