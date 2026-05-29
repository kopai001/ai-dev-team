# AI Software Development Team

ทีม AI จำลององค์กรพัฒนาซอฟต์แวร์เต็มรูปแบบ มี **Orchestrator** เป็นตัวกลางที่
รับงานจากคุณ ตัดสินใจแทนคุณ และแจกจ่ายงานให้ sub-agent ครอบคลุมตั้งแต่
นิยาม requirement → ออกแบบ → เขียนโค้ด → ทดสอบ → deploy → ทำเอกสาร

## โครงสร้างไฟล์
```
CLAUDE.md              ← config หลัก: บทบาท, workflow, กฎ, มาตรฐาน (Claude อ่านก่อนเสมอ)
INDEX.md               ← แผนที่โค้ดเบส (สร้างอัตโนมัติ) — agent อ่านก่อนเปิดไฟล์จริง
scripts/build_index.py ← สคริปต์สร้าง/อัปเดต INDEX.md
team-member/           ← นิยามของแต่ละ agent
  orchestrator.md        หัวหน้าทีม / ตัวแทนคุณ
  product-owner.md       นิยาม requirement & priority
  business-analyst.md    ค้นคว้า & user story
  architect.md           ออกแบบระบบ & เลือก stack
  ux-ui-designer.md      flow, wireframe, design system
  backend-dev.md         server, API, database
  frontend-dev.md        UI/UX, client
  qa-engineer.md         test & หา bug
  code-reviewer.md       review & มาตรฐาน
  security-auditor.md    ตรวจช่องโหว่
  devops-engineer.md     CI/CD & deploy
  tech-writer.md         เอกสาร & README
```

## วิธีใช้
1. วางโฟลเดอร์นี้ไว้ที่ root ของโปรเจกต์ (Claude Code จะอ่าน `CLAUDE.md` อัตโนมัติ)
2. คุยกับ **Orchestrator คนเดียว** — บอกแค่ว่าต้องการอะไร เช่น
   *"สร้าง REST API สำหรับระบบ todo พร้อม auth"*
3. Orchestrator จะวางแผน, มอบหมาย agent, และสรุปผลกลับมาให้

## ระบบ Indexing (Optimization)
ก่อนทำงานกับโค้ดเบสที่มีอยู่ ให้สร้าง index ก่อน:
```bash
python3 scripts/build_index.py .
```
จะได้ `INDEX.md` ที่สรุปโครงสร้าง, ภาษา, symbol สำคัญ และ entry point
ทุก agent อ่านไฟล์นี้ก่อน → เปิดเฉพาะไฟล์ที่เกี่ยวข้อง → ประหยัด token และเร็วขึ้น
รันสคริปต์ใหม่ทุกครั้งที่โครงสร้างเปลี่ยน (หรือให้ Tech Writer ดูแล)

## ปรับแต่ง
- เพิ่ม/ลด agent: สร้างไฟล์ใหม่ใน `team-member/` แล้วเพิ่มในตาราง Roster ของ `CLAUDE.md`
- ปรับกฎการตัดสินใจของ Orchestrator: แก้ข้อ 5 ใน `CLAUDE.md`
- ปรับมาตรฐานโค้ด: แก้ข้อ 7 ใน `CLAUDE.md`
