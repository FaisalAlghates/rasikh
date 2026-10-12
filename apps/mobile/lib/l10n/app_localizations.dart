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
