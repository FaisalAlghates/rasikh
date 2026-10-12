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

  @override
  String get next => 'Next';

  @override
  String get skip => 'Skip';

  @override
  String get intro1Title => 'Everything on record';

  @override
  String get intro1Body =>
      'From move-in day to move-out day: your lease, payments and the unit\'s condition in one record.';

  @override
  String get intro2Title => 'Photos and sign-off';

  @override
  String get intro2Body =>
      'Document the unit room by room, each photo stamped with time and place, signed by both parties.';

  @override
  String get intro3Title => 'Complements Ejar';

  @override
  String get intro3Body =>
      'It does not replace Ejar contracts, deposits or the official handover form. It documents what surrounds them.';

  @override
  String get navHome => 'Home';

  @override
  String get navMap => 'Map';

  @override
  String get navRecord => 'Record';

  @override
  String get navProfile => 'Profile';

  @override
  String get navLabel => 'Main navigation';

  @override
  String get mapSoonTitle => 'Map coming soon';

  @override
  String get mapSoonBody => 'Your properties will appear here on a 3D map.';

  @override
  String get recordSample => 'Illustrative example';

  @override
  String get recordEmptyTitle => 'Property record';

  @override
  String get recordEv1 => 'Unit handover';

  @override
  String get recordEv1Detail =>
      'Room-by-room inspection, signed by owner and tenant.';

  @override
  String get recordEv2 => 'Air-conditioning repair';

  @override
  String get recordEv2Detail => 'Ticket closed with before and after photos.';

  @override
  String get recordEv3 => 'Lease renewal notice';

  @override
  String get recordEv3Detail =>
      'Reminder to both parties sixty days before the lease ends.';

  @override
  String get profileTitle => 'Profile';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeLight => 'Light';

  @override
  String get themeToggle => 'Toggle theme';

  @override
  String get galleryTitle => 'Component gallery';

  @override
  String get gButtons => 'Buttons';

  @override
  String get gPrimary => 'Primary';

  @override
  String get gQuiet => 'Quiet';

  @override
  String get gGhost => 'Ghost';

  @override
  String get gLoading => 'Saving';

  @override
  String get gFields => 'Fields';

  @override
  String get gFieldLabel => 'Unit name';

  @override
  String get gFieldHint => 'e.g. Flat 3';

  @override
  String get gFieldError => 'This field is required';

  @override
  String get gSelectLabel => 'Unit type';

  @override
  String get gSelectPlaceholder => 'Choose a type';

  @override
  String get gStudio => 'Studio';

  @override
  String get gApartment => 'Apartment';

  @override
  String get gVilla => 'Villa';

  @override
  String get gOverlays => 'Overlays';

  @override
  String get gOpenDialog => 'Open dialog';

  @override
  String get gDialogTitle => 'Confirm action';

  @override
  String get gDialogBody => 'No record changes until you press confirm.';

  @override
  String get gConfirm => 'Confirm';

  @override
  String get gOpenSheet => 'Open sheet';

  @override
  String get gSheetTitle => 'Filter properties';

  @override
  String get gShowToast => 'Show a toast';

  @override
  String get gToastMsg => 'Changes saved';

  @override
  String get gTabs => 'Tabs';

  @override
  String get gTabsLabel => 'View';

  @override
  String get gTabA => 'Units';

  @override
  String get gTabB => 'Leases';

  @override
  String get gCards => 'Cards';

  @override
  String get gStatRent => 'Rent this month';

  @override
  String get gStatNote => 'Sample values';

  @override
  String get gPropTitle => 'Flat 3, Al Nakheel Building';

  @override
  String get gPropPlace => 'Riyadh, Al Malqa';

  @override
  String get gPropMeta => 'Annual rent: SAR 42,000';

  @override
  String get gStatusOk => 'Paid';

  @override
  String get gStatusLate => 'Late';

  @override
  String get gEmpty => 'Empty and loading states';

  @override
  String get gEmptyTitle => 'No units yet';

  @override
  String get gEmptyBody => 'Add your first unit to start the record.';

  @override
  String get gAddUnit => 'Add unit';

  @override
  String get gGlass => 'Glass: only for controls floating over a map';

  @override
  String get gGlassSample => 'Search a district or property';

  @override
  String get gArch => 'Najdi arch · Shurfa';

  @override
  String get opsTabOverview => 'Overview';

  @override
  String get opsTabProperties => 'Properties & units';

  @override
  String get opsTabLeases => 'Leases & payments';

  @override
  String get opsTabExpenses => 'Expenses';

  @override
  String get opsTabReport => 'Annual report';

  @override
  String get opsTabMyLease => 'My lease';

  @override
  String get opsUnits => 'Units';

  @override
  String get opsActiveLeases => 'Active leases';

  @override
  String get opsCollected => 'Collected this year';

  @override
  String get opsOutstanding => 'Outstanding';

  @override
  String get opsUpcoming => 'Upcoming payments';

  @override
  String get opsNoUpcoming => 'No upcoming payments.';

  @override
  String get opsNotifications => 'Alerts';

  @override
  String get opsNoNotifications => 'No alerts.';

  @override
  String get opsName => 'Name';

  @override
  String get opsCity => 'City';

  @override
  String get opsDistrict => 'District';

  @override
  String get opsKindBuilding => 'Building';

  @override
  String get opsKindVilla => 'Villa';

  @override
  String get opsAddProperty => 'Add property';

  @override
  String get opsNoProperties => 'No properties yet.';

  @override
  String get opsAddUnit => 'Add unit';

  @override
  String get opsUnitLabel => 'Unit number or name';

  @override
  String get opsTypeStudio => 'Studio';

  @override
  String get opsTypeApartment => 'Apartment';

  @override
  String get opsTypeVilla => 'Villa';

  @override
  String get opsNoUnits => 'No units.';

  @override
  String get opsAddLease => 'Add lease';

  @override
  String get opsEjarNo => 'Ejar contract number';

  @override
  String get opsEjarHint =>
      'We store the number for reference; the contract itself stays in Ejar.';

  @override
  String get opsTenantName => 'Tenant name';

  @override
  String get opsTenantEmail => 'Tenant email (for the invite)';

  @override
  String get opsStartDate => 'Lease start';

  @override
  String get opsEndDate => 'Lease end';

  @override
  String get opsAnnualRent => 'Annual rent (SAR)';

  @override
  String get opsCycle => 'Payment cycle';

  @override
  String get opsMonthly => 'Monthly';

  @override
  String get opsQuarterly => 'Quarterly';

  @override
  String get opsSemiannual => 'Semi-annual';

  @override
  String get opsAnnual => 'Annual';

  @override
  String get opsDeposit => 'Deposit amount (information only)';

  @override
  String get opsDepositNote =>
      'The deposit is held through Ejar; we never receive money.';

  @override
  String get opsPreviousRent => 'Previous rent (for a renewal)';

  @override
  String opsFreezeWarn(String max) {
    return 'Heads-up: rent increases on Riyadh contracts are currently frozen. The usual renewal ceiling is SAR $max.';
  }

  @override
  String get opsFreezeNote =>
      'Indicative only, not legal advice. Check with Ejar or a licensed professional.';

  @override
  String get opsSaveLease => 'Save lease and create schedule';

  @override
  String get opsLeaseSaved => 'Lease and payment schedule saved.';

  @override
  String get opsSchedule => 'Payment schedule';

  @override
  String get opsDueDate => 'Due';

  @override
  String get opsAmount => 'Amount';

  @override
  String get opsStatus => 'Status';

  @override
  String get opsStatusDue => 'Due';

  @override
  String get opsStatusPaid => 'Paid';

  @override
  String get opsStatusLate => 'Late';

  @override
  String get opsMarkPaid => 'Record payment';

  @override
  String get opsNoLeases => 'No leases.';

  @override
  String opsRenewalNotice(String date) {
    return 'Renewal notice by $date';
  }

  @override
  String get opsInviteTenant => 'Invite tenant';

  @override
  String get opsInviteLinked => 'Tenant linked to the lease.';

  @override
  String get opsInvitePending =>
      'Invite sent; it activates when they sign in with this verified email.';

  @override
  String get opsRecordsOnly =>
      'We only record payments; we do not receive money or finance rent.';

  @override
  String get opsAddExpense => 'Add expense';

  @override
  String get opsCategory => 'Category';

  @override
  String get opsCatMaintenance => 'Maintenance';

  @override
  String get opsCatUtilities => 'Utilities';

  @override
  String get opsCatInsurance => 'Insurance';

  @override
  String get opsCatFees => 'Fees';

  @override
  String get opsCatOther => 'Other';

  @override
  String get opsDate => 'Date';

  @override
  String get opsNote => 'Note';

  @override
  String get opsNoExpenses => 'No expenses.';

  @override
  String get opsProperty => 'Property';

  @override
  String get opsReportTitle => 'Annual income and expense report';

  @override
  String get opsYear => 'Year';

  @override
  String get opsExpected => 'Expected';

  @override
  String get opsExpenses => 'Expenses';

  @override
  String get opsNet => 'Net';

  @override
  String get opsReportNote =>
      'An indicative report from your records, not an accounting or legal document.';

  @override
  String get opsAddToCalendar => 'Add to calendar';

  @override
  String get opsCalPayment => 'Rent payment';

  @override
  String get opsCalLeaseEnd => 'Lease end';

  @override
  String get opsCalRenewal => 'Renewal notice';

  @override
  String get opsNUpcoming => 'Payment due soon';

  @override
  String get opsNLate => 'Payment overdue';

  @override
  String get opsNExpiring => 'Lease ending soon';

  @override
  String get opsNRenewal => 'Time for the renewal notice';

  @override
  String opsDaysLeft(int count) {
    return '$count days';
  }

  @override
  String get opsSave => 'Save';

  @override
  String get opsSaving => 'Saving';

  @override
  String get opsErrorGeneric => 'Could not save. Please try again.';

  @override
  String get opsRequired => 'This field is required';

  @override
  String get opsSar => 'SAR';

  @override
  String get opsChoose => 'Choose';

  @override
  String get opsCalendarNote =>
      'A free calendar file: your payments and lease dates show up in your phone calendar with alerts.';

  @override
  String get opsRemindersFree =>
      'Reminders are computed from your records and shown here for free; you can also add them to your phone calendar.';

  @override
  String get opsBack => 'Back';

  @override
  String get opsOpenLease => 'Open lease';

  @override
  String opsLeaseOf(String unit) {
    return 'Lease $unit';
  }

  @override
  String get opsHomeStaffHint => 'Your portfolio summary and alerts.';

  @override
  String opsPaidOn(String date) {
    return 'Paid on $date';
  }

  @override
  String get opsChooseUnit => 'Pick a unit to add a lease';

  @override
  String get opsInvalidDate => 'Write the date like 2026-01-31';

  @override
  String get opsInvalidEjar =>
      'Ejar contract number: 6 to 30 letters or digits';

  @override
  String get opsInvalidAmount => 'Enter a valid amount above zero';

  @override
  String get opsEndBeforeStart => 'The lease must end after it starts';

  @override
  String get opsCalendarFailed => 'Could not prepare the calendar file.';

  @override
  String get opsLoadFailed =>
      'Could not load your data. Check the connection and try again.';

  @override
  String get opsPickDate => 'Pick a date';

  @override
  String get opsInvitedAgain => 'Invitation sent.';

  @override
  String get opsTenantLabel => 'Tenant';

  @override
  String get opsInvalidEmail => 'Enter a valid email address';
}
