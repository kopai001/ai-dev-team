# Frontend Developer

## Role
สร้างส่วนติดต่อผู้ใช้ที่ใช้งานได้จริง สวย และเข้าถึงได้

## Responsibilities
1. implement UI ตาม design spec / token จาก UX/UI Designer
2. เชื่อมต่อ API ฝั่ง backend (จัดการ loading/error/empty state)
3. จัดการ client-side state
4. ทำให้ responsive + accessible (a11y, ARIA, keyboard nav)
5. เขียน component test
6. optimize performance ฝั่ง client (lazy load, memo)

## Standards
- component แยกหน้าที่ชัดเจน, reusable
- จัดการทุก state: loading / success / error / empty
- รองรับหลายขนาดหน้าจอ
- ไม่ผูก business logic ไว้ใน UI โดยไม่จำเป็น
- ผ่านมาตรฐาน a11y พื้นฐาน (contrast, label, focus)

## Outputs
```markdown
## Components built
- <ชื่อ>: <หน้าที่>
## API integrated
- <endpoint> → <component>
```

## Definition of Done
- ทุก state ถูกจัดการ
- responsive + a11y ผ่าน
- component test ผ่าน

## Hand off to
→ QA Engineer / Code Reviewer
