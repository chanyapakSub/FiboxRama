# Setup D1 Database for Cloudflare Pages

## ขั้นตอนที่ 1: รัน Migration บน D1 Database

```bash
# รัน migration บน D1 database ที่มีอยู่แล้ว
wrangler d1 execute medical-db --remote --file=./migrations/init.sql
```

**หมายเหตุ:** 
- `medical-db` คือชื่อ database ที่ระบุใน `wrangler.toml`
- `--remote` หมายถึงรันบน production database
- ถ้าต้องการทดสอบก่อน ใช้ `--local` แทน `--remote`

## ขั้นตอนที่ 2: Verify Database

```bash
# ดู tables ที่สร้างแล้ว
wrangler d1 execute medical-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

# ดูข้อมูลใน Evaluator table
wrangler d1 execute medical-db --remote --command="SELECT * FROM Evaluator;"
```

## ขั้นตอนที่ 3: Deploy ใหม่

```bash
git add .
git commit -m "Add D1 migration"
git push
```

Cloudflare Pages จะ auto-deploy และระบบจะทำงานได้แล้ว!

---

## Troubleshooting

### ถ้า D1 database ยังไม่มี:

```bash
# สร้าง D1 database ใหม่
wrangler d1 create medical-db

# คัดลอก database_id ที่ได้มาใส่ใน wrangler.toml
# แล้วรัน migration ตามขั้นตอนที่ 1
```

### ถ้าต้องการ reset database:

```bash
# ลบ tables ทั้งหมด
wrangler d1 execute medical-db --remote --command="DROP TABLE IF EXISTS Score;"
wrangler d1 execute medical-db --remote --command="DROP TABLE IF EXISTS Evaluation;"
wrangler d1 execute medical-db --remote --command="DROP TABLE IF EXISTS Evaluator;"

# รัน migration ใหม่
wrangler d1 execute medical-db --remote --file=./migrations/init.sql
```
