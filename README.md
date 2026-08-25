# 📚 منصة امتحانات واتساب (WhatsApp Exam Bot)

نظام امتحانات تفاعلي كامل ومستقل يعمل عبر **واتساب** فقط باستخدام **Meta WhatsApp Cloud API** الرسمية، مصحوبًا بـ **لوحة تحكم إدارية (Admin Dashboard)** باللغة العربية واجهة RTL حديثة.

---

## 🌟 الفكرة الرئيسية والخصائص

- **تفوت كتابة أي أوامر:** يتفاعل الطالب مع الامتحانات بضغط أزرار خيارات الإجابة التفاعلية (WhatsApp Interactive Buttons / Lists) بدون الحاجة لكتابة A / B / C / D أو رقم السؤال.
- **توقيت دقيق بحسابات السيرفر:** احتساب مؤقت الامتحان على السيرفر كمرجع حاسم ومستقل عن توقيت هاتف الطالب.
- **تصحيح وترتيب تلقائي:** حساب الدرجات، النسبة المئوية، الوقت المستغرق، وتحديث لوحة الأوائل (Leaderboard) فور إتمام كل محاولة.
- **إعادة تفادي التكرار (Idempotency):** منع تكرار تسليم الإجابات عبر التعرف على معرفات الرسائل الفريدة (`wamid`).
- **لوحة تحكم إدارية عصرية:** إدارة الامتحانات، الأسئلة، الخيارات، الطلاب، المحاولات والنتائج بالتفصيل.

---

## 🏗️ الهيكلية التقنية (Technology Stack)

### Backend (الخلفية)
- **Python 3.11+** & **FastAPI** (Async Architecture).
- **PostgreSQL** & **SQLAlchemy 2.x** (Async ORM).
- **Alembic** لإدارة الترحيلات والـ Migrations.
- **Pydantic v2** للتحقق من البيانات والأنماط (Schemas).
- **JWT Authentication** لتأمين لوحة التحكم الإدارية.
- **Meta WhatsApp Cloud API** للربط الرسمي مع الواتساب.

### Frontend (اللوحة الإدارية)
- **React 18** & **TypeScript** & **Vite**.
- **Tailwind CSS** بتصميم داكن فاخر ودعم كامل للغة العربية (RTL).
- **Lucide Icons** لأيقونات واجهة المستخدم.

---

## 📁 هيكل المشروع (Project Structure)

```text
whatsapp-exam-bot/
├── backend/
│   ├── app/
│   │   ├── api/          # مسارات API والـ Router
│   │   ├── core/         # الإعدادات والأمان
│   │   ├── db/           # جلسات قاعدة البيانات
│   │   ├── integrations/ # تطبيق Meta WhatsApp Cloud API
│   │   ├── models/       # نماذج SQLAlchemy 2.x
│   │   ├── repositories/ # طبقة الاستعلام عن قاعدة البيانات
│   │   ├── schemas/      # نماذج Pydantic v2
│   │   └── services/     # محرك منطق الأعمل والامتحانات
│   ├── alembic/          # ملفات ترحيل قاعدة البيانات
│   ├── tests/            # الاختبارات الآلية (Pytest)
│   ├── seed.py           # زراعة المدير الافتراضي والامتحان التجريبي
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # العميل وموصلات API
│   │   ├── components/   # المكونات الهيكلية للواجهة
│   │   ├── contexts/     # إدارة المصادقة (Auth Context)
│   │   ├── pages/        # صفحات لوحة التحكم
│   │   └── types/        # تعاريف TypeScript
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 التثبيت والتشغيل المحتلي (Local Development Setup)

### 1. إعداد الخلفية (Backend)

```bash
cd backend

# 1. إنشاء البيئة الافتراضية وتفعيلها
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 2. تثبيت المكتبات
pip install -r requirements.txt

# 3. إنشاء ملف البيئة .env
cp .env.example .env

# 4. تشغيل ترحيلات قاعدة البيانات وزراعة البيانات الافتراضية
alembic upgrade head
python seed.py

# 5. تشغيل السيرفر المحلي
uvicorn app.main:app --reload --port 8000
```

سيكون سيرفر الخلفية متاحًا على `http://localhost:8000` ووثائق API على `http://localhost:8000/docs`.

### 2. إعداد الواجهة الإدارية (Frontend)

```bash
cd frontend

# 1. تثبيت الحزم
npm install

# 2. تشغيل السيرفر التفاعلي
npm run dev
```

ستكون لوحة التحكم الإدارية متاحة على `http://localhost:5173`.

---

## 🔑 بيانات الدخول الافتراضية للوحة التحكم (Default Admin Credentials)

- **البريد الإلكتروني:** `admin@exam.com`
- **كلمة المرور:** `admin123`

---

## 🐳 التشغيل باستخدام Docker Compose

يمكنك تشغيل المنصة بالكامل (PostgreSQL + FastAPI Backend + React Frontend) بمر واحدة:

```bash
docker-compose up --build -d
```

سيتم إنشاء قاعدة البيانات، تطبيق الترحيلات، زراعة البيانات الافتراضية، وتشغيل الخدمات تلقائيًا.

---

## 📱 إعداد الربط مع Meta WhatsApp Cloud API

1. قم بإنشاء حساب مطور على منصة [Meta for Developers](https://developers.facebook.com/).
2. أنشئ تطبيقًا من نوع **Business** وأضف منتج **WhatsApp**.
3. احصل على:
   - `Phone Number ID`
   - `Temporary / Permanent Access Token`
4. في قسم **Webhook**:
   - حدد رابط الـ Callback URL الخاص بسيرفرك: `https://your-domain.com/api/whatsapp/webhook`
   - أدخل الـ Verify Token المحدد في ملف `.env` (`WHATSAPP_VERIFY_TOKEN`).
   - اشترك في حدث `messages`.

---

## 🧪 تشغيل الاختبارات الآلية (Running Unit Tests)

لتشغيل مجموعة اختبارات Pytest الكاملة:

```bash
cd backend
pytest -v
```

تغطي الاختبارات:
- تسجيل دخول الإدارة وحماية المسارات بـ JWT.
- إنشاء الامتحانات والأسئلة والتحقق من وجود إجابة صحيحة واحدة.
- دورة حياة محاولة الطالب وتطبيق شرط المحاولة الواحدة ومؤقت الانتهاء.
- احتساب الترتيب وكسر التعادل بالوقت المستغرق.
- التحقق من Webhook ومنع المعالجة المكررة (`wamid` Deduplication).

---

## 📜 الترخيص (License)

هذا المشروع مستقل تمامًا ومتاح للاستخدام والتشغيل المستقل.
