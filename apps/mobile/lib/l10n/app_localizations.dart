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
