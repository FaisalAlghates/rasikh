import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/inspection_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/evidence_queue.dart';
import '../../data/inspection_models.dart';
import '../../data/ops_models.dart' show Doc;
import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'compare_report.dart';
import 'evidence_thumb.dart';
import 'inspect_labels.dart';
import 'sign_sheet.dart';

/// One inspection: room-by-room checklist, in-app photos with hash/time/GPS, and the two-party sign-off.
/// Staff edit while it is a draft; the tenant reviews, comments and signs; once sealed nothing changes.
class InspectionScreen extends ConsumerStatefulWidget {
  const InspectionScreen({super.key, required this.inspectionId});
  final String inspectionId;

  @override
  ConsumerState<InspectionScreen> createState() => _InspectionScreenState();
}

class _InspectionScreenState extends ConsumerState<InspectionScreen> {
  final _open = <String>{};
  bool _seeded = false;

  Future<void> _capture(OpsScope scope, String room, String? item) async {
    final photo = await ref.read(evidenceCameraProvider).capture(context);
    if (photo == null) return;
    await ref
        .read(evidenceQueueProvider)
        .enqueue(
          photo: photo,
          orgId: scope.orgId,
          inspectionId: widget.inspectionId,
          room: room,
          item: item,
          uid: scope.uid,
        );
  }

