# إعداد Firebase (خطوات تسويها أنت من الكونسول)

مشروع التطوير الحالي: `rasikh-eca19` (خطة Spark). **لا أنشر أي شيء قبل ما تؤكد.**
التطوير المحلي كله يعمل على المحاكيات بمشروع تجريبي `demo-rasikh`، فما تحتاج هذي الخطوات إلا للنشر الحقيقي.

## 1. الفوترة (Blaze)

الـ Functions والـ AI يحتاجون خطة Blaze. من الكونسول: Upgrade ← Blaze. فعّل تنبيهات الميزانية من Google Cloud ← Billing ← Budgets & alerts.

## 2. قاعدة Firestore — المنطقة `me-central2` (الدمام)

> المنطقة **لا تتغير** بعد الإنشاء. تأكد قبل الضغط على Create.

Build ← Firestore Database ← Create database ← Edition: Standard ← Location: **me-central2 (Dammam)** ← Production mode.

## 3. Storage — المنطقة `me-central2`

Build ← Storage ← Get started ← Location: **me-central2** (يحتاج Blaze).

## 4. Authentication

Build ← Authentication ← Sign-in method: فعّل **Email/Password** و **Phone**.
للهاتف: أضف `localhost` و نطاقك للنطاقات المصرّح بها، وأضف أرقام تجريبية إن أردت. فعّل SMS region policy بحيث يسمح بالسعودية (+966).

## 5. تطبيق الويب

Project settings ← Your apps ← Add app ← Web. انسخ القيم إلى `apps/web/.env.local` (انظر `apps/web/.env.example`) وغيّر `NEXT_PUBLIC_USE_EMULATORS=false`.
**لا ترسل لي المفاتيح في الشات.** ضعها في الملف بنفسك.

## 6. App Check

Build ← App Check ← سجّل تطبيق الويب بـ reCAPTCHA Enterprise، وتطبيقي Android/iOS بـ Play Integrity و App Attest. لا تفعّل الفرض (enforcement) قبل ما نختبر.

## 7. مشروع الإنتاج

كرر الخطوات 1–6 في مشروع ثاني (مثلاً `rasikh-prod`) ثم أخبرني باسمه لأضيف alias الإنتاج في `.firebaserc`.

## 8. App Hosting (الويب)

منطقة الدمام **غير مؤكدة** كمنطقة App Hosting. عند إنشاء الـ backend بـ `firebase apphosting:backends:create` تظهر المناطق المتاحة؛ نختار الأقرب ونسجل القرار في `CLAUDE.md`. الخادم بلا حالة ولا يسجّل بيانات شخصية، والبيانات تبقى في الدمام.

## تشغيل محلي

```bash
pnpm install
pnpm --filter @rasikh/design-tokens build
pnpm --filter @rasikh/shared build
pnpm --filter @rasikh/functions build
pnpm emulators        # الطرفية الأولى
pnpm --filter @rasikh/web dev   # الطرفية الثانية  → http://localhost:3000/ar
```

### ملاحظات ويندوز

- محاكي Firestore (Java) **لا يقرأ المسارات العربية**. شغّل الأوامر من مسار إنجليزي، مثلاً junction:
  `New-Item -ItemType Junction -Path C:\dev\rasikh -Target "<مسار المشروع>"` ثم `cd C:\dev\rasikh` واستخدم `firebase emulators:exec` / `firebase emulators:start` مباشرة منه.
- Next.js (عبر `@swc/core`) يتحقق من صلاحيات مجلد الكاش. عيّن `SWC_NATIVE_BINDING_CACHE` إلى مجلد صلاحياته لك وحدك.
