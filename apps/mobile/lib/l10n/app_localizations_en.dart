// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Rasikh';

  @override
  String get tagline => 'Your property, on solid ground.';

  @override
  String get loading => 'Loading';

  @override
  String get signOut => 'Sign out';

  @override
  String get switchLanguage => 'العربية';

  @override
  String get homeHeadline =>
      'From move-in day to move-out day, everything on record.';

  @override
  String get homeSubhead =>
      'One record for your property: leases, payments, inspections, maintenance. It complements Ejar; it does not replace it.';

  @override
  String get start => 'Get started';

  @override
  String get authTitle => 'Sign in to Rasikh';

  @override
  String get authSubtitle => 'With your phone number or email.';

  @override
  String get tabPhone => 'Phone';

  @override
  String get tabEmail => 'Email';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneHint => 'Saudi number starting with 5, e.g. 5XXXXXXXX';

  @override
  String get sendCode => 'Send code';

  @override
  String get codeLabel => 'Verification code';

  @override
  String get verify => 'Verify';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get signIn => 'Sign in';

  @override
  String get createAccount => 'Create account';

  @override
  String get toCreate => 'No account? Create one';

  @override
  String get toSignIn => 'Have an account? Sign in';

  @override
  String get errInvalidPhone => 'Enter a valid Saudi mobile number.';

  @override
  String get errInvalidCode => 'The code is incorrect.';

  @override
  String get errInvalidCredentials => 'Email or password is incorrect.';

  @override
  String get errEmailInUse => 'This email is already registered.';

  @override
  String get errWeakPassword =>
      'Password is too short. Use at least 8 characters.';

  @override
  String get errTooMany => 'Too many attempts. Try again later.';

  @override
  String get errGeneric => 'Something went wrong. Please try again.';

  @override
  String get onboardingTitle => 'Tell us your role';

  @override
  String get onboardingSubtitle =>
      'Pick one or more. You can change this later.';

  @override
  String get roleOwner => 'Owner';

  @override
  String get roleTenant => 'Tenant';

  @override
  String get roleManager => 'Building manager';

  @override
  String get roleBroker => 'Broker';

  @override
  String get roleVendor => 'Technician / vendor';

  @override
  String get roleOwnerHint => 'Managing 1 to 50 units';

  @override
  String get roleTenantHint => 'An active lease';

  @override
  String get roleManagerHint => 'A building or owners association';

  @override
  String get roleBrokerHint => 'Licensed by REGA';

  @override
  String get roleVendorHint => 'Maintenance and inspection';

  @override
  String get displayName => 'Your name';

  @override
  String get orgName => 'Your portfolio or company name';

  @override
  String get consent =>
      'I agree to the processing of my personal data to operate my account, under the Personal Data Protection Law.';

  @override
  String get submitOrg => 'Create workspace';

  @override
  String get errPickRole => 'Pick at least one role.';

  @override
  String get errNeedConsent => 'Consent is required to continue.';

  @override
  String get errTooManyOrgs =>
      'You have reached the maximum number of workspaces.';

  @override
  String get errOrgGeneric =>
      'Could not create the workspace. Please try again.';

  @override
  String get workspaceTitle => 'Workspace';

  @override
  String get workspaceReady =>
      'Your workspace is ready. Your portfolio and map will appear here in later phases.';

  @override
  String get workspaceNoOrg => 'You have not created a workspace yet.';
}
