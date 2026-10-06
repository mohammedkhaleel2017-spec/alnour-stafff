# شئون العاملين — مجمع مدارس النور للمكفوفين (السويس)

تطبيق ويب لإدارة بيانات العاملين مع استيراد من ملفات بوابة وزارة التربية والتعليم وتصدير Excel.

## النشر على Vercel (موصى به)

1. ارفع المجلد إلى GitHub (مستودع جديد).
2. من [vercel.com](https://vercel.com) → **Add New Project** → اختر المستودع.
3. اترك إعدادات البناء كما في `vercel.json` (أو):
   - **Install Command:** `npm install --no-audit --no-fund`
   - **Build Command:** `npm run build`
4. أضف متغيرات البيئة قبل أول Deploy:

| المتغير | مطلوب؟ | الوصف |
|---------|--------|--------|
| `DATABASE_URL` | **نعم للإنتاج** | رابط Postgres (مثلاً من [Neon](https://neon.tech)) — بدونها البيانات مؤقتة على `/tmp` وتضيع |
| `BETTER_AUTH_SECRET` | مستحسن | سلسلة عشوائية طويلة (≥32 حرف) لأمان الجلسات |
| `VITE_AUTH_ENABLED` | اختياري | `true` (مفعّل افتراضيًا) |

5. اضغط **Deploy**.

### قاعدة البيانات

- أنشئ مشروعًا مجانيًا على Neon وانسخ connection string إلى `DATABASE_URL`.
- عند أول تشغيل تُطبَّق ملفات `migrations/` تلقائيًا.

## التشغيل المحلي

```bash
npm install
npm run dev
# يفتح على http://0.0.0.0:8080
```

```bash
npm run build   # بناء إنتاج
npm run preview # معاينة البناء
```

## بوابة الوزارة

لا يوجد API عام. من شاشة **التقارير**:
1. افتح بوابة المعلم وسجّل الدخول.
2. صدّر كشف Excel من البوابة.
3. ارفعه في التطبيق → معاينة → تأكيد الاستيراد.
4. صدّر بيانات المجمع إلى `.xlsx` أو CSV.

## الملفات المهمة

- `src/components/ministry-import.tsx` — استيراد من Excel الوزارة
- `src/components/reports-view.tsx` — تقارير + تصدير Excel
- `src/lib/staff-server.ts` — منطق الخادم
- `migrations/` — مخطط قاعدة البيانات
- `REBUILD_NOTES.md` / `PERSISTENCE_FIX.md` — ملاحظات PGlite والنشر
