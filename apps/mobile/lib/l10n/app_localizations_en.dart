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

  @override
  String get inspTab => 'Inspections';

  @override
  String get inspTabRecord => 'Property record';

  @override
  String get inspBack => 'Back';

  @override
  String get inspStart => 'Start an inspection';

  @override
  String get inspLease => 'Lease';

  @override
  String get inspKind => 'Inspection type';

  @override
  String get inspMoveIn => 'Move-in inspection';

  @override
  String get inspMoveOut => 'Move-out inspection';

  @override
  String get inspChoose => 'Choose';

  @override
  String get inspPickLease => 'Pick the lease first.';

  @override
  String get inspNeedLease =>
      'Add a lease first to start a move-in inspection.';

  @override
  String get inspNone => 'No inspections yet.';

  @override
  String get inspBedrooms => 'Bedrooms';

  @override
  String get inspBathrooms => 'Bathrooms';

  @override
  String get inspComparedWithMoveIn =>
      'This inspection will be compared with the signed move-in.';

  @override
  String get inspNoSealedMoveIn =>
      'There is no signed move-in for this lease, so no comparison will be shown.';

  @override
  String get inspSaveFailed => 'Could not save. Try again.';

  @override
  String get inspUploadFailed => 'Could not upload the photo. Try again.';

  @override
  String get inspStatusDraft => 'Draft';

  @override
  String get inspStatusPendingSignatures => 'Waiting for signatures';

  @override
  String get inspStatusSealed => 'Signed and locked';

  @override
  String inspProgress(int done, int total) {
    return '$done of $total items';
  }

  @override
  String get inspPartyOwner => 'Owner';

  @override
  String get inspPartyTenant => 'Tenant';

  @override
  String get inspSigned => 'Signed';

  @override
  String get inspNotSigned => 'Not signed yet';

  @override
  String get inspSealedNote =>
      'Both parties have signed and the inspection can no longer change. Content fingerprint:';

  @override
  String get inspFinishFirst => 'Answer every item before signing.';

  @override
  String get inspWaitingTenant =>
      'You have signed. Waiting for the tenant to sign.';

  @override
  String get inspComplementsEjar =>
      'This inspection complements Ejar\'s official handover form; it does not replace it.';

  @override
  String get inspRoomEntrance => 'Entrance';

  @override
  String get inspRoomLiving => 'Living room';

  @override
  String get inspRoomMajlis => 'Majlis';

  @override
  String get inspRoomBedroom => 'Bedroom';

  @override
  String get inspRoomKitchen => 'Kitchen';

  @override
  String get inspRoomBathroom => 'Bathroom';

  @override
  String get inspRoomBalcony => 'Balcony';

  @override
  String get inspRoomYard => 'Yard';

  @override
  String get inspRoomParking => 'Parking';

  @override
  String get inspRoomRoof => 'Roof';

  @override
  String get inspRoomMeters => 'Meters';

  @override
  String get inspItemDoor => 'Door';

  @override
  String get inspItemLock => 'Lock';

  @override
  String get inspItemIntercom => 'Intercom';

  @override
  String get inspItemFloor => 'Floor';

  @override
  String get inspItemLighting => 'Lighting';

  @override
  String get inspItemWalls => 'Walls';

  @override
  String get inspItemCeiling => 'Ceiling';

  @override
  String get inspItemWindows => 'Windows';

  @override
  String get inspItemOutlets => 'Outlets';

  @override
  String get inspItemAc => 'Air conditioner';

  @override
  String get inspItemDoors => 'Doors';

  @override
  String get inspItemWardrobe => 'Wardrobe';

  @override
  String get inspItemCabinets => 'Cabinets';

  @override
  String get inspItemCountertop => 'Countertop';

  @override
  String get inspItemSink => 'Sink';

  @override
  String get inspItemFaucet => 'Faucet';

  @override
  String get inspItemHookup => 'Gas or electric hookup';

  @override
  String get inspItemExhaust => 'Exhaust fan';

  @override
  String get inspItemToilet => 'Toilet';

  @override
  String get inspItemBasin => 'Basin';

  @override
  String get inspItemShower => 'Shower';

  @override
  String get inspItemHeater => 'Water heater';

  @override
  String get inspItemRailing => 'Railing';

  @override
  String get inspItemFence => 'Fence';

  @override
  String get inspItemGate => 'Gate';

  @override
  String get inspItemGround => 'Outdoor ground';

  @override
  String get inspItemWaterproofing => 'Waterproofing';

  @override
  String get inspItemAccess => 'Roof access';

  @override
  String get inspItemTank => 'Water tank';

  @override
  String get inspItemElectricity =>
      'Electricity meter (write the reading in the note)';

  @override
  String get inspItemWater => 'Water meter (write the reading in the note)';

  @override
  String get inspItemGas => 'Gas meter (write the reading in the note)';

  @override
  String get inspCondGood => 'Good';

  @override
  String get inspCondFair => 'Fair';

  @override
  String get inspCondPoor => 'Poor';

  @override
  String get inspCondDamaged => 'Damaged';

  @override
  String get inspCondition => 'Condition';

  @override
  String get inspNote => 'Note';

  @override
  String get inspNotAnswered => 'No condition recorded';

  @override
  String inspWasAtMoveIn(String cond) {
    return 'At move-in: $cond';
  }

  @override
  String get inspAllGood => 'Whole room is in good condition';

  @override
  String get inspRoomPhoto => 'Room photo';

  @override
  String get inspPhoto => 'Photo';

  @override
  String inspPhotoOf(String what) {
    return 'Photo: $what';
  }

  @override
  String get inspCapture => 'Take the photo';

  @override
  String get inspCameraDenied =>
      'We could not open the camera. Allow camera access in the browser settings and try again.';

  @override
  String get inspCaptureNote =>
      'The photo is stamped with its time, location and SHA-256 at the moment of capture. Photos cannot be uploaded from the gallery.';

  @override
  String get inspEvidenceAlt => 'Inspection photo';

  @override
  String get inspHasGps => 'Location recorded';

  @override
  String get inspNoGps => 'No location';

  @override
  String get inspVerify => 'Check file integrity';

  @override
  String get inspVerifying => 'Checking';

  @override
  String get inspVerifiedOk => 'The file matches its recorded fingerprint';

  @override
  String get inspVerifiedBad =>
      'The file does not match its recorded fingerprint';

  @override
  String get inspAssessment => 'Assessment';

  @override
  String get inspAssessWear => 'Normal wear';

  @override
  String get inspAssessDamage => 'Damage the tenant answers for';

  @override
  String get inspCostSar => 'Cost (SAR)';

  @override
  String get inspAssessNote =>
      'The decision is yours: the screen never judges for you, and the amount depends on your agreement and the Ejar contract terms.';

  @override
  String get inspNotAssessed => 'Not assessed yet';

  @override
  String get inspSignAsOwner => 'Sign as owner';

  @override
  String get inspSignAsTenant => 'Sign as tenant';

  @override
  String get inspSignExplain =>
      'To sign we confirm it is you: provide your proof of identity now. Once both parties sign, the inspection is locked and cannot be edited.';

  @override
  String get inspConfirmPassword => 'Password';

  @override
  String get inspConfirmAndSign => 'Confirm and sign';

  @override
  String get inspSmsCode => 'Verification code sent to your phone';

  @override
  String get inspSendCode => 'Send verification code';

  @override
  String get inspSignLegal =>
      'Signing here documents the inspection inside Rasikh; it does not replace the official Ejar procedures.';

  @override
  String get inspErrGeneric => 'Could not sign. Try again.';

  @override
  String get inspErrAuth =>
      'We could not verify your identity. Check the details and try again.';

  @override
  String get inspErrRecentLoginRequired =>
      'The verification expired, try again.';

  @override
  String get inspErrChecklistIncomplete => 'Some items still have no answer.';

  @override
  String get inspErrEvidenceMissing =>
      'Every poor or damaged item needs a photo.';

  @override
  String get inspErrMediaHashMismatch =>
      'A file no longer matches its recorded fingerprint, so signing is blocked.';

  @override
  String get inspErrOwnerMustSignFirst => 'The owner signs first.';

  @override
  String get inspErrAlreadySigned => 'You have already signed.';

  @override
  String get inspErrAlreadySealed =>
      'The inspection is locked by both signatures.';

  @override
  String get inspErrContentChanged =>
      'The inspection changed after the first signature.';

  @override
  String get inspErrMoveInNotSealed =>
      'The move-in inspection is not signed yet.';

  @override
  String get inspErrNotAParty => 'You are not a party to this inspection.';

  @override
  String get inspErrSamePerson => 'One person cannot sign as both parties.';

  @override
  String get inspTenantComment => 'Tenant\'s comments';

  @override
  String get inspTenantCommentHint =>
      'Write any objection or addition before you sign.';

  @override
  String get inspSaveComment => 'Save comment';

  @override
  String get inspCommentSaved => 'Saved.';

  @override
  String get inspCompareTitle => 'Move-in vs move-out';

  @override
  String get inspNoChanges => 'No differences between move-in and move-out.';

  @override
  String get inspColItem => 'Item';

  @override
  String get inspColBefore => 'At move-in';

  @override
  String get inspColAfter => 'At move-out';

  @override
  String get inspMissingNow => 'Not recorded';

  @override
  String get inspBetter => 'improved';

  @override
  String get inspDamageTotal => 'Estimated damage total';

  @override
  String get inspPendingAssessment => 'Items waiting for your decision';

  @override
  String get inspCompareNote =>
      'A documentation report built from the inspection records. Attach it alongside the Ejar procedures; it does not replace them and is not legal advice.';

  @override
  String get inspSar => 'SAR';

  @override
  String get inspRecordTitle => 'Property record';

  @override
  String get inspRecordEmpty =>
      'The property\'s events will appear here: leases, inspections and expenses.';

  @override
  String get inspRecordNote =>
      'The record is computed from your own records, so it can never contradict them.';

  @override
  String get inspEvLeaseStarted => 'Lease started';

  @override
  String get inspEvLeaseEnded => 'Lease ended';

  @override
  String get inspEvMoveIn => 'Signed move-in inspection';

  @override
  String get inspEvMoveOut => 'Signed move-out inspection';

  @override
  String get inspEvExpense => 'Expense';

  @override
  String inspPendingUploads(int count) {
    return '$count photos waiting to upload';
  }

  @override
  String get inspPendingUploadsNote =>
      'Photos are kept on your phone and upload automatically when you are online.';

  @override
  String get inspRejectedUploads =>
      'Some photos could not be uploaded because the inspection was already signed.';

  @override
  String get inspRetryUploads => 'Retry now';

  @override
  String get inspCameraTitle => 'Camera';

  @override
  String get inspCloseCamera => 'Close camera';

  @override
  String get inspVerifyFailedToLoad =>
      'Could not download the file to check it.';

  @override
  String get inspSignIn =>
      'Enter your password or code to confirm your identity';

  @override
  String inspStartedBy(String who) {
    return 'Started by $who';
  }

  @override
  String get inspRecordProperty => 'Property';

  @override
  String get mtTab => 'Maintenance';

  @override
  String get mtNew => 'New maintenance request';

  @override
  String get mtUnit => 'Unit';

  @override
  String get mtTitle => 'Title';

  @override
  String get mtCategory => 'Category';

  @override
  String get mtUrgency => 'Urgency';

  @override
  String get mtDescription => 'Describe the problem';

  @override
  String get mtPhoto => 'Photo (optional)';

  @override
  String get mtSubmit => 'Send request';

  @override
  String get mtNone => 'No maintenance requests.';

  @override
  String get mtBack => 'Back';

  @override
  String get mtRequired => 'Write a title of at least 3 characters.';

  @override
  String get mtNeedLease => 'No lease is linked to your account.';

  @override
  String get mtFailed => 'Could not complete the request. Try again.';

  @override
  String get mtCatConsumables => 'Consumables (bulbs, filters…)';

  @override
  String get mtCatTenantDamage => 'Damage from use';

  @override
  String get mtCatPlumbing => 'Plumbing';

  @override
  String get mtCatElectrical => 'Electrical';

  @override
  String get mtCatAc => 'Air conditioning';

  @override
  String get mtCatAppliance => 'Appliances';

  @override
  String get mtCatStructure => 'Structural';

  @override
  String get mtCatPest => 'Pests';

  @override
  String get mtCatOther => 'Other';

  @override
  String get mtUrgLow => 'Low';

  @override
  String get mtUrgNormal => 'Normal';

  @override
  String get mtUrgUrgent => 'Urgent';

  @override
  String get mtUrgEmergency => 'Emergency';

  @override
  String get mtStOpen => 'Open';

  @override
  String get mtStAssigned => 'Assigned to a vendor';

  @override
  String get mtStInProgress => 'In progress';

  @override
  String get mtStResolved => 'Fixed';

  @override
  String get mtStClosed => 'Closed';

  @override
  String get mtStCancelled => 'Cancelled';

  @override
  String get mtSlaMet => 'Handled within target';

  @override
  String get mtSlaOk => 'Within target time';

  @override
  String get mtSlaDueSoon => 'Target time is close';

  @override
  String get mtSlaBreached => 'Past target time';

  @override
  String get mtSuggestTenant => 'Suggested: the tenant.';

  @override
  String get mtSuggestOwner => 'Suggested: the owner.';

  @override
  String get mtSuggestNote =>
      'A guideline based on Ejar\'s general guidance; you two decide, and it is not legal advice.';

  @override
  String get mtVendor => 'Vendor';

  @override
  String get mtVendorPhone => 'Vendor phone';

  @override
  String get mtAssign => 'Assign';

  @override
  String get mtStart => 'Work started';

  @override
  String get mtResolution => 'Repair note';

  @override
  String get mtResolve => 'Mark fixed';

  @override
  String get mtRating => 'Rating (out of 5)';

  @override
  String get mtCloseRate => 'Close and rate';

  @override
  String get mtClose => 'Close request';

  @override
  String get mtCancel => 'Cancel request';

  @override
  String mtRated(int n) {
    return 'Rating: $n of 5';
  }

  @override
  String get bdTab => 'Buildings and associations';

  @override
  String get bdMullak =>
      'Bookkeeping aids for running the association; they complement the official Mullak platform and are not an official registration.';

  @override
  String get bdAddBuilding => 'Add a building';

  @override
  String get bdBuildingName => 'Building name';

  @override
  String get bdBuilding => 'Building';

  @override
  String get bdNone => 'No buildings yet.';

  @override
  String get bdFailed => 'Could not save. Check the details and try again.';

  @override
  String get bdMembers => 'Owners and units';

  @override
  String get bdAddMember => 'Add an owner';

  @override
  String get bdOwnerName => 'Owner name';

  @override
  String get bdUnitLabel => 'Unit';

  @override
  String get bdSharePct => 'Share of expenses (%)';

  @override
  String bdSharesWarn(String pct) {
    return 'Shares add up to $pct%, not 100%.';
  }

  @override
  String get bdExpenses => 'Shared expenses';

  @override
  String get bdAddExpense => 'Add an expense';

  @override
  String get bdExpenseTitle => 'Description';

  @override
  String get bdAmount => 'Amount (SAR)';

  @override
  String get bdDate => 'Date';

  @override
  String get bdReceipt => 'Receipt (required)';

  @override
  String get bdReceiptRequired => 'Attach the expense receipt.';

  @override
  String get bdBalances => 'Owner balances';

  @override
  String get bdOwed => 'Owed';

  @override
  String get bdPaid => 'Paid';

  @override
  String get bdRemaining => 'Remaining';

  @override
  String get bdAddContribution => 'Record a payment';

  @override
  String get bdRecordsOnly =>
      'We only record payments; we never receive money.';

  @override
  String get bdQuotes => 'Quote comparison';

  @override
  String get bdAddQuote => 'Add a quote';

  @override
  String get bdQuoteFor => 'Quote for';

  @override
  String get bdVendor => 'Vendor';

  @override
  String get bdCheapest => 'cheapest';

  @override
  String get bdVotes => 'Votes';

  @override
  String get bdAddVote => 'Create a vote';

  @override
  String get bdVoteTitle => 'Vote subject';

  @override
  String get bdRule => 'Approval threshold';

  @override
  String get bdRuleMajority => 'Majority (more than half)';

  @override
  String get bdRuleThreeQuarters => '75% or more';

  @override
  String get bdRuleNote =>
      'One vote per unit; the threshold is the association\'s own choice, not legal advice.';

  @override
  String get bdYes => 'Yes';

  @override
  String get bdNo => 'No';

  @override
  String get bdAbstain => 'Abstain';

  @override
  String get bdMissing => 'Not voted';

  @override
  String get bdVotePassed => 'Passed';

  @override
  String get bdVoteFailed => 'Failed';

  @override
  String get bdVoteOpen => 'Open';

  @override
  String get bdCloseVote => 'Close the vote';

  @override
  String get bdMonth => 'Month';

  @override
  String get bdPrint => 'Print or save as PDF';

  @override
  String get bdStatement => 'Monthly association statement';

  @override
  String get bdStExpenses => 'Expenses';

  @override
  String get bdStContributions => 'Recorded payments';

  @override
  String get bdStNet => 'Net';

  @override
  String get bdSar => 'SAR';

  @override
  String get bdPickReceipt => 'Choose the receipt photo';
}