  Future<void> _save(OpsScope scope, InspectionItem item) async {
    final l10n = AppLocalizations.of(context);
    try {
      await ref
          .read(inspectionRepositoryProvider)
          .saveItem(scope.orgId, widget.inspectionId, item);
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.inspSaveFailed, tone: RkToastTone.danger);
      }
    }
  }

  Future<void> _sign(OpsScope scope, {required bool asOwner}) async {
    final l10n = AppLocalizations.of(context);
    final r = await showSignSheet(
      context,
      orgId: scope.orgId,
      inspectionId: widget.inspectionId,
      asOwner: asOwner,
    );
    if (r != null && mounted) {
      showRkToast(
        context,
        r.sealed ? l10n.inspStatusSealed : l10n.inspWaitingTenant,
        tone: RkToastTone.success,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final found = ref
        .watch(inspectionsProvider)
        .value
        ?.where((i) => i.id == widget.inspectionId)
        .firstOrNull;
    if (scope == null || found == null) {
      return SubPage(
        title: l10n.inspTab,
        children: const [Skeleton(height: 120)],
      );
    }
    final insp = found.data;
    final at = (orgId: scope.orgId, id: found.id);
    final items =
        ref.watch(inspectionItemsProvider(at)).value ??
        const <Doc<InspectionItem>>[];
    final media =
        ref.watch(inspectionMediaProvider(at)).value ??
        const <Doc<EvidenceMeta>>[];
    final moveIn = insp.moveInId == null
        ? const <Doc<InspectionItem>>[]
        : ref
                  .watch(
                    inspectionItemsProvider((
                      orgId: scope.orgId,
                      id: insp.moveInId!,
                    )),
                  )
                  .value ??
              const <Doc<InspectionItem>>[];
    final lease = ref
        .watch(opsDataProvider)
        .value
        ?.leases
        .where((l) => l.id == insp.leaseId)
        .firstOrNull
        ?.data;
    final leaseLabel = [
      lease?.propertyName,
      lease?.unitLabel,
    ].where((s) => s != null && s.isNotEmpty).join(' · ');
    final queue = ref.watch(evidenceQueueProvider);

    if (!_seeded && insp.rooms.isNotEmpty) {
      _seeded = true;
      _open.add(insp.rooms.first);
    }

    final editable = scope.staff && insp.isDraft;
    final itemMap = {for (final d in items) d.id: d.data};
    final beforeMap = {for (final d in moveIn) d.id: d.data};
    final total = insp.totalItems;
    final answered = items.length;
    final complete = answered >= total;

    return SubPage(
      title: '${kindLabel(l10n, insp.kind)} · $leaseLabel',
      children: [
        _StatusCard(
          inspection: insp,
          answered: answered,
          total: total,
          complete: complete,
          staff: scope.staff,
          onSignOwner: () => _sign(scope, asOwner: true),
          onSignTenant: () => _sign(scope, asOwner: false),
        ),
        if (scope.staff)
          ValueListenableBuilder<List<PendingEvidence>>(
            valueListenable: queue.pending,
            builder: (context, list, _) {
              final mine = list.where((e) => e.inspectionId == found.id).length;
              return Column(
                children: [
                  if (mine > 0)
                    RkCard(
                      child: Column(
                        key: const Key('pendingUploads'),
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.inspPendingUploads(mine),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l10n.inspPendingUploadsNote,
                            style: TextStyle(fontSize: 13, color: t.textMuted),
                          ),
                          const SizedBox(height: 12),
                          RkButton(
                            key: const Key('retryUploads'),
                            label: l10n.inspRetryUploads,
                            variant: RkButtonVariant.quiet,
                            onPressed: queue.flush,
                          ),
                        ],
                      ),
                    ),
                  ValueListenableBuilder<int>(
                    valueListenable: queue.rejected,
                    builder: (_, n, _) => n == 0
                        ? const SizedBox.shrink()
                        : Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              l10n.inspRejectedUploads,
                              key: const Key('rejectedUploads'),
                              style: TextStyle(color: t.danger, fontSize: 14),
                            ),
                          ),
                  ),
                ],
              );
            },
          ),
        for (final room in insp.rooms)
          ValueListenableBuilder<List<PendingEvidence>>(
            valueListenable: queue.pending,
            builder: (context, pending, _) => _RoomCard(
              key: Key('room-$room'),
              room: room,
              expanded: _open.contains(room),
              onToggle: () => setState(() {
                if (!_open.add(room)) _open.remove(room);
              }),
              kind: insp.kind,
              editable: editable,
              itemMap: itemMap,
              beforeMap: beforeMap,
              media: media.map((m) => m.data).toList(),
              pending: pending
                  .where((p) => p.inspectionId == found.id)
                  .toList(),
              onSave: (item) => _save(scope, item),
              onCapture: (item) => _capture(scope, room, item),
            ),
          ),
        _TenantComment(
          orgId: scope.orgId,
          inspectionId: found.id,
          inspection: insp,
          staff: scope.staff,
        ),
        if (insp.kind == 'move_out' && insp.moveInId != null)
          CompareReport(
            inspection: insp,
            leaseLabel: leaseLabel,
            moveIn: [for (final d in moveIn) d.data],
            moveOut: [for (final d in items) d.data],
          ),
      ],
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.inspection,
    required this.answered,
    required this.total,
    required this.complete,
    required this.staff,
    required this.onSignOwner,
    required this.onSignTenant,
  });
  final InspectionDoc inspection;
  final int answered, total;
  final bool complete, staff;
  final VoidCallback onSignOwner, onSignTenant;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final sealed = inspection.isSealed;

    Widget party(String label, SignatureInfo? sig, Key key) => Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(
        '$label: ${sig == null ? l10n.inspNotSigned : '${l10n.inspSigned} · ${riyadhDay(sig.at) ?? ''}'}',
        key: key,
        style: TextStyle(
          fontSize: 14,
          color: sig == null ? t.textMuted : t.success,
        ),
      ),
    );

    return RkCard(
      child: Column(
        key: const Key('signPanel'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusDot(
                status: sealed ? RkStatus.ok : RkStatus.warn,
                label: statusLabel(l10n, inspection.status),
              ),
              const Spacer(),
              Text(
                l10n.inspProgress(answered, total),
                key: const Key('progress'),
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          party(
            l10n.inspPartyOwner,
            inspection.ownerSignature,
            const Key('signedOwner'),
          ),
          party(
            l10n.inspPartyTenant,
            inspection.tenantSignature,
            const Key('signedTenant'),
          ),
          if (sealed && inspection.digest != null) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.verified_user_outlined, size: 18, color: t.success),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${l10n.inspSealedNote} ${inspection.digest!.substring(0, 16)}…',
                    key: const Key('sealedNote'),
                    style: TextStyle(fontSize: 13, color: t.textMuted),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          if (staff && inspection.isDraft)
            RkButton(
              key: const Key('signOwner'),
              label: l10n.inspSignAsOwner,
              onPressed: complete ? onSignOwner : null,
            ),
          if (staff && inspection.isDraft && !complete)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l10n.inspFinishFirst,
                key: const Key('finishFirst'),
                style: TextStyle(fontSize: 13, color: t.textMuted),
              ),
            ),
          if (!staff &&
              inspection.status == 'pending_signatures' &&
              inspection.tenantSignature == null)
            RkButton(
              key: const Key('signTenant'),
              label: l10n.inspSignAsTenant,
              onPressed: onSignTenant,
            ),
          if (staff && inspection.status == 'pending_signatures')
            Text(
              l10n.inspWaitingTenant,
              style: TextStyle(fontSize: 13, color: t.textMuted),
            ),
          const SizedBox(height: 10),
          Text(
            l10n.inspComplementsEjar,
            style: TextStyle(fontSize: 13, color: t.textMuted),
          ),
        ],
      ),
    );
  }
}

