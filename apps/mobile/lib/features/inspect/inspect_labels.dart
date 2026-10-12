import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';

/// `bedroom_2` → "غرفة نوم 2". Numbered rooms share one translation plus their number.
String roomLabel(AppLocalizations l, String key) {
  final (:base, :index) = splitRoomKey(key);
  final name = switch (base) {
    'entrance' => l.inspRoomEntrance,
    'living' => l.inspRoomLiving,
    'majlis' => l.inspRoomMajlis,
    'bedroom' => l.inspRoomBedroom,
    'kitchen' => l.inspRoomKitchen,
    'bathroom' => l.inspRoomBathroom,
    'balcony' => l.inspRoomBalcony,
    'yard' => l.inspRoomYard,
    'parking' => l.inspRoomParking,
    'roof' => l.inspRoomRoof,
    'meters' => l.inspRoomMeters,
    _ => base,
  };
  return index == null ? name : '$name $index';
}

String itemLabel(AppLocalizations l, String item) => switch (item) {
  'door' => l.inspItemDoor,
  'lock' => l.inspItemLock,
  'intercom' => l.inspItemIntercom,
  'floor' => l.inspItemFloor,
  'lighting' => l.inspItemLighting,
  'walls' => l.inspItemWalls,
  'ceiling' => l.inspItemCeiling,
  'windows' => l.inspItemWindows,
  'outlets' => l.inspItemOutlets,
  'ac' => l.inspItemAc,
  'doors' => l.inspItemDoors,
  'wardrobe' => l.inspItemWardrobe,
  'cabinets' => l.inspItemCabinets,
  'countertop' => l.inspItemCountertop,
  'sink' => l.inspItemSink,
  'faucet' => l.inspItemFaucet,
  'hookup' => l.inspItemHookup,
  'exhaust' => l.inspItemExhaust,
  'toilet' => l.inspItemToilet,
  'basin' => l.inspItemBasin,
  'shower' => l.inspItemShower,
  'heater' => l.inspItemHeater,
  'railing' => l.inspItemRailing,
  'fence' => l.inspItemFence,
  'gate' => l.inspItemGate,
  'ground' => l.inspItemGround,
  'waterproofing' => l.inspItemWaterproofing,
  'access' => l.inspItemAccess,
  'tank' => l.inspItemTank,
  'electricity' => l.inspItemElectricity,
  'water' => l.inspItemWater,
  'gas' => l.inspItemGas,
  _ => item,
};

String conditionLabel(AppLocalizations l, String c) => switch (c) {
  'good' => l.inspCondGood,
  'fair' => l.inspCondFair,
  'poor' => l.inspCondPoor,
  'damaged' => l.inspCondDamaged,
  _ => c,
};

String kindLabel(AppLocalizations l, String k) =>
    k == 'move_out' ? l.inspMoveOut : l.inspMoveIn;

String statusLabel(AppLocalizations l, String s) => switch (s) {
  'sealed' => l.inspStatusSealed,
  'pending_signatures' => l.inspStatusPendingSignatures,
  _ => l.inspStatusDraft,
};

/// Translates a refusal from the signInspection function; unknown codes fall back to a generic message.
String signErrorLabel(AppLocalizations l, String code) => switch (code) {
  'recent_login_required' => l.inspErrRecentLoginRequired,
  'checklist_incomplete' => l.inspErrChecklistIncomplete,
  'evidence_missing' => l.inspErrEvidenceMissing,
  'media_hash_mismatch' => l.inspErrMediaHashMismatch,
  'owner_must_sign_first' => l.inspErrOwnerMustSignFirst,
  'already_signed' => l.inspErrAlreadySigned,
  'already_sealed' => l.inspErrAlreadySealed,
  'content_changed' => l.inspErrContentChanged,
  'move_in_not_sealed' => l.inspErrMoveInNotSealed,
  'not_a_party' => l.inspErrNotAParty,
  'same_person' => l.inspErrSamePerson,
  _ => l.inspErrGeneric,
};
