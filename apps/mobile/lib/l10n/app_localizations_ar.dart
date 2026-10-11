// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'راسخ';

  @override
  String get tagline => 'عقارك على أرض ثابتة';

  @override
  String get loading => 'جارٍ التحميل';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get switchLanguage => 'English';

  @override
  String get homeHeadline => 'من يوم الاستلام إلى يوم التسليم، كل شيء موثّق.';

  @override
  String get homeSubhead =>
      'سجل واحد لعقارك: العقود والدفعات والفحص والصيانة. يكمّل إيجار ولا يحلّ محلّه.';

  @override
  String get start => 'ابدأ الآن';

  @override
  String get authTitle => 'ادخل إلى راسخ';

  @override
  String get authSubtitle => 'برقم جوالك أو بريدك الإلكتروني.';

  @override
  String get tabPhone => 'رقم الجوال';

  @override
  String get tabEmail => 'البريد الإلكتروني';

  @override
  String get phoneLabel => 'رقم الجوال';

  @override
  String get phoneHint => 'رقم سعودي يبدأ بـ 5، مثال: 5XXXXXXXX';

  @override
  String get sendCode => 'أرسل رمز التحقق';

  @override
  String get codeLabel => 'رمز التحقق';

  @override
  String get verify => 'تحقّق';

  @override
  String get emailLabel => 'البريد الإلكتروني';

  @override
  String get passwordLabel => 'كلمة المرور';

  @override
  String get signIn => 'دخول';

  @override
  String get createAccount => 'إنشاء حساب';

  @override
  String get toCreate => 'ما عندك حساب؟ أنشئ حساباً';

  @override
  String get toSignIn => 'عندك حساب؟ ادخل';

  @override
  String get errInvalidPhone => 'اكتب رقم جوال سعودي صحيح.';

  @override
  String get errInvalidCode => 'رمز التحقق غير صحيح.';

  @override
  String get errInvalidCredentials => 'البريد أو كلمة المرور غير صحيحة.';

  @override
  String get errEmailInUse => 'هذا البريد مسجّل من قبل.';

  @override
  String get errWeakPassword => 'كلمة المرور قصيرة، استخدم 8 أحرف على الأقل.';

  @override
  String get errTooMany => 'محاولات كثيرة. حاول لاحقاً.';

  @override
  String get errGeneric => 'تعذّر إكمال العملية. حاول مرة أخرى.';

  @override
  String get onboardingTitle => 'عرّفنا بدورك';

  @override
  String get onboardingSubtitle => 'اختر دورك أو أكثر، ويمكنك تغييرها لاحقاً.';

  @override
  String get roleOwner => 'مالك';

  @override
  String get roleTenant => 'مستأجر';

  @override
  String get roleManager => 'مدير عمارة';

  @override
  String get roleBroker => 'وسيط';

  @override
  String get roleVendor => 'فنّي / مقاول';

  @override
  String get roleOwnerHint => 'تدير من 1 إلى 50 وحدة';

  @override
  String get roleTenantHint => 'عقد إيجار قائم';

  @override
  String get roleManagerHint => 'عمارة أو اتحاد ملاك';

  @override
  String get roleBrokerHint => 'مرخّص من الهيئة العامة للعقار';

  @override
  String get roleVendorHint => 'صيانة وفحص';

  @override
  String get displayName => 'اسمك';

  @override
  String get orgName => 'اسم محفظتك أو شركتك';

  @override
  String get consent =>
      'أوافق على معالجة بياناتي الشخصية لغرض تشغيل حسابي وفق نظام حماية البيانات الشخصية.';

  @override
  String get submitOrg => 'أنشئ مساحة العمل';

  @override
  String get errPickRole => 'اختر دوراً واحداً على الأقل.';

  @override
  String get errNeedConsent => 'الموافقة مطلوبة للمتابعة.';

  @override
  String get errTooManyOrgs => 'وصلت إلى الحد الأقصى من المساحات.';

  @override
  String get errOrgGeneric => 'تعذّر إنشاء مساحة العمل. حاول مرة أخرى.';

  @override
  String get workspaceTitle => 'مساحة العمل';

  @override
  String get workspaceReady =>
      'تم إنشاء مساحتك. ستظهر هنا محفظتك وخريطتك في المراحل القادمة.';

  @override
  String get workspaceNoOrg => 'لم تنشئ مساحة عمل بعد.';
}
