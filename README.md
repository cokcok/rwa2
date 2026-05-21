# ระบบลงเวลาทำงานผ่านเว็บ (Web-Based Attendance System)

ระบบลงเวลาทำงานผ่านเว็บ สำหรับหน่วยงานราชการ ใช้ Geolocation ตรวจสอบตำแหน่งผู้ใช้

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Oracle DB (oracledb npm package)
- **Auth:** Mock ThaID (development) / ThaID OAuth2 (production-ready interface)

## สิ่งที่ต้องติดตั้งก่อน

1. **Node.js** v18 ขึ้นไป
2. **Oracle Instant Client** (ถ้าเชื่อม Oracle DB จริง)
   - ดาวน์โหลดจาก: https://www.oracle.com/database/technologies/instant-client/downloads.html
   - ตั้งค่า path ใน `.env.local` → `ORACLE_CLIENT_PATH`

## วิธีติดตั้ง

```bash
# 1. เข้าโปรเจกต์
cd attendance-system1

# 2. ติดตั้ง dependencies
npm install

# 3. คัดลอกไฟล์ .env
cp .env.example .env.local

# 4. แก้ไขค่าใน .env.local ตามสภาพแวดล้อมของคุณ

# 5. รัน development server
npm run dev
```

เปิด http://localhost:3000 ในเบราว์เซอร์

## การตั้งค่า Environment Variables

ไฟล์ `.env.local`:

| Variable | คำอธิบาย | ค่าเริ่มต้น |
|---|---|---|
| `USE_MOCK_DATA` | ใช้ข้อมูลจำลอง (ไม่เชื่อม Oracle) | `true` |
| `ORACLE_HOST` | Host ของ Oracle DB | - |
| `ORACLE_PORT` | Port ของ Oracle DB | `1521` |
| `ORACLE_SERVICE_NAME` | Service Name ของ Oracle DB | - |
| `ORACLE_USER` | Username สำหรับเชื่อม Oracle | - |
| `ORACLE_PASSWORD` | Password สำหรับเชื่อม Oracle | - |
| `ORACLE_CLIENT_PATH` | Path ไปยัง Oracle Instant Client | - |
| `JWT_SECRET` | Secret key สำหรับ JWT | - |
| `MAX_DISTANCE_METERS` | รัศมีสูงสุดที่อนุญาต (เมตร) | `50` |
| `RATE_LIMIT_MAX_REQUESTS` | จำนวน request สูงสุดต่อนาที | `10` |

## โครงสร้างโปรเจกต์

```
attendance-system1/
├── sql/
│   └── ATTENDANCE_LOG_DDL.sql    # DDL สำหรับสร้างตาราง
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── attendance/checkin/route.ts   # API ลงเวลา
│   │   │   ├── auth/
│   │   │   │   ├── mock-thaid/route.ts       # API Mock Login
│   │   │   │   ├── me/route.ts               # API ดึงข้อมูลผู้ใช้
│   │   │   │   └── logout/route.ts           # API Logout
│   │   │   └── offices/
│   │   │       ├── route.ts                  # API รายการสำนักงาน
│   │   │       └── [org_code]/route.ts       # API พิกัดตามสังกัด
│   │   ├── login/page.tsx        # หน้า Login
│   │   ├── select/page.tsx       # หน้าเลือกประเภทลงเวลา
│   │   ├── checkin/page.tsx      # หน้าลงเวลา
│   │   ├── layout.tsx            # Layout หลัก
│   │   ├── page.tsx              # Redirect ไป /login
│   │   └── globals.css           # Tailwind styles
│   ├── components/
│   │   ├── ThaiIdInput.tsx       # Input เลขบัตรประชาชน
│   │   ├── OfficeSelector.tsx    # Dropdown เลือกสังกัด
│   │   ├── LocationVerifier.tsx  # ตรวจสอบพิกัด
│   │   ├── AttendanceButtons.tsx # ปุ่มเข้า/ออกงาน
│   │   ├── ResultModal.tsx       # Modal แสดงผล
│   │   └── LoadingSpinner.tsx    # Loading indicator
│   ├── hooks/
│   │   └── useAuth.ts            # Auth hook
│   ├── lib/
│   │   ├── oracle.ts             # Oracle connection pool
│   │   ├── oracle-init.ts        # Oracle client initialization
│   │   ├── auth-provider.ts      # Auth provider (Mock/ThaID)
│   │   ├── geolocation.ts        # Haversine formula
│   │   ├── validation.ts         # Input validation
│   │   ├── rate-limit.ts         # Rate limiter
│   │   ├── jwt.ts                # JWT utilities
│   │   └── mock-data.ts          # Mock data สำหรับทดสอบ
│   ├── middleware.ts             # Next.js middleware (auth + security)
│   └── types/index.ts            # TypeScript types
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

## วิธีใช้งาน

### 1. Mock Mode (ทดสอบโดยไม่เชื่อม Oracle DB)

ตั้งค่า `USE_MOCK_DATA=true` ใน `.env.local` แล้วรัน `npm run dev`

**เลขบัตรประชาชนสำหรับทดสอบ:**
- `1234567890123` → สมชาย ใจดี (สำนักงานเลขานุการ)
- `9876543210123` → สมหญิง รักงาน (กองแผนงาน)
- `1112223334445` → วิชัย เก่งมาก (กองคลัง)

### 2. Production Mode (เชื่อม Oracle DB)

1. ติดตั้ง Oracle Instant Client
2. ตั้งค่า `USE_MOCK_DATA=false` และ config Oracle connection ใน `.env.local`
3. รัน DDL จาก `sql/ATTENDANCE_LOG_DDL.sql` บน Oracle DB
4. รัน `npm run build && npm start`

## User Flow

```
หน้า Login → กรอกเลขบัตรประชาชน 13 หลัก
    ↓
เลือกประเภท: จากสำนักงาน / ช่วยปฏิบัติงาน
    ↓
ตรวจสอบพิกัด (Geolocation API + Haversine)
    ↓
ถ้า ≤ 50 เมตร → แสดงปุ่ม เข้างาน / ออกงาน
ถ้า > 50 เมตร → แสดง error พร้อมระยะห่าง
    ↓
บันทึก ATTENDANCE_LOG → แสดงผล Modal
```

## เปลี่ยนจาก Mock ThaID → ThaID จริง

1. **สมัครขอ API** จากกรมการปกครอง (DOPA) ที่ https://imauth.bora.dopa.go.th
2. **ตั้งค่า Environment Variables:**
   ```
   AUTH_TYPE=thaid
   THAID_CLIENT_ID=your_client_id
   THAID_CLIENT_SECRET=your_client_secret
   THAID_REDIRECT_URI=https://your-domain.com/api/auth/callback
   ```
3. **สร้าง API Route** สำหรับ callback: `src/app/api/auth/callback/route.ts`
4. **แก้ไข** `ThaIDAuthProvider.handleCallback()` ใน `src/lib/auth-provider.ts` ให้:
   - Exchange authorization code → access token
   - ดึงข้อมูล pid (national_id) จาก ThaID API
   - ตรวจสอบ pid ใน HR_EMPLOYEE
   - Return UserProfile

## Security Features

- ไม่ log NATIONAL_ID ใน console หรือ error message
- Rate Limit: 10 ครั้ง/นาที ต่อ IP (configurable)
- Input Validation ทุก field ฝั่ง server
- Parameterized Query ป้องกัน SQL Injection
- httpOnly Cookie สำหรับ JWT session
- Security Headers (X-Frame-Options, X-Content-Type-Options, Permissions-Policy)
- Device Info logging สำหรับ audit trail