class _RoomCard extends StatefulWidget {
  const _RoomCard({
    super.key,
    required this.room,
    required this.expanded,
    required this.onToggle,
    required this.kind,
    required this.editable,
    required this.itemMap,
    required this.beforeMap,
    required this.media,
    required this.pending,
    required this.onSave,
    required this.onCapture,
  });
  final String room, kind;
  final bool expanded, editable;
  final VoidCallback onToggle;
  final Map<String, InspectionItem> itemMap, beforeMap;
  final List<EvidenceMeta> media;
  final List<PendingEvidence> pending;
  final Future<void> Function(InspectionItem) onSave;
  final Future<void> Function(String? item) onCapture;

  @override
  State<_RoomCard> createState() => _RoomCardState();
}

class _RoomCardState extends State<_RoomCard> {
  bool _busy = false;

  Future<void> _allGood() async {
    setState(() => _busy = true);
    try {
      for (final k in itemsOfRoom(widget.room)) {
        if (!widget.itemMap.containsKey(itemId(widget.room, k))) {
          await widget.onSave(
            InspectionItem(room: widget.room, item: k, condition: 'good'),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final keys = itemsOfRoom(widget.room);
    final done = keys
        .where((k) => widget.itemMap.containsKey(itemId(widget.room, k)))
        .length;
    final roomShots = widget.media
        .where((m) => m.room == widget.room && m.item == null)
        .toList();
    final roomPending = widget.pending
        .where((p) => p.room == widget.room && p.item == null)
        .toList();

    return RkCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: widget.expanded,
            label: '${roomLabel(l10n, widget.room)}, $done/${keys.length}',
            excludeSemantics: true,
            child: InkWell(
              key: Key('roomHeader-${widget.room}'),
              borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
              onTap: widget.onToggle,
              child: Container(
                constraints: const BoxConstraints(minHeight: 56),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        roomLabel(l10n, widget.room),
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      '$done/${keys.length}',
                      key: Key('roomCount-${widget.room}'),
                      style: TextStyle(fontSize: 13, color: t.textMuted),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      widget.expanded ? Icons.expand_less : Icons.expand_more,
                      color: t.textMuted,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (widget.expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.editable) ...[
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        RkButton(
                          key: Key('allGood-${widget.room}'),
                          label: l10n.inspAllGood,
                          variant: RkButtonVariant.quiet,
                          expand: false,
                          loading: _busy,
                          onPressed: _allGood,
                        ),
                        RkButton(
                          key: Key('roomPhoto-${widget.room}'),
                          label: l10n.inspRoomPhoto,
                          variant: RkButtonVariant.quiet,
                          expand: false,
                          onPressed: () => widget.onCapture(null),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (roomShots.isNotEmpty || roomPending.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          for (final m in roomShots) RemoteThumb(meta: m),
                          for (final p in roomPending) PendingThumb(entry: p),
                        ],
                      ),
                    ),
                  for (final k in keys)
                    _ItemTile(
                      key: Key('item-${itemId(widget.room, k)}'),
                      room: widget.room,
                      item: k,
                      kind: widget.kind,
                      value: widget.itemMap[itemId(widget.room, k)],
                      before: widget.beforeMap[itemId(widget.room, k)],
                      editable: widget.editable,
                      media: widget.media
                          .where((m) => m.room == widget.room && m.item == k)
                          .toList(),
                      pending: widget.pending
                          .where((p) => p.room == widget.room && p.item == k)
                          .toList(),
                      onSave: widget.onSave,
                      onCapture: () => widget.onCapture(k),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ItemTile extends StatefulWidget {
  const _ItemTile({
    super.key,
    required this.room,
    required this.item,
    required this.kind,
    required this.value,
    required this.before,
    required this.editable,
    required this.media,
    required this.pending,
    required this.onSave,
    required this.onCapture,
  });
  final String room, item, kind;
  final InspectionItem? value, before;
  final bool editable;
  final List<EvidenceMeta> media;
  final List<PendingEvidence> pending;
  final Future<void> Function(InspectionItem) onSave;
  final VoidCallback onCapture;

  @override
  State<_ItemTile> createState() => _ItemTileState();
}

class _ItemTileState extends State<_ItemTile> {
  late final TextEditingController _note = TextEditingController(
    text: widget.value?.note ?? '',
  );
  late final TextEditingController _cost = TextEditingController(
    text: widget.value?.costSar == null ? '' : '${widget.value!.costSar}',
  );

  @override
  void didUpdateWidget(_ItemTile old) {
    super.didUpdateWidget(old);
    final n = widget.value?.note ?? '';
    if (n != old.value?.note && n != _note.text) _note.text = n;
  }

  @override
  void dispose() {
    _note.dispose();
    _cost.dispose();
    super.dispose();
  }

  bool _worse(String condition) =>
      widget.kind == 'move_out' &&
      widget.before != null &&
      conditionRank(condition) > conditionRank(widget.before!.condition);

  Future<void> _write({
    String? condition,
    String? assessment,
    bool keepAssessment = true,
  }) {
    final cond = condition ?? widget.value?.condition ?? 'good';
    final worse = _worse(cond);
    final a = assessment ?? (keepAssessment ? widget.value?.assessment : null);
    final cost = double.tryParse(_cost.text.trim());
    return widget.onSave(
      InspectionItem(
        room: widget.room,
        item: widget.item,
        condition: cond,
        note: _note.text.trim(),
        // The human decision exists only at move-out, and only for items that got worse.
        assessment: worse ? a : null,
        costSar: worse && a == 'damage' && cost != null && cost >= 0
            ? cost
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final v = widget.value;
    final worse = v != null && _worse(v.condition);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: t.border.withValues(alpha: 0.2))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  itemLabel(l10n, widget.item),
                  style: const TextStyle(fontSize: 16),
                ),
              ),
              if (widget.before != null && v != null)
                Text(
                  l10n.inspWasAtMoveIn(
                    conditionLabel(l10n, widget.before!.condition),
                  ),
                  style: TextStyle(fontSize: 12, color: t.textMuted),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (widget.editable) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in conditions)
                  _CondChip(
                    key: Key('cond-${itemId(widget.room, widget.item)}-$c'),
                    label: conditionLabel(l10n, c),
                    selected: v?.condition == c,
                    onTap: () => _write(condition: c),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            RkField(
              key: Key('note-${itemId(widget.room, widget.item)}'),
              label: l10n.inspNote,
              controller: _note,
              onChanged: (_) {},
            ),
            const SizedBox(height: 4),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Wrap(
                spacing: 8,
                children: [
                  if (v != null)
                    TextButton(
                      key: Key('saveNote-${itemId(widget.room, widget.item)}'),
                      onPressed: _write,
                      child: Text(l10n.inspSaveComment),
                    ),
                  TextButton.icon(
                    key: Key('camera-${itemId(widget.room, widget.item)}'),
                    onPressed: widget.onCapture,
                    icon: const Icon(Icons.photo_camera_outlined, size: 20),
                    label: Text(l10n.inspPhoto),
                  ),
                ],
              ),
            ),
          ] else
            Row(
              children: [
                if (v == null)
                  Text(
                    l10n.inspNotAnswered,
                    style: TextStyle(fontSize: 14, color: t.textMuted),
                  )
                else
                  StatusDot(
                    status: v.condition == 'good'
                        ? RkStatus.ok
                        : v.condition == 'fair'
                        ? RkStatus.warn
                        : RkStatus.late,
                    label: conditionLabel(l10n, v.condition),
                  ),
                if (v != null && v.note.isNotEmpty) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      v.note,
                      style: TextStyle(fontSize: 14, color: t.textMuted),
                    ),
                  ),
                ],
              ],
            ),
          if (widget.kind == 'move_out' && worse) ...[
            const SizedBox(height: 8),
            Container(
              key: const Key('assessment'),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
                border: Border.all(color: t.warning),
              ),
              child: widget.editable
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        RkSelect<String>(
                          key: ValueKey(
                            'assess-${widget.item}-${v.assessment}',
                          ),
                          label: l10n.inspAssessment,
                          placeholder: l10n.inspChoose,
                          value: v.assessment,
                          options: [
                            RkSelectOption('wear', l10n.inspAssessWear),
                            RkSelectOption('damage', l10n.inspAssessDamage),
                          ],
                          onChanged: (a) => _write(assessment: a),
                        ),
                        if (v.assessment == 'damage') ...[
                          const SizedBox(height: 8),
                          RkField(
                            key: Key(
                              'cost-${itemId(widget.room, widget.item)}',
                            ),
                            label: l10n.inspCostSar,
                            controller: _cost,
                            ltr: true,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) {},
                          ),
                          TextButton(
                            key: Key(
                              'saveCost-${itemId(widget.room, widget.item)}',
                            ),
                            onPressed: _write,
                            child: Text(l10n.inspSaveComment),
                          ),
                        ],
                        const SizedBox(height: 4),
                        Text(
                          l10n.inspAssessNote,
                          style: TextStyle(fontSize: 12, color: t.textMuted),
                        ),
                      ],
                    )
                  : Text(switch (v.assessment) {
                      'damage' =>
                        '${l10n.inspAssessDamage}${v.costSar == null ? '' : ' · ${v.costSar}'}',
                      'wear' => l10n.inspAssessWear,
                      _ => l10n.inspNotAssessed,
                    }, style: const TextStyle(fontSize: 14)),
            ),
          ],
          if (widget.media.isNotEmpty || widget.pending.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final m in widget.media) RemoteThumb(meta: m),
                for (final p in widget.pending) PendingThumb(entry: p),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _CondChip extends StatelessWidget {
  const _CondChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 64),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
            color: selected ? t.brand.withValues(alpha: 0.18) : null,
            border: Border.all(
              color: selected
                  ? t.brandText.withValues(alpha: 0.6)
                  : t.border.withValues(alpha: 0.3),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: selected ? t.brandText : t.text,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}

class _TenantComment extends ConsumerStatefulWidget {
  const _TenantComment({
    required this.orgId,
    required this.inspectionId,
    required this.inspection,
    required this.staff,
  });
  final String orgId, inspectionId;
  final InspectionDoc inspection;
  final bool staff;

  @override
  ConsumerState<_TenantComment> createState() => _TenantCommentState();
}

class _TenantCommentState extends ConsumerState<_TenantComment> {
  late final TextEditingController _text = TextEditingController(
    text: widget.inspection.tenantComment ?? '',
  );
  bool _saved = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    try {
      await ref
          .read(inspectionRepositoryProvider)
          .saveTenantComment(
            widget.orgId,
            widget.inspectionId,
            _text.text.trim(),
          );
      if (mounted) setState(() => _saved = true);
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.inspSaveFailed, tone: RkToastTone.danger);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final existing = widget.inspection.tenantComment;
    final open = !widget.inspection.isSealed && !widget.staff;

    if (!open) {
      if (existing == null || existing.isEmpty) return const SizedBox.shrink();
      return RkCard(
        child: Column(
          key: const Key('tenantComment'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.inspTenantComment,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(existing, style: TextStyle(fontSize: 15, color: t.textMuted)),
          ],
        ),
      );
    }
    return RkCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          RkField(
            key: const Key('tenantCommentField'),
            label: l10n.inspTenantComment,
            hint: l10n.inspTenantCommentHint,
            controller: _text,
            onChanged: (_) => setState(() => _saved = false),
          ),
          const SizedBox(height: 12),
          RkButton(
            key: const Key('saveTenantComment'),
            label: l10n.inspSaveComment,
            variant: RkButtonVariant.quiet,
            onPressed: _save,
          ),
          if (_saved)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                l10n.inspCommentSaved,
                style: TextStyle(fontSize: 13, color: t.success),
              ),
            ),
        ],
      ),
    );
  }
}
