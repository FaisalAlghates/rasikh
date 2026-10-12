import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **'راسخ'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In ar, this message translates to:
  /// **'عقارك على أرض ثابتة'**
  String get tagline;

  /// No description provided for @loading.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ التحميل'**
  String get loading;

  /// No description provided for @signOut.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get signOut;

  /// No description provided for @switchLanguage.
  ///
  /// In ar, this message translates to:
  /// **'English'**
  String get switchLanguage;

  /// No description provided for @homeHeadline.
  ///
  /// In ar, this message translates to:
  /// **'من يوم الاستلام إلى يوم التسليم، كل شيء موثّق.'**
  String get homeHeadline;

  /// No description provided for @homeSubhead.
  ///
  /// In ar, this message translates to:
  /// **'سجل واحد لعقارك: العقود والدفعات والفحص والصيانة. يكمّل إيجار ولا يحلّ محلّه.'**
  String get homeSubhead;

  /// No description provided for @start.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ الآن'**
  String get start;

  /// No description provided for @authTitle.
  ///
  /// In ar, this message translates to:
  /// **'ادخل إلى راسخ'**
  String get authTitle;

  /// No description provided for @authSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'برقم جوالك أو بريدك الإلكتروني.'**
  String get authSubtitle;

  /// No description provided for @tabPhone.
  ///
  /// In ar, this message translates to:
  /// **'رقم الجوال'**
  String get tabPhone;

  /// No description provided for @tabEmail.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني'**
  String get tabEmail;

  /// No description provided for @phoneLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم الجوال'**
  String get phoneLabel;

  /// No description provided for @phoneHint.
  ///
  /// In ar, this message translates to:
  /// **'رقم سعودي يبدأ بـ 5، مثال: 5XXXXXXXX'**
  String get phoneHint;

  /// No description provided for @sendCode.
  ///
  /// In ar, this message translates to:
  /// **'أرسل رمز التحقق'**
  String get sendCode;

  /// No description provided for @codeLabel.
  ///
  /// In ar, this message translates to:
  /// **'رمز التحقق'**
  String get codeLabel;

  /// No description provided for @verify.
  ///
  /// In ar, this message translates to:
  /// **'تحقّق'**
  String get verify;

  /// No description provided for @emailLabel.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني'**
  String get emailLabel;

  /// No description provided for @passwordLabel.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get passwordLabel;

  /// No description provided for @signIn.
  ///
  /// In ar, this message translates to:
  /// **'دخول'**
  String get signIn;

  /// No description provided for @createAccount.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء حساب'**
  String get createAccount;

  /// No description provided for @toCreate.
  ///
  /// In ar, this message translates to:
  /// **'ما عندك حساب؟ أنشئ حساباً'**
  String get toCreate;

  /// No description provided for @toSignIn.
  ///
  /// In ar, this message translates to:
  /// **'عندك حساب؟ ادخل'**
  String get toSignIn;

  /// No description provided for @errInvalidPhone.
  ///
  /// In ar, this message translates to:
  /// **'اكتب رقم جوال سعودي صحيح.'**
  String get errInvalidPhone;

  /// No description provided for @errInvalidCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز التحقق غير صحيح.'**
  String get errInvalidCode;

  /// No description provided for @errInvalidCredentials.
  ///
  /// In ar, this message translates to:
  /// **'البريد أو كلمة المرور غير صحيحة.'**
  String get errInvalidCredentials;

  /// No description provided for @errEmailInUse.
  ///
  /// In ar, this message translates to:
  /// **'هذا البريد مسجّل من قبل.'**
  String get errEmailInUse;

  /// No description provided for @errWeakPassword.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور قصيرة، استخدم 8 أحرف على الأقل.'**
  String get errWeakPassword;

  /// No description provided for @errTooMany.
  ///
  /// In ar, this message translates to:
  /// **'محاولات كثيرة. حاول لاحقاً.'**
  String get errTooMany;

  /// No description provided for @errGeneric.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر إكمال العملية. حاول مرة أخرى.'**
  String get errGeneric;

  /// No description provided for @onboardingTitle.
  ///
  /// In ar, this message translates to:
  /// **'عرّفنا بدورك'**
  String get onboardingTitle;

  /// No description provided for @onboardingSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'اختر دورك أو أكثر، ويمكنك تغييرها لاحقاً.'**
  String get onboardingSubtitle;

  /// No description provided for @roleOwner.
  ///
  /// In ar, this message translates to:
  /// **'مالك'**
  String get roleOwner;

  /// No description provided for @roleTenant.
  ///
  /// In ar, this message translates to:
  /// **'مستأجر'**
  String get roleTenant;

  /// No description provided for @roleManager.
  ///
  /// In ar, this message translates to:
  /// **'مدير عمارة'**
  String get roleManager;

  /// No description provided for @roleBroker.
  ///
  /// In ar, this message translates to:
  /// **'وسيط'**
  String get roleBroker;

  /// No description provided for @roleVendor.
  ///
  /// In ar, this message translates to:
  /// **'فنّي / مقاول'**
  String get roleVendor;

  /// No description provided for @roleOwnerHint.
  ///
  /// In ar, this message translates to:
  /// **'تدير من 1 إلى 50 وحدة'**
  String get roleOwnerHint;

  /// No description provided for @roleTenantHint.
  ///
  /// In ar, this message translates to:
  /// **'عقد إيجار قائم'**
  String get roleTenantHint;

  /// No description provided for @roleManagerHint.
  ///
  /// In ar, this message translates to:
  /// **'عمارة أو اتحاد ملاك'**
  String get roleManagerHint;

  /// No description provided for @roleBrokerHint.
  ///
  /// In ar, this message translates to:
  /// **'مرخّص من الهيئة العامة للعقار'**
  String get roleBrokerHint;

  /// No description provided for @roleVendorHint.
  ///
  /// In ar, this message translates to:
  /// **'صيانة وفحص'**
  String get roleVendorHint;

  /// No description provided for @displayName.
  ///
  /// In ar, this message translates to:
  /// **'اسمك'**
  String get displayName;

  /// No description provided for @orgName.
  ///
  /// In ar, this message translates to:
  /// **'اسم محفظتك أو شركتك'**
  String get orgName;

  /// No description provided for @consent.
  ///
  /// In ar, this message translates to:
  /// **'أوافق على معالجة بياناتي الشخصية لغرض تشغيل حسابي وفق نظام حماية البيانات الشخصية.'**
  String get consent;

  /// No description provided for @submitOrg.
  ///
  /// In ar, this message translates to:
  /// **'أنشئ مساحة العمل'**
  String get submitOrg;

  /// No description provided for @errPickRole.
  ///
  /// In ar, this message translates to:
  /// **'اختر دوراً واحداً على الأقل.'**
  String get errPickRole;

  /// No description provided for @errNeedConsent.
  ///
  /// In ar, this message translates to:
  /// **'الموافقة مطلوبة للمتابعة.'**
  String get errNeedConsent;

  /// No description provided for @errTooManyOrgs.
  ///
  /// In ar, this message translates to:
  /// **'وصلت إلى الحد الأقصى من المساحات.'**
  String get errTooManyOrgs;

  /// No description provided for @errOrgGeneric.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر إنشاء مساحة العمل. حاول مرة أخرى.'**
  String get errOrgGeneric;

  /// No description provided for @workspaceTitle.
  ///
  /// In ar, this message translates to:
  /// **'مساحة العمل'**
  String get workspaceTitle;

  /// No description provided for @workspaceReady.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء مساحتك. ستظهر هنا محفظتك وخريطتك في المراحل القادمة.'**
  String get workspaceReady;

  /// No description provided for @workspaceNoOrg.
  ///
  /// In ar, this message translates to:
  /// **'لم تنشئ مساحة عمل بعد.'**
  String get workspaceNoOrg;

  /// No description provided for @next.
  ///
  /// In ar, this message translates to:
  /// **'التالي'**
  String get next;

  /// No description provided for @skip.
  ///
  /// In ar, this message translates to:
  /// **'تخطّي'**
  String get skip;

  /// No description provided for @intro1Title.
  ///
  /// In ar, this message translates to:
  /// **'كل شيء موثّق'**
  String get intro1Title;

  /// No description provided for @intro1Body.
  ///
  /// In ar, this message translates to:
  /// **'من يوم الاستلام إلى يوم التسليم: عقدك ودفعاتك وحالة الوحدة في سجل واحد.'**
  String get intro1Body;

  /// No description provided for @intro2Title.
  ///
  /// In ar, this message translates to:
  /// **'فحص بالصور والتوقيع'**
  String get intro2Title;

  /// No description provided for @intro2Body.
  ///
  /// In ar, this message translates to:
  /// **'وثّق الوحدة غرفة بغرفة، بوقت وموقع كل صورة، وبتوقيع الطرفين.'**
  String get intro2Body;

  /// No description provided for @intro3Title.
  ///
  /// In ar, this message translates to:
  /// **'يكمّل إيجار'**
  String get intro3Title;

  /// No description provided for @intro3Body.
  ///
  /// In ar, this message translates to:
  /// **'لا يحلّ محلّ عقود إيجار ولا وديعته ولا نموذج التسليم الرسمي، بل يوثّق ما حولها.'**
  String get intro3Body;

  /// No description provided for @navHome.
  ///
  /// In ar, this message translates to:
  /// **'الرئيسية'**
  String get navHome;

  /// No description provided for @navMap.
  ///
  /// In ar, this message translates to:
  /// **'الخريطة'**
  String get navMap;

  /// No description provided for @navRecord.
  ///
  /// In ar, this message translates to:
  /// **'السجل'**
  String get navRecord;

  /// No description provided for @navProfile.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get navProfile;

  /// No description provided for @navLabel.
  ///
  /// In ar, this message translates to:
  /// **'التنقل الرئيسي'**
  String get navLabel;

  /// No description provided for @mapSoonTitle.
  ///
  /// In ar, this message translates to:
  /// **'الخريطة قريباً'**
  String get mapSoonTitle;

  /// No description provided for @mapSoonBody.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر عقاراتك هنا على خريطة ثلاثية الأبعاد.'**
  String get mapSoonBody;

  /// No description provided for @recordSample.
  ///
  /// In ar, this message translates to:
  /// **'مثال توضيحي'**
  String get recordSample;

  /// No description provided for @recordEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجل العقار'**
  String get recordEmptyTitle;

  /// No description provided for @recordEv1.
  ///
  /// In ar, this message translates to:
  /// **'استلام الوحدة'**
  String get recordEv1;

  /// No description provided for @recordEv1Detail.
  ///
  /// In ar, this message translates to:
  /// **'فحص غرفة بغرفة، بتوقيع المالك والمستأجر.'**
  String get recordEv1Detail;

  /// No description provided for @recordEv2.
  ///
  /// In ar, this message translates to:
  /// **'صيانة التكييف'**
  String get recordEv2;

  /// No description provided for @recordEv2Detail.
  ///
  /// In ar, this message translates to:
  /// **'تذكرة مغلقة بصور قبل وبعد.'**
  String get recordEv2Detail;

  /// No description provided for @recordEv3.
  ///
  /// In ar, this message translates to:
  /// **'تنبيه تجديد العقد'**
  String get recordEv3;

  /// No description provided for @recordEv3Detail.
  ///
  /// In ar, this message translates to:
  /// **'تذكير للطرفين قبل انتهاء العقد بستين يوماً.'**
  String get recordEv3Detail;

  /// No description provided for @profileTitle.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get profileTitle;

  /// No description provided for @themeDark.
  ///
  /// In ar, this message translates to:
  /// **'داكن'**
  String get themeDark;

  /// No description provided for @themeLight.
  ///
  /// In ar, this message translates to:
  /// **'فاتح'**
  String get themeLight;

  /// No description provided for @themeToggle.
  ///
  /// In ar, this message translates to:
  /// **'تبديل المظهر'**
  String get themeToggle;

  /// No description provided for @galleryTitle.
  ///
  /// In ar, this message translates to:
  /// **'معرض المكوّنات'**
  String get galleryTitle;

  /// No description provided for @gButtons.
  ///
  /// In ar, this message translates to:
  /// **'الأزرار'**
  String get gButtons;

  /// No description provided for @gPrimary.
  ///
  /// In ar, this message translates to:
  /// **'أساسي'**
  String get gPrimary;

  /// No description provided for @gQuiet.
  ///
  /// In ar, this message translates to:
  /// **'هادئ'**
  String get gQuiet;

  /// No description provided for @gGhost.
  ///
  /// In ar, this message translates to:
  /// **'نصي'**
  String get gGhost;

  /// No description provided for @gLoading.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ الحفظ'**
  String get gLoading;

  /// No description provided for @gFields.
  ///
  /// In ar, this message translates to:
  /// **'الحقول'**
  String get gFields;

  /// No description provided for @gFieldLabel.
  ///
  /// In ar, this message translates to:
  /// **'اسم الوحدة'**
  String get gFieldLabel;

  /// No description provided for @gFieldHint.
  ///
  /// In ar, this message translates to:
  /// **'مثال: شقة 3'**
  String get gFieldHint;

  /// No description provided for @gFieldError.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحقل مطلوب'**
  String get gFieldError;

  /// No description provided for @gSelectLabel.
  ///
  /// In ar, this message translates to:
  /// **'نوع الوحدة'**
  String get gSelectLabel;

  /// No description provided for @gSelectPlaceholder.
  ///
  /// In ar, this message translates to:
  /// **'اختر النوع'**
  String get gSelectPlaceholder;

  /// No description provided for @gStudio.
  ///
  /// In ar, this message translates to:
  /// **'استوديو'**
  String get gStudio;

  /// No description provided for @gApartment.
  ///
  /// In ar, this message translates to:
  /// **'شقة'**
  String get gApartment;

  /// No description provided for @gVilla.
  ///
  /// In ar, this message translates to:
  /// **'فيلا'**
  String get gVilla;

  /// No description provided for @gOverlays.
  ///
  /// In ar, this message translates to:
  /// **'النوافذ'**
  String get gOverlays;

  /// No description provided for @gOpenDialog.
  ///
  /// In ar, this message translates to:
  /// **'افتح نافذة'**
  String get gOpenDialog;

  /// No description provided for @gDialogTitle.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد الإجراء'**
  String get gDialogTitle;

  /// No description provided for @gDialogBody.
  ///
  /// In ar, this message translates to:
  /// **'لن يتغير أي سجل قبل ضغطك على تأكيد.'**
  String get gDialogBody;

  /// No description provided for @gConfirm.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد'**
  String get gConfirm;

  /// No description provided for @gOpenSheet.
  ///
  /// In ar, this message translates to:
  /// **'افتح لوحة'**
  String get gOpenSheet;

  /// No description provided for @gSheetTitle.
  ///
  /// In ar, this message translates to:
  /// **'تصفية العقارات'**
  String get gSheetTitle;

  /// No description provided for @gShowToast.
  ///
  /// In ar, this message translates to:
  /// **'أظهر إشعاراً'**
  String get gShowToast;

  /// No description provided for @gToastMsg.
  ///
  /// In ar, this message translates to:
  /// **'تم حفظ التغييرات'**
  String get gToastMsg;

  /// No description provided for @gTabs.
  ///
  /// In ar, this message translates to:
  /// **'التبويبات'**
  String get gTabs;

  /// No description provided for @gTabsLabel.
  ///
  /// In ar, this message translates to:
  /// **'عرض'**
  String get gTabsLabel;

  /// No description provided for @gTabA.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات'**
  String get gTabA;

  /// No description provided for @gTabB.
  ///
  /// In ar, this message translates to:
  /// **'العقود'**
  String get gTabB;

  /// No description provided for @gCards.
  ///
  /// In ar, this message translates to:
  /// **'البطاقات'**
  String get gCards;

  /// No description provided for @gStatRent.
  ///
  /// In ar, this message translates to:
  /// **'إيجارات هذا الشهر'**
  String get gStatRent;

  /// No description provided for @gStatNote.
  ///
  /// In ar, this message translates to:
  /// **'مثال بقيم تجريبية'**
  String get gStatNote;

  /// No description provided for @gPropTitle.
  ///
  /// In ar, this message translates to:
  /// **'شقة 3، عمارة النخيل'**
  String get gPropTitle;

  /// No description provided for @gPropPlace.
  ///
  /// In ar, this message translates to:
  /// **'الرياض، حي الملقا'**
  String get gPropPlace;

  /// No description provided for @gPropMeta.
  ///
  /// In ar, this message translates to:
  /// **'الإيجار السنوي: 42,000 ر.س'**
  String get gPropMeta;

  /// No description provided for @gStatusOk.
  ///
  /// In ar, this message translates to:
  /// **'مدفوع'**
  String get gStatusOk;

  /// No description provided for @gStatusLate.
  ///
  /// In ar, this message translates to:
  /// **'متأخر'**
  String get gStatusLate;

  /// No description provided for @gEmpty.
  ///
  /// In ar, this message translates to:
  /// **'حالات الفراغ والتحميل'**
  String get gEmpty;

  /// No description provided for @gEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وحدات بعد'**
  String get gEmptyTitle;

  /// No description provided for @gEmptyBody.
  ///
  /// In ar, this message translates to:
  /// **'أضف أول وحدة لتبدأ السجل.'**
  String get gEmptyBody;

  /// No description provided for @gAddUnit.
  ///
  /// In ar, this message translates to:
  /// **'أضف وحدة'**
  String get gAddUnit;

  /// No description provided for @gGlass.
  ///
  /// In ar, this message translates to:
  /// **'الزجاج: للعناصر العائمة فوق الخريطة فقط'**
  String get gGlass;

  /// No description provided for @gGlassSample.
  ///
  /// In ar, this message translates to:
  /// **'ابحث عن حي أو عقار'**
  String get gGlassSample;

  /// No description provided for @gArch.
  ///
  /// In ar, this message translates to:
  /// **'قوس نجدي · الشرفات'**
  String get gArch;

  /// No description provided for @opsTabOverview.
  ///
  /// In ar, this message translates to:
  /// **'نظرة عامة'**
  String get opsTabOverview;

  /// No description provided for @opsTabProperties.
  ///
  /// In ar, this message translates to:
  /// **'العقارات والوحدات'**
  String get opsTabProperties;

  /// No description provided for @opsTabLeases.
  ///
  /// In ar, this message translates to:
  /// **'العقود والدفعات'**
  String get opsTabLeases;

  /// No description provided for @opsTabExpenses.
  ///
  /// In ar, this message translates to:
  /// **'المصروفات'**
  String get opsTabExpenses;

  /// No description provided for @opsTabReport.
  ///
  /// In ar, this message translates to:
  /// **'التقرير السنوي'**
  String get opsTabReport;

  /// No description provided for @opsTabMyLease.
  ///
  /// In ar, this message translates to:
  /// **'عقدي'**
  String get opsTabMyLease;

  /// No description provided for @opsUnits.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات'**
  String get opsUnits;

  /// No description provided for @opsActiveLeases.
  ///
  /// In ar, this message translates to:
  /// **'عقود سارية'**
  String get opsActiveLeases;

  /// No description provided for @opsCollected.
  ///
  /// In ar, this message translates to:
  /// **'المحصّل هذا العام'**
  String get opsCollected;

  /// No description provided for @opsOutstanding.
  ///
  /// In ar, this message translates to:
  /// **'المتبقي'**
  String get opsOutstanding;

  /// No description provided for @opsUpcoming.
  ///
  /// In ar, this message translates to:
  /// **'الدفعات القادمة'**
  String get opsUpcoming;

  /// No description provided for @opsNoUpcoming.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد دفعات قادمة.'**
  String get opsNoUpcoming;

  /// No description provided for @opsNotifications.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات'**
  String get opsNotifications;

  /// No description provided for @opsNoNotifications.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد تنبيهات.'**
  String get opsNoNotifications;

  /// No description provided for @opsName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get opsName;

  /// No description provided for @opsCity.
  ///
  /// In ar, this message translates to:
  /// **'المدينة'**
  String get opsCity;

  /// No description provided for @opsDistrict.
  ///
  /// In ar, this message translates to:
  /// **'الحي'**
  String get opsDistrict;

  /// No description provided for @opsKindBuilding.
  ///
  /// In ar, this message translates to:
  /// **'عمارة'**
  String get opsKindBuilding;

  /// No description provided for @opsKindVilla.
  ///
  /// In ar, this message translates to:
  /// **'فيلا'**
  String get opsKindVilla;

  /// No description provided for @opsAddProperty.
  ///
  /// In ar, this message translates to:
  /// **'أضف عقاراً'**
  String get opsAddProperty;

  /// No description provided for @opsNoProperties.
  ///
  /// In ar, this message translates to:
  /// **'ما أضفت عقارات بعد.'**
  String get opsNoProperties;

  /// No description provided for @opsAddUnit.
  ///
  /// In ar, this message translates to:
  /// **'أضف وحدة'**
  String get opsAddUnit;

  /// No description provided for @opsUnitLabel.
  ///
  /// In ar, this message translates to:
  /// **'رقم أو اسم الوحدة'**
  String get opsUnitLabel;

  /// No description provided for @opsTypeStudio.
  ///
  /// In ar, this message translates to:
  /// **'استوديو'**
  String get opsTypeStudio;

  /// No description provided for @opsTypeApartment.
  ///
  /// In ar, this message translates to:
  /// **'شقة'**
  String get opsTypeApartment;

  /// No description provided for @opsTypeVilla.
  ///
  /// In ar, this message translates to:
  /// **'فيلا'**
  String get opsTypeVilla;

  /// No description provided for @opsNoUnits.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وحدات.'**
  String get opsNoUnits;

  /// No description provided for @opsAddLease.
  ///
  /// In ar, this message translates to:
  /// **'أضف عقداً'**
  String get opsAddLease;

  /// No description provided for @opsEjarNo.
  ///
  /// In ar, this message translates to:
  /// **'رقم عقد إيجار'**
  String get opsEjarNo;

  /// No description provided for @opsEjarHint.
  ///
  /// In ar, this message translates to:
  /// **'نسجّل الرقم للرجوع إليه، والعقد نفسه يبقى في إيجار.'**
  String get opsEjarHint;

  /// No description provided for @opsTenantName.
  ///
  /// In ar, this message translates to:
  /// **'اسم المستأجر'**
  String get opsTenantName;

  /// No description provided for @opsTenantEmail.
  ///
  /// In ar, this message translates to:
  /// **'بريد المستأجر (للدعوة)'**
  String get opsTenantEmail;

  /// No description provided for @opsStartDate.
  ///
  /// In ar, this message translates to:
  /// **'بداية العقد'**
  String get opsStartDate;

  /// No description provided for @opsEndDate.
  ///
  /// In ar, this message translates to:
  /// **'نهاية العقد'**
  String get opsEndDate;

  /// No description provided for @opsAnnualRent.
  ///
  /// In ar, this message translates to:
  /// **'الإيجار السنوي (ر.س)'**
  String get opsAnnualRent;

  /// No description provided for @opsCycle.
  ///
  /// In ar, this message translates to:
  /// **'دورة الدفع'**
  String get opsCycle;

  /// No description provided for @opsMonthly.
  ///
  /// In ar, this message translates to:
  /// **'شهري'**
  String get opsMonthly;

  /// No description provided for @opsQuarterly.
  ///
  /// In ar, this message translates to:
  /// **'ربع سنوي'**
  String get opsQuarterly;

  /// No description provided for @opsSemiannual.
  ///
  /// In ar, this message translates to:
  /// **'نصف سنوي'**
  String get opsSemiannual;

  /// No description provided for @opsAnnual.
  ///
  /// In ar, this message translates to:
  /// **'سنوي'**
  String get opsAnnual;

  /// No description provided for @opsDeposit.
  ///
  /// In ar, this message translates to:
  /// **'مبلغ الوديعة (للعلم فقط)'**
  String get opsDeposit;

  /// No description provided for @opsDepositNote.
  ///
  /// In ar, this message translates to:
  /// **'الوديعة تُحفظ عبر إيجار، ولا نستلم أي مبالغ.'**
  String get opsDepositNote;

  /// No description provided for @opsPreviousRent.
  ///
  /// In ar, this message translates to:
  /// **'الإيجار السابق (عند التجديد)'**
  String get opsPreviousRent;

  /// No description provided for @opsFreezeWarn.
  ///
  /// In ar, this message translates to:
  /// **'تنبيه: الزيادة في عقود الرياض موقوفة حالياً. الحد المعتاد للتجديد {max} ر.س.'**
  String opsFreezeWarn(String max);

  /// No description provided for @opsFreezeNote.
  ///
  /// In ar, this message translates to:
  /// **'معلومة استرشادية وليست رأياً قانونياً. راجع إيجار أو مختصاً مرخّصاً.'**
  String get opsFreezeNote;

  /// No description provided for @opsSaveLease.
  ///
  /// In ar, this message translates to:
  /// **'احفظ العقد وأنشئ الجدول'**
  String get opsSaveLease;

  /// No description provided for @opsLeaseSaved.
  ///
  /// In ar, this message translates to:
  /// **'تم حفظ العقد وجدول الدفعات.'**
  String get opsLeaseSaved;

  /// No description provided for @opsSchedule.
  ///
  /// In ar, this message translates to:
  /// **'جدول الدفعات'**
  String get opsSchedule;

  /// No description provided for @opsDueDate.
  ///
  /// In ar, this message translates to:
  /// **'الاستحقاق'**
  String get opsDueDate;

  /// No description provided for @opsAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ'**
  String get opsAmount;

  /// No description provided for @opsStatus.
  ///
  /// In ar, this message translates to:
  /// **'الحالة'**
  String get opsStatus;

  /// No description provided for @opsStatusDue.
  ///
  /// In ar, this message translates to:
  /// **'مستحقة'**
  String get opsStatusDue;

  /// No description provided for @opsStatusPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة'**
  String get opsStatusPaid;

  /// No description provided for @opsStatusLate.
  ///
  /// In ar, this message translates to:
  /// **'متأخرة'**
  String get opsStatusLate;

  /// No description provided for @opsMarkPaid.
  ///
  /// In ar, this message translates to:
  /// **'سجّل الدفع'**
  String get opsMarkPaid;

  /// No description provided for @opsNoLeases.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عقود.'**
  String get opsNoLeases;

  /// No description provided for @opsRenewalNotice.
  ///
  /// In ar, this message translates to:
  /// **'إشعار التجديد قبل {date}'**
  String opsRenewalNotice(String date);

  /// No description provided for @opsInviteTenant.
  ///
  /// In ar, this message translates to:
  /// **'ادعُ المستأجر'**
  String get opsInviteTenant;

  /// No description provided for @opsInviteLinked.
  ///
  /// In ar, this message translates to:
  /// **'تم ربط المستأجر بالعقد.'**
  String get opsInviteLinked;

  /// No description provided for @opsInvitePending.
  ///
  /// In ar, this message translates to:
  /// **'أُرسلت الدعوة، وتُفعَّل عند تسجيله بهذا البريد بعد تأكيده.'**
  String get opsInvitePending;

  /// No description provided for @opsRecordsOnly.
  ///
  /// In ar, this message translates to:
  /// **'نسجّل الدفعات فقط؛ لا نستلم الأموال ولا نموّل الإيجار.'**
  String get opsRecordsOnly;

  /// No description provided for @opsAddExpense.
  ///
  /// In ar, this message translates to:
  /// **'أضف مصروفاً'**
  String get opsAddExpense;

  /// No description provided for @opsCategory.
  ///
  /// In ar, this message translates to:
  /// **'التصنيف'**
  String get opsCategory;

  /// No description provided for @opsCatMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get opsCatMaintenance;

  /// No description provided for @opsCatUtilities.
  ///
  /// In ar, this message translates to:
  /// **'خدمات'**
  String get opsCatUtilities;

  /// No description provided for @opsCatInsurance.
  ///
  /// In ar, this message translates to:
  /// **'تأمين'**
  String get opsCatInsurance;

  /// No description provided for @opsCatFees.
  ///
  /// In ar, this message translates to:
  /// **'رسوم'**
  String get opsCatFees;

  /// No description provided for @opsCatOther.
  ///
  /// In ar, this message translates to:
  /// **'أخرى'**
  String get opsCatOther;

  /// No description provided for @opsDate.
  ///
  /// In ar, this message translates to:
  /// **'التاريخ'**
  String get opsDate;

  /// No description provided for @opsNote.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظة'**
  String get opsNote;

  /// No description provided for @opsNoExpenses.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مصروفات.'**
  String get opsNoExpenses;

  /// No description provided for @opsProperty.
  ///
  /// In ar, this message translates to:
  /// **'العقار'**
  String get opsProperty;

  /// No description provided for @opsReportTitle.
  ///
  /// In ar, this message translates to:
  /// **'التقرير السنوي للدخل والمصروفات'**
  String get opsReportTitle;

  /// No description provided for @opsYear.
  ///
  /// In ar, this message translates to:
  /// **'السنة'**
  String get opsYear;

  /// No description provided for @opsExpected.
  ///
  /// In ar, this message translates to:
  /// **'المتوقع'**
  String get opsExpected;

  /// No description provided for @opsExpenses.
  ///
  /// In ar, this message translates to:
  /// **'المصروفات'**
  String get opsExpenses;

  /// No description provided for @opsNet.
  ///
  /// In ar, this message translates to:
  /// **'الصافي'**
  String get opsNet;

  /// No description provided for @opsReportNote.
  ///
  /// In ar, this message translates to:
  /// **'تقرير استرشادي من سجلاتك، وليس مستنداً محاسبياً أو قانونياً.'**
  String get opsReportNote;

  /// No description provided for @opsAddToCalendar.
  ///
  /// In ar, this message translates to:
  /// **'أضف للتقويم'**
  String get opsAddToCalendar;

  /// No description provided for @opsCalPayment.
  ///
  /// In ar, this message translates to:
  /// **'دفعة إيجار'**
  String get opsCalPayment;

  /// No description provided for @opsCalLeaseEnd.
  ///
  /// In ar, this message translates to:
  /// **'نهاية العقد'**
  String get opsCalLeaseEnd;

  /// No description provided for @opsCalRenewal.
  ///
  /// In ar, this message translates to:
  /// **'إشعار التجديد'**
  String get opsCalRenewal;

  /// No description provided for @opsNUpcoming.
  ///
  /// In ar, this message translates to:
  /// **'دفعة قريبة الاستحقاق'**
  String get opsNUpcoming;

  /// No description provided for @opsNLate.
  ///
  /// In ar, this message translates to:
  /// **'دفعة متأخرة'**
  String get opsNLate;

  /// No description provided for @opsNExpiring.
  ///
  /// In ar, this message translates to:
  /// **'عقد ينتهي قريباً'**
  String get opsNExpiring;

  /// No description provided for @opsNRenewal.
  ///
  /// In ar, this message translates to:
  /// **'حان وقت إشعار التجديد'**
  String get opsNRenewal;

  /// No description provided for @opsDaysLeft.
  ///
  /// In ar, this message translates to:
  /// **'{count} يوماً'**
  String opsDaysLeft(int count);

  /// No description provided for @opsSave.
  ///
  /// In ar, this message translates to:
  /// **'احفظ'**
  String get opsSave;

  /// No description provided for @opsSaving.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ الحفظ'**
  String get opsSaving;

  /// No description provided for @opsErrorGeneric.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر الحفظ. حاول مرة أخرى.'**
  String get opsErrorGeneric;

  /// No description provided for @opsRequired.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحقل مطلوب'**
  String get opsRequired;

  /// No description provided for @opsSar.
  ///
  /// In ar, this message translates to:
  /// **'ر.س'**
  String get opsSar;

  /// No description provided for @opsChoose.
  ///
  /// In ar, this message translates to:
  /// **'اختر'**
  String get opsChoose;

  /// No description provided for @opsCalendarNote.
  ///
  /// In ar, this message translates to:
  /// **'ملف تقويم مجاني: دفعاتك وتواريخ العقد تظهر في تقويم جوالك وتجيك منه إشعارات.'**
  String get opsCalendarNote;

  /// No description provided for @opsRemindersFree.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات تُحسب من سجلاتك وتظهر هنا مجاناً، ويمكنك إضافتها لتقويم جوالك.'**
  String get opsRemindersFree;

  /// No description provided for @opsBack.
  ///
  /// In ar, this message translates to:
  /// **'رجوع'**
  String get opsBack;

  /// No description provided for @opsOpenLease.
  ///
  /// In ar, this message translates to:
  /// **'افتح العقد'**
  String get opsOpenLease;

  /// No description provided for @opsLeaseOf.
  ///
  /// In ar, this message translates to:
  /// **'عقد {unit}'**
  String opsLeaseOf(String unit);

  /// No description provided for @opsHomeStaffHint.
  ///
  /// In ar, this message translates to:
  /// **'ملخّص محفظتك وتنبيهاتك.'**
  String get opsHomeStaffHint;

  /// No description provided for @opsPaidOn.
  ///
  /// In ar, this message translates to:
  /// **'دُفعت في {date}'**
  String opsPaidOn(String date);

  /// No description provided for @opsChooseUnit.
  ///
  /// In ar, this message translates to:
  /// **'اختر وحدة لإضافة عقد'**
  String get opsChooseUnit;

  /// No description provided for @opsInvalidDate.
  ///
  /// In ar, this message translates to:
  /// **'اكتب التاريخ بصيغة 2026-01-31'**
  String get opsInvalidDate;

  /// No description provided for @opsInvalidEjar.
  ///
  /// In ar, this message translates to:
  /// **'رقم عقد إيجار من 6 إلى 30 حرفاً أو رقماً'**
  String get opsInvalidEjar;

  /// No description provided for @opsInvalidAmount.
  ///
  /// In ar, this message translates to:
  /// **'اكتب مبلغاً صحيحاً أكبر من صفر'**
  String get opsInvalidAmount;

  /// No description provided for @opsEndBeforeStart.
  ///
  /// In ar, this message translates to:
  /// **'نهاية العقد لازم تكون بعد بدايته'**
  String get opsEndBeforeStart;

  /// No description provided for @opsCalendarFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر تجهيز ملف التقويم.'**
  String get opsCalendarFailed;

  /// No description provided for @opsLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر تحميل البيانات. تأكد من الاتصال وحاول مرة أخرى.'**
  String get opsLoadFailed;

  /// No description provided for @opsPickDate.
  ///
  /// In ar, this message translates to:
  /// **'اختر التاريخ'**
  String get opsPickDate;

  /// No description provided for @opsInvitedAgain.
  ///
  /// In ar, this message translates to:
  /// **'أُرسلت الدعوة.'**
  String get opsInvitedAgain;

  /// No description provided for @opsTenantLabel.
  ///
  /// In ar, this message translates to:
  /// **'المستأجر'**
  String get opsTenantLabel;

  /// No description provided for @opsInvalidEmail.
  ///
  /// In ar, this message translates to:
  /// **'اكتب بريداً إلكترونياً صحيحاً'**
  String get opsInvalidEmail;

  /// No description provided for @inspTab.
  ///
  /// In ar, this message translates to:
  /// **'الفحوصات'**
  String get inspTab;

  /// No description provided for @inspTabRecord.
  ///
  /// In ar, this message translates to:
  /// **'سجل العقار'**
  String get inspTabRecord;

  /// No description provided for @inspBack.
  ///
  /// In ar, this message translates to:
  /// **'رجوع'**
  String get inspBack;

  /// No description provided for @inspStart.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ فحصاً'**
  String get inspStart;

  /// No description provided for @inspLease.
  ///
  /// In ar, this message translates to:
  /// **'العقد'**
  String get inspLease;

  /// No description provided for @inspKind.
  ///
  /// In ar, this message translates to:
  /// **'نوع الفحص'**
  String get inspKind;

  /// No description provided for @inspMoveIn.
  ///
  /// In ar, this message translates to:
  /// **'فحص الاستلام'**
  String get inspMoveIn;

  /// No description provided for @inspMoveOut.
  ///
  /// In ar, this message translates to:
  /// **'فحص التسليم'**
  String get inspMoveOut;

  /// No description provided for @inspChoose.
  ///
  /// In ar, this message translates to:
  /// **'اختر'**
  String get inspChoose;

  /// No description provided for @inspPickLease.
  ///
  /// In ar, this message translates to:
  /// **'اختر العقد أولاً.'**
  String get inspPickLease;

  /// No description provided for @inspNeedLease.
  ///
  /// In ar, this message translates to:
  /// **'أضف عقداً أولاً لتبدأ فحص الاستلام.'**
  String get inspNeedLease;

  /// No description provided for @inspNone.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد فحوصات بعد.'**
  String get inspNone;

  /// No description provided for @inspBedrooms.
  ///
  /// In ar, this message translates to:
  /// **'عدد غرف النوم'**
  String get inspBedrooms;

  /// No description provided for @inspBathrooms.
  ///
  /// In ar, this message translates to:
  /// **'عدد دورات المياه'**
  String get inspBathrooms;

  /// No description provided for @inspComparedWithMoveIn.
  ///
  /// In ar, this message translates to:
  /// **'سيُقارَن هذا الفحص بفحص الاستلام الموثّق.'**
  String get inspComparedWithMoveIn;

  /// No description provided for @inspNoSealedMoveIn.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد فحص استلام موثّق لهذا العقد، لذلك لن تظهر مقارنة.'**
  String get inspNoSealedMoveIn;

  /// No description provided for @inspSaveFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر الحفظ. حاول مرة أخرى.'**
  String get inspSaveFailed;

  /// No description provided for @inspUploadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر رفع الصورة. حاول مرة أخرى.'**
  String get inspUploadFailed;

  /// No description provided for @inspStatusDraft.
  ///
  /// In ar, this message translates to:
  /// **'مسودة'**
  String get inspStatusDraft;

  /// No description provided for @inspStatusPendingSignatures.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار التوقيع'**
  String get inspStatusPendingSignatures;

  /// No description provided for @inspStatusSealed.
  ///
  /// In ar, this message translates to:
  /// **'موثّق ومقفل'**
  String get inspStatusSealed;

  /// No description provided for @inspProgress.
  ///
  /// In ar, this message translates to:
  /// **'{done} من {total} بنداً'**
  String inspProgress(int done, int total);

  /// No description provided for @inspPartyOwner.
  ///
  /// In ar, this message translates to:
  /// **'المالك'**
  String get inspPartyOwner;

  /// No description provided for @inspPartyTenant.
  ///
  /// In ar, this message translates to:
  /// **'المستأجر'**
  String get inspPartyTenant;

  /// No description provided for @inspSigned.
  ///
  /// In ar, this message translates to:
  /// **'وقّع'**
  String get inspSigned;

  /// No description provided for @inspNotSigned.
  ///
  /// In ar, this message translates to:
  /// **'لم يوقّع بعد'**
  String get inspNotSigned;

  /// No description provided for @inspSealedNote.
  ///
  /// In ar, this message translates to:
  /// **'اكتمل التوقيع من الطرفين ولا يمكن تعديل الفحص. بصمة المحتوى:'**
  String get inspSealedNote;

  /// No description provided for @inspFinishFirst.
  ///
  /// In ar, this message translates to:
  /// **'أجب عن كل البنود قبل التوقيع.'**
  String get inspFinishFirst;

  /// No description provided for @inspWaitingTenant.
  ///
  /// In ar, this message translates to:
  /// **'وقّعت أنت. بانتظار توقيع المستأجر.'**
  String get inspWaitingTenant;

  /// No description provided for @inspComplementsEjar.
  ///
  /// In ar, this message translates to:
  /// **'هذا الفحص يكمّل نموذج التسليم الرسمي في إيجار ولا يحلّ محله.'**
  String get inspComplementsEjar;

  /// No description provided for @inspRoomEntrance.
  ///
  /// In ar, this message translates to:
  /// **'المدخل'**
  String get inspRoomEntrance;

  /// No description provided for @inspRoomLiving.
  ///
  /// In ar, this message translates to:
  /// **'الصالة'**
  String get inspRoomLiving;

  /// No description provided for @inspRoomMajlis.
  ///
  /// In ar, this message translates to:
  /// **'المجلس'**
  String get inspRoomMajlis;

  /// No description provided for @inspRoomBedroom.
  ///
  /// In ar, this message translates to:
  /// **'غرفة نوم'**
  String get inspRoomBedroom;

  /// No description provided for @inspRoomKitchen.
  ///
  /// In ar, this message translates to:
  /// **'المطبخ'**
  String get inspRoomKitchen;

  /// No description provided for @inspRoomBathroom.
  ///
  /// In ar, this message translates to:
  /// **'دورة المياه'**
  String get inspRoomBathroom;

  /// No description provided for @inspRoomBalcony.
  ///
  /// In ar, this message translates to:
  /// **'الشرفة'**
  String get inspRoomBalcony;

  /// No description provided for @inspRoomYard.
  ///
  /// In ar, this message translates to:
  /// **'الحوش'**
  String get inspRoomYard;

  /// No description provided for @inspRoomParking.
  ///
  /// In ar, this message translates to:
  /// **'الموقف'**
  String get inspRoomParking;

  /// No description provided for @inspRoomRoof.
  ///
  /// In ar, this message translates to:
  /// **'السطح'**
  String get inspRoomRoof;

  /// No description provided for @inspRoomMeters.
  ///
  /// In ar, this message translates to:
  /// **'العدادات'**
  String get inspRoomMeters;

  /// No description provided for @inspItemDoor.
  ///
  /// In ar, this message translates to:
  /// **'الباب'**
  String get inspItemDoor;

  /// No description provided for @inspItemLock.
  ///
  /// In ar, this message translates to:
  /// **'القفل'**
  String get inspItemLock;

  /// No description provided for @inspItemIntercom.
  ///
  /// In ar, this message translates to:
  /// **'الاتصال الداخلي'**
  String get inspItemIntercom;

  /// No description provided for @inspItemFloor.
  ///
  /// In ar, this message translates to:
  /// **'الأرضية'**
  String get inspItemFloor;

  /// No description provided for @inspItemLighting.
  ///
  /// In ar, this message translates to:
  /// **'الإنارة'**
  String get inspItemLighting;

  /// No description provided for @inspItemWalls.
  ///
  /// In ar, this message translates to:
  /// **'الجدران'**
  String get inspItemWalls;

  /// No description provided for @inspItemCeiling.
  ///
  /// In ar, this message translates to:
  /// **'السقف'**
  String get inspItemCeiling;

  /// No description provided for @inspItemWindows.
  ///
  /// In ar, this message translates to:
  /// **'النوافذ'**
  String get inspItemWindows;

  /// No description provided for @inspItemOutlets.
  ///
  /// In ar, this message translates to:
  /// **'المقابس'**
  String get inspItemOutlets;

  /// No description provided for @inspItemAc.
  ///
  /// In ar, this message translates to:
  /// **'المكيّف'**
  String get inspItemAc;

  /// No description provided for @inspItemDoors.
  ///
  /// In ar, this message translates to:
  /// **'الأبواب'**
  String get inspItemDoors;

  /// No description provided for @inspItemWardrobe.
  ///
  /// In ar, this message translates to:
  /// **'الدولاب'**
  String get inspItemWardrobe;

  /// No description provided for @inspItemCabinets.
  ///
  /// In ar, this message translates to:
  /// **'الخزائن'**
  String get inspItemCabinets;

  /// No description provided for @inspItemCountertop.
  ///
  /// In ar, this message translates to:
  /// **'سطح العمل'**
  String get inspItemCountertop;

  /// No description provided for @inspItemSink.
  ///
  /// In ar, this message translates to:
  /// **'الحوض'**
  String get inspItemSink;

  /// No description provided for @inspItemFaucet.
  ///
  /// In ar, this message translates to:
  /// **'الصنبور'**
  String get inspItemFaucet;

  /// No description provided for @inspItemHookup.
  ///
  /// In ar, this message translates to:
  /// **'توصيلة الغاز أو الكهرباء'**
  String get inspItemHookup;

  /// No description provided for @inspItemExhaust.
  ///
  /// In ar, this message translates to:
  /// **'المروحة الشافطة'**
  String get inspItemExhaust;

  /// No description provided for @inspItemToilet.
  ///
  /// In ar, this message translates to:
  /// **'المرحاض'**
  String get inspItemToilet;

  /// No description provided for @inspItemBasin.
  ///
  /// In ar, this message translates to:
  /// **'المغسلة'**
  String get inspItemBasin;

  /// No description provided for @inspItemShower.
  ///
  /// In ar, this message translates to:
  /// **'الدش'**
  String get inspItemShower;

  /// No description provided for @inspItemHeater.
  ///
  /// In ar, this message translates to:
  /// **'سخّان المياه'**
  String get inspItemHeater;

  /// No description provided for @inspItemRailing.
  ///
  /// In ar, this message translates to:
  /// **'الدرابزين'**
  String get inspItemRailing;

  /// No description provided for @inspItemFence.
  ///
  /// In ar, this message translates to:
  /// **'السور'**
  String get inspItemFence;

  /// No description provided for @inspItemGate.
  ///
  /// In ar, this message translates to:
  /// **'البوابة'**
  String get inspItemGate;

  /// No description provided for @inspItemGround.
  ///
  /// In ar, this message translates to:
  /// **'الأرضية الخارجية'**
  String get inspItemGround;

  /// No description provided for @inspItemWaterproofing.
  ///
  /// In ar, this message translates to:
  /// **'العزل'**
  String get inspItemWaterproofing;

  /// No description provided for @inspItemAccess.
  ///
  /// In ar, this message translates to:
  /// **'باب السطح'**
  String get inspItemAccess;

  /// No description provided for @inspItemTank.
  ///
  /// In ar, this message translates to:
  /// **'خزان المياه'**
  String get inspItemTank;

  /// No description provided for @inspItemElectricity.
  ///
  /// In ar, this message translates to:
  /// **'عدّاد الكهرباء (اكتب القراءة في الملاحظة)'**
  String get inspItemElectricity;

  /// No description provided for @inspItemWater.
  ///
  /// In ar, this message translates to:
  /// **'عدّاد المياه (اكتب القراءة في الملاحظة)'**
  String get inspItemWater;

  /// No description provided for @inspItemGas.
  ///
  /// In ar, this message translates to:
  /// **'عدّاد الغاز (اكتب القراءة في الملاحظة)'**
  String get inspItemGas;

  /// No description provided for @inspCondGood.
  ///
  /// In ar, this message translates to:
  /// **'سليم'**
  String get inspCondGood;

  /// No description provided for @inspCondFair.
  ///
  /// In ar, this message translates to:
  /// **'مقبول'**
  String get inspCondFair;

  /// No description provided for @inspCondPoor.
  ///
  /// In ar, this message translates to:
  /// **'رديء'**
  String get inspCondPoor;

  /// No description provided for @inspCondDamaged.
  ///
  /// In ar, this message translates to:
  /// **'تالف'**
  String get inspCondDamaged;

  /// No description provided for @inspCondition.
  ///
  /// In ar, this message translates to:
  /// **'الحالة'**
  String get inspCondition;

  /// No description provided for @inspNote.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظة'**
  String get inspNote;

  /// No description provided for @inspNotAnswered.
  ///
  /// In ar, this message translates to:
  /// **'لم تُسجَّل حالته'**
  String get inspNotAnswered;

  /// No description provided for @inspWasAtMoveIn.
  ///
  /// In ar, this message translates to:
  /// **'عند الاستلام: {cond}'**
  String inspWasAtMoveIn(String cond);

  /// No description provided for @inspAllGood.
  ///
  /// In ar, this message translates to:
  /// **'كل بنود الغرفة سليمة'**
  String get inspAllGood;

  /// No description provided for @inspRoomPhoto.
  ///
  /// In ar, this message translates to:
  /// **'صورة للغرفة'**
  String get inspRoomPhoto;

  /// No description provided for @inspPhoto.
  ///
  /// In ar, this message translates to:
  /// **'صوّر'**
  String get inspPhoto;

  /// No description provided for @inspPhotoOf.
  ///
  /// In ar, this message translates to:
  /// **'تصوير: {what}'**
  String inspPhotoOf(String what);

  /// No description provided for @inspCapture.
  ///
  /// In ar, this message translates to:
  /// **'التقط الصورة'**
  String get inspCapture;

  /// No description provided for @inspCameraDenied.
  ///
  /// In ar, this message translates to:
  /// **'لم نتمكن من فتح الكاميرا. اسمح بالوصول إليها من إعدادات المتصفح ثم أعد المحاولة.'**
  String get inspCameraDenied;

  /// No description provided for @inspCaptureNote.
  ///
  /// In ar, this message translates to:
  /// **'تُسجَّل الصورة بوقتها وموقعها وبصمة SHA-256 لحظة التقاطها، ولا يمكن رفع صور من المعرض.'**
  String get inspCaptureNote;

  /// No description provided for @inspEvidenceAlt.
  ///
  /// In ar, this message translates to:
  /// **'صورة من الفحص'**
  String get inspEvidenceAlt;

  /// No description provided for @inspHasGps.
  ///
  /// In ar, this message translates to:
  /// **'الموقع مسجّل'**
  String get inspHasGps;

  /// No description provided for @inspNoGps.
  ///
  /// In ar, this message translates to:
  /// **'بدون موقع'**
  String get inspNoGps;

  /// No description provided for @inspVerify.
  ///
  /// In ar, this message translates to:
  /// **'تحقق من سلامة الملف'**
  String get inspVerify;

  /// No description provided for @inspVerifying.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ التحقق'**
  String get inspVerifying;

  /// No description provided for @inspVerifiedOk.
  ///
  /// In ar, this message translates to:
  /// **'الملف مطابق للبصمة المسجّلة'**
  String get inspVerifiedOk;

  /// No description provided for @inspVerifiedBad.
  ///
  /// In ar, this message translates to:
  /// **'الملف لا يطابق البصمة المسجّلة'**
  String get inspVerifiedBad;

  /// No description provided for @inspAssessment.
  ///
  /// In ar, this message translates to:
  /// **'التقييم'**
  String get inspAssessment;

  /// No description provided for @inspAssessWear.
  ///
  /// In ar, this message translates to:
  /// **'استهلاك عادي'**
  String get inspAssessWear;

  /// No description provided for @inspAssessDamage.
  ///
  /// In ar, this message translates to:
  /// **'ضرر على المستأجر'**
  String get inspAssessDamage;

  /// No description provided for @inspCostSar.
  ///
  /// In ar, this message translates to:
  /// **'التكلفة (ر.س)'**
  String get inspCostSar;

  /// No description provided for @inspAssessNote.
  ///
  /// In ar, this message translates to:
  /// **'القرار لك: الشاشة لا تحكم نيابةً عنك، والمبلغ يخضع لاتفاقكما ولشروط عقد إيجار.'**
  String get inspAssessNote;

  /// No description provided for @inspNotAssessed.
  ///
  /// In ar, this message translates to:
  /// **'لم يُقيَّم بعد'**
  String get inspNotAssessed;

  /// No description provided for @inspSignAsOwner.
  ///
  /// In ar, this message translates to:
  /// **'وقّع كمالك'**
  String get inspSignAsOwner;

  /// No description provided for @inspSignAsTenant.
  ///
  /// In ar, this message translates to:
  /// **'وقّع كمستأجر'**
  String get inspSignAsTenant;

  /// No description provided for @inspSignExplain.
  ///
  /// In ar, this message translates to:
  /// **'للتوقيع نتأكد أنك أنت: أدخل ما يُثبت هويتك الآن. بعد توقيع الطرفين يُقفل الفحص ولا يمكن تعديله.'**
  String get inspSignExplain;

  /// No description provided for @inspConfirmPassword.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get inspConfirmPassword;

  /// No description provided for @inspConfirmAndSign.
  ///
  /// In ar, this message translates to:
  /// **'أكّد ووقّع'**
  String get inspConfirmAndSign;

  /// No description provided for @inspSmsCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز التحقق المرسل لجوالك'**
  String get inspSmsCode;

  /// No description provided for @inspSendCode.
  ///
  /// In ar, this message translates to:
  /// **'أرسل رمز التحقق'**
  String get inspSendCode;

  /// No description provided for @inspSignLegal.
  ///
  /// In ar, this message translates to:
  /// **'التوقيع هنا توثيق داخل راسخ، ولا يغني عن إجراءات إيجار الرسمية.'**
  String get inspSignLegal;

  /// No description provided for @inspErrGeneric.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر التوقيع. حاول مرة أخرى.'**
  String get inspErrGeneric;

  /// No description provided for @inspErrAuth.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر التحقق من هويتك. راجع البيانات وحاول مرة أخرى.'**
  String get inspErrAuth;

  /// No description provided for @inspErrRecentLoginRequired.
  ///
  /// In ar, this message translates to:
  /// **'انتهت صلاحية التحقق، أعد المحاولة.'**
  String get inspErrRecentLoginRequired;

  /// No description provided for @inspErrChecklistIncomplete.
  ///
  /// In ar, this message translates to:
  /// **'ما زالت هناك بنود بلا إجابة.'**
  String get inspErrChecklistIncomplete;

  /// No description provided for @inspErrEvidenceMissing.
  ///
  /// In ar, this message translates to:
  /// **'كل بند رديء أو تالف يحتاج صورة.'**
  String get inspErrEvidenceMissing;

  /// No description provided for @inspErrMediaHashMismatch.
  ///
  /// In ar, this message translates to:
  /// **'تغيّر أحد الملفات عن بصمته المسجّلة، ولا يمكن التوقيع.'**
  String get inspErrMediaHashMismatch;

  /// No description provided for @inspErrOwnerMustSignFirst.
  ///
  /// In ar, this message translates to:
  /// **'يوقّع المالك أولاً.'**
  String get inspErrOwnerMustSignFirst;

  /// No description provided for @inspErrAlreadySigned.
  ///
  /// In ar, this message translates to:
  /// **'وقّعت سابقاً.'**
  String get inspErrAlreadySigned;

  /// No description provided for @inspErrAlreadySealed.
  ///
  /// In ar, this message translates to:
  /// **'الفحص مقفل بتوقيع الطرفين.'**
  String get inspErrAlreadySealed;

  /// No description provided for @inspErrContentChanged.
  ///
  /// In ar, this message translates to:
  /// **'تغيّر محتوى الفحص بعد التوقيع الأول.'**
  String get inspErrContentChanged;

  /// No description provided for @inspErrMoveInNotSealed.
  ///
  /// In ar, this message translates to:
  /// **'فحص الاستلام لم يُوثَّق بعد.'**
  String get inspErrMoveInNotSealed;

  /// No description provided for @inspErrNotAParty.
  ///
  /// In ar, this message translates to:
  /// **'لست طرفاً في هذا الفحص.'**
  String get inspErrNotAParty;

  /// No description provided for @inspErrSamePerson.
  ///
  /// In ar, this message translates to:
  /// **'لا يمكن أن يوقّع الشخص نفسه بصفتين.'**
  String get inspErrSamePerson;

  /// No description provided for @inspTenantComment.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات المستأجر'**
  String get inspTenantComment;

  /// No description provided for @inspTenantCommentHint.
  ///
  /// In ar, this message translates to:
  /// **'اكتب أي اعتراض أو إضافة قبل أن توقّع.'**
  String get inspTenantCommentHint;

  /// No description provided for @inspSaveComment.
  ///
  /// In ar, this message translates to:
  /// **'احفظ الملاحظة'**
  String get inspSaveComment;

  /// No description provided for @inspCommentSaved.
  ///
  /// In ar, this message translates to:
  /// **'تم الحفظ.'**
  String get inspCommentSaved;

  /// No description provided for @inspCompareTitle.
  ///
  /// In ar, this message translates to:
  /// **'مقارنة الاستلام والتسليم'**
  String get inspCompareTitle;

  /// No description provided for @inspNoChanges.
  ///
  /// In ar, this message translates to:
  /// **'لا فروق بين الاستلام والتسليم.'**
  String get inspNoChanges;

  /// No description provided for @inspColItem.
  ///
  /// In ar, this message translates to:
  /// **'البند'**
  String get inspColItem;

  /// No description provided for @inspColBefore.
  ///
  /// In ar, this message translates to:
  /// **'عند الاستلام'**
  String get inspColBefore;

  /// No description provided for @inspColAfter.
  ///
  /// In ar, this message translates to:
  /// **'عند التسليم'**
  String get inspColAfter;

  /// No description provided for @inspMissingNow.
  ///
  /// In ar, this message translates to:
  /// **'غير مسجّل'**
  String get inspMissingNow;

  /// No description provided for @inspBetter.
  ///
  /// In ar, this message translates to:
  /// **'تحسّن'**
  String get inspBetter;

  /// No description provided for @inspDamageTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي الضرر المقدّر'**
  String get inspDamageTotal;

  /// No description provided for @inspPendingAssessment.
  ///
  /// In ar, this message translates to:
  /// **'بنود تنتظر قرارك'**
  String get inspPendingAssessment;

  /// No description provided for @inspCompareNote.
  ///
  /// In ar, this message translates to:
  /// **'تقرير توثيقي من سجلات الفحص، يُرفق مع إجراءات إيجار ولا يحلّ محلها، وليس رأياً قانونياً.'**
  String get inspCompareNote;

  /// No description provided for @inspSar.
  ///
  /// In ar, this message translates to:
  /// **'ر.س'**
  String get inspSar;

  /// No description provided for @inspRecordTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجل العقار'**
  String get inspRecordTitle;

  /// No description provided for @inspRecordEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر هنا أحداث العقار: العقود والفحوصات والمصروفات.'**
  String get inspRecordEmpty;

  /// No description provided for @inspRecordNote.
  ///
  /// In ar, this message translates to:
  /// **'السجل يُحسب من سجلاتك فلا يتعارض معها.'**
  String get inspRecordNote;

  /// No description provided for @inspEvLeaseStarted.
  ///
  /// In ar, this message translates to:
  /// **'بداية عقد'**
  String get inspEvLeaseStarted;

  /// No description provided for @inspEvLeaseEnded.
  ///
  /// In ar, this message translates to:
  /// **'نهاية عقد'**
  String get inspEvLeaseEnded;

  /// No description provided for @inspEvMoveIn.
  ///
  /// In ar, this message translates to:
  /// **'فحص استلام موثّق'**
  String get inspEvMoveIn;

  /// No description provided for @inspEvMoveOut.
  ///
  /// In ar, this message translates to:
  /// **'فحص تسليم موثّق'**
  String get inspEvMoveOut;

  /// No description provided for @inspEvExpense.
  ///
  /// In ar, this message translates to:
  /// **'مصروف'**
  String get inspEvExpense;

  /// No description provided for @inspPendingUploads.
  ///
  /// In ar, this message translates to:
  /// **'{count} صور بانتظار الرفع'**
  String inspPendingUploads(int count);

  /// No description provided for @inspPendingUploadsNote.
  ///
  /// In ar, this message translates to:
  /// **'الصور محفوظة على جوالك وتُرفع تلقائياً عند توفر الاتصال.'**
  String get inspPendingUploadsNote;

  /// No description provided for @inspRejectedUploads.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر رفع بعض الصور لأن الفحص قُفل بالتوقيع.'**
  String get inspRejectedUploads;

  /// No description provided for @inspRetryUploads.
  ///
  /// In ar, this message translates to:
  /// **'أعد المحاولة الآن'**
  String get inspRetryUploads;

  /// No description provided for @inspCameraTitle.
  ///
  /// In ar, this message translates to:
  /// **'الكاميرا'**
  String get inspCameraTitle;

  /// No description provided for @inspCloseCamera.
  ///
  /// In ar, this message translates to:
  /// **'أغلق الكاميرا'**
  String get inspCloseCamera;

  /// No description provided for @inspVerifyFailedToLoad.
  ///
  /// In ar, this message translates to:
  /// **'تعذّر تنزيل الملف للتحقق.'**
  String get inspVerifyFailedToLoad;

  /// No description provided for @inspSignIn.
  ///
  /// In ar, this message translates to:
  /// **'أدخل كلمة المرور أو الرمز لتأكيد هويتك'**
  String get inspSignIn;

  /// No description provided for @inspStartedBy.
  ///
  /// In ar, this message translates to:
  /// **'بدأه {who}'**
  String inspStartedBy(String who);

  /// No description provided for @inspRecordProperty.
  ///
  /// In ar, this message translates to:
  /// **'العقار'**
  String get inspRecordProperty;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
