# جبت كام؟ 🎯

**امتحن، اعرف نتيجتك، وشوف ترتيبك**

منصة امتحانات ويب عصرية وسريعة مبنية بهوية مصرية شبابية. الطالب يدخل اسمه بس، يحل الامتحان، يعرف نتيجته وترتيبه فوراً. بدون تسجيل، بدون تعقيد.

![Brand](https://img.shields.io/badge/Brand-جبت%20كام؟-1E5CFF?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0.0-10B981?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-0A1931?style=for-the-badge)

---

## 🌟 الفكرة والرحلة

**من واتساب بوت إلى منصة ويب متكاملة**

المنصة كانت في الأصل بوت واتساب، وتم تحويلها بالكامل لمنصة ويب:

**Admin Flow:**
```
Login → Dashboard → Create Exam → Add Questions → Review → Publish → Copy Link → Share → Monitor Results
```

**Student Flow:**
```
Open Link (/exam/{slug}) → Read Info → Enter Name → Start → Answer → Timer → Submit → Score + Ranking
```

**مميزات أساسية:**
- 🔗 رابط عام فريد لكل امتحان `/exam/{public_slug}`
- 👤 دخول الطالب بالاسم فقط - لا حساب مطلوب
- ⏱️ مؤقت معتمد على السيرفر (Server-Authoritative)
- 💾 حفظ الإجابات تلقائياً وإمكانية التعديل قبل التسليم
- 🧮 تصحيح فوري، نسبة مئوية، وقت الإكمال، وترتيب
- 🏆 لوحة متصدرين عامة مع قواعد كسر تعادل (درجة → وقت → وقت التسليم)
- 📊 لوحة تحكم إدارية RTL عصرية مع إحصائيات حقيقية
- 🌓 Light/Dark Mode مع حفظ التفضيل
- 📱 Responsive 100% - مُحسن للموبايل أولاً

---

## 🏗️ التقنية (Tech Stack)

### Backend
- **Python 3.11+** & **FastAPI** (Async)
- **PostgreSQL** & **SQLAlchemy 2.x** (Async ORM)
- **Alembic** للمigrations
- **Pydantic v2** للتحقق
- **JWT** للمصادقة
- **Pytest** للاختبارات

### Frontend
- **React 18** & **TypeScript** & **Vite**
- **Tailwind CSS** مع نظام ألوان مستخرج من اللوجو
- **Lucide Icons**
- RTL-first، Light/Dark، Animations

### Infrastructure
- **Docker** & **docker-compose**
- **Nginx** للفرونت
- **Vercel** compatible

---

## 📁 هيكل المشروع

```
jebt-kam/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # auth, exams, questions, students, results, public
│   │   ├── core/            # config, security, exceptions, logging
│   │   ├── db/              # session, base
│   │   ├── models/          # admin, exam, question, option, student, exam_attempt, attempt_answer
│   │   ├── repositories/    # admin, exam, question, attempt, student
│   │   ├── schemas/         # exam, question, result, student, public, auth
│   │   ├── services/        # exam_service, question_service, public_attempt_service, ranking, timer, auth
│   │   ├── integrations/whatsapp/ # legacy - معزول، يعمل فقط عند ENABLE_WHATSAPP=true
│   │   ├── main.py
│   │   └── seed.py
│   ├── alembic/
│   ├── tests/               # test_auth, test_exams, test_web_platform
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # client.ts (auth + public)
│   │   ├── components/
│   │   │   ├── ui/          # Button, Input, Card, Badge, Logo
│   │   │   ├── layout/      # Layout, Navbar, Sidebar
│   │   │   └── exam/        # (future)
│   │   ├── contexts/        # AuthContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── public/      # ExamLanding, ExamTake, Result, PublicLeaderboard
│   │   │   └── admin/       # Dashboard, Exams, ExamEditor, CreateExam, Results, Students, Leaderboard, Login
│   │   └── App.tsx
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 التشغيل المحلي

### 1. Backend

```bash
cd backend

python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# عدل DATABASE_URL لو محتاج

# SQLite للتجربة السريعة:
# DATABASE_URL=sqlite+aiosqlite:///./jebt_kam.db

alembic upgrade head
python app/seed.py

uvicorn app.main:app --reload --port 8000
```

Backend: `http://localhost:8000`
Docs: `http://localhost:8000/api/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Admin: `http://localhost:5173/admin`
Public exam example: `http://localhost:5173/exam/{slug}`

### 3. Docker (Full Stack)

```bash
docker-compose up --build -d

# Logs
docker-compose logs -f

# Down
docker-compose down
```

Services:
- postgres:5432
- backend:8000
- frontend:80 + 5173

---

## 🔑 بيانات الدخول الافتراضية

- **Email:** `admin@exam.com`
- **Password:** `admin123`

يمكن تغييرها عبر متغيرات البيئة `ADMIN_EMAIL`, `ADMIN_PASSWORD`

لإنشاء أدمن جديد:
```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123 python app/seed.py
```

---

## 🔗 API Overview

### Admin Auth
```
POST /api/auth/login
GET  /api/auth/me
```

### Exams (Admin Protected)
```
GET    /api/exams
POST   /api/exams
GET    /api/exams/{id}
PATCH  /api/exams/{id}
DELETE /api/exams/{id}
POST   /api/exams/{id}/publish
POST   /api/exams/{id}/close
POST   /api/exams/{id}/duplicate
```

### Questions (Admin)
```
GET  /api/exams/{id}/questions
POST /api/exams/{id}/questions
PATCH /api/questions/{id}
DELETE /api/questions/{id}
POST /api/exams/{id}/questions/reorder
POST /api/questions/{id}/duplicate
```

### Public Exam (No Auth)
```
GET  /api/public/exams/{slug}
POST /api/public/exams/{slug}/attempts          # {student_name}
GET  /api/public/attempts/{attempt_id}
POST /api/public/attempts/{attempt_id}/answers  # {question_id, option_id}
POST /api/public/attempts/{attempt_id}/submit
GET  /api/public/attempts/{attempt_id}/result
GET  /api/public/exams/{slug}/leaderboard
```

### Results & Analytics (Admin)
```
GET /api/results
GET /api/results/{attempt_id}
GET /api/exams/{id}/leaderboard
GET /api/exams/{id}/results/export
GET /api/dashboard/stats
GET /api/dashboard/recent-attempts
GET /api/students
```

---

## 🎨 نظام التصميم - جبت كام؟

مستخرج من اللوجو الرسمي:

**الألوان:**
- Primary 900: `#0A1931` (Navy - نصوص)
- Primary 600: `#1E5CFF` (أزرق أساسي)
- Primary 500: `#2D7DFF` (أزرق فاتح)
- Accent 500: `#10B981` (أخضر - نجاح)
- Amber, Red للتنبيهات

**الخطوط:**
- Cairo + Tajawal (عربي)
- RTL-first

**المكونات:**
- Rounded 2xl (20-24px)
- Soft shadows
- Brand gradients
- Subtle animations (fade-in, slide-up, scale-in)

**الشخصية:**
- عصري، شبابي، سريع، تنافسي، ودود، Premium

---

## ⏱️ منطق المؤقت والـ Scoring

**Timer:**
```python
remaining = expires_at - current_server_time  # Server authoritative
# Frontend countdown للعرض فقط
# Auto-submit عند انتهاء الوقت
# يتحمل Refresh, Multiple tabs, Network delay
```

**Scoring:**
```
Correct = question.points
Wrong = 0
Unanswered = 0
total_score = sum(question.points)
percentage = score / total_score * 100
completion_time = submitted_at - started_at
```

**Ranking:**
```
1. Higher score
2. Lower completion_time_seconds
3. Earlier submitted_at
```

---

## 🔒 الأمان

- JWT + bcrypt
- Password hashing
- CORS configured
- Input validation (Pydantic)
- SQL injection protection (ORM)
- Server-side scoring (لا يثق في الفرونت)
- Server-side timer validation
- Idempotent submission
- لا يكشف الإجابات الصحيحة قبل التسليم
- لا يكشف password_hash

---

## 🧪 الاختبارات

```bash
cd backend
PYTHONPATH=. pytest -v
```

**التغطية:**
- Auth login success/failure, protected routes
- Exam CRUD, publish validation, duplicate, close
- Question validation (2 options min, 1 correct)
- Full web flow: create exam → publish → public get → start attempt → answer → change answer → submit → result → leaderboard
- Timer remaining calculation
- Duplicate student handling (نفس الاسم = نفس الطالب)
- Ranking (higher score wins, faster time breaks tie)
- Idempotent submission
- Closed exam blocks new attempts

---

## 📦 Deployment

### Backend
- Compatible with Render, Railway, Fly.io, Vercel (via api/index.py)
- Set `DATABASE_URL` (Postgres)
- Set `SECRET_KEY`
- Run `alembic upgrade head`
- Run `python app/seed.py`

### Frontend
- Vercel, Netlify, Cloudflare Pages
- `npm run build` → `dist/`
- Env: `VITE_API_URL` (optional, defaults to /api proxy)

### Docker Production
```bash
docker-compose up --build -d
```

---

## 📝 Environment Variables

راجع `.env.example`:

```
DATABASE_URL
SECRET_KEY / JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES
APP_ENV
BACKEND_URL
FRONTEND_URL
CORS_ORIGINS
ADMIN_EMAIL
ADMIN_PASSWORD
```

---

## 🔄 من واتساب إلى ويب

الكود القديم للواتساب معزول في:
- `app/integrations/whatsapp/`
- `app/api/routes/whatsapp.py`
- `app/models/webhook_event.py`

لا يتم تحميله إلا عند `ENABLE_WHATSAPP=true`

الـ Web Flow يعمل بشكل مستقل تماماً.

---

## ✅ Acceptance Criteria

كل النقاط التالية تعمل:

- [x] Admin seed/create
- [x] Admin login
- [x] Dashboard بإحصائيات حقيقية
- [x] Create/Edit/Delete exam
- [x] Add/Edit/Delete/Duplicate/Reorder questions
- [x] Add options, select correct
- [x] Save draft
- [x] Publish → unique public link
- [x] Student opens link
- [x] Enter name only
- [x] Start exam (server-side expires_at)
- [x] Timer (server authoritative)
- [x] Answer + change answer + persist
- [x] Expired handling
- [x] Submit + idempotent
- [x] Score, percentage, completion time, ranking (backend)
- [x] Result page with correct/wrong/unanswered
- [x] Leaderboard public + admin
- [x] Admin results, attempt details, export CSV
- [x] Students aggregation
- [x] Close exam blocks new attempts
- [x] Responsive, RTL, Light/Dark, Loading, Error, Empty states
- [x] Migrations
- [x] Docker
- [x] Tests pass
- [x] Production build succeeds

---

## 📜 License

MIT - مشروع مستقل للاستخدام التعليمي والإنتاجي.

---

**Made with ❤️ for Egyptian students - جبت كام؟**
