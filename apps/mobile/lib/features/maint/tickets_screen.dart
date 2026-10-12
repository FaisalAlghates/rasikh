import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/ops_providers.dart';
import '../../app/router.dart';
import '../../app/ticket_providers.dart';
import '../../app/building_providers.dart';
import '../../data/ops_models.dart';
import '../../data/photo_picker.dart';
import '../../data/ticket_models.dart';
import '../../domain/maintenance.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'maint_labels.dart';

String _place(Lease? l) => [
  l?.propertyName,
  l?.unitLabel,
].where((s) => s != null && s.isNotEmpty).join(' · ');

/// Maintenance requests: the tenant reports, the owner assigns and resolves, the tenant closes and rates.
class TicketsScreen extends ConsumerStatefulWidget {
  const TicketsScreen({super.key});

  @override
  ConsumerState<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends ConsumerState<TicketsScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  String _category = 'plumbing';
  String _urgency = 'normal';
  String? _leaseId;
  PickedFile? _photo;
  bool _submitted = false;
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _create(OpsScope scope, List<Doc<Lease>> leases) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _submitted = true);
    final lease = leases
        .where((l) => l.id == (_leaseId ?? leases.firstOrNull?.id))
        .firstOrNull;
    if (lease == null) {
      showRkToast(context, l10n.mtNeedLease, tone: RkToastTone.danger);
      return;
    }
    if (_title.text.trim().length < 3) return;
    setState(() => _busy = true);
    try {
      final id = await ref.read(ticketRepositoryProvider).create(
        scope.orgId,
        NewTicket(
          unitId: lease.data.unitId,
          propertyId: lease.data.propertyId,
          leaseId: lease.id,
          title: _title.text.trim(),
          description: _description.text.trim(),
          category: _category,
          urgency: _urgency,
        ),
        [?_photo],
      );
      _photo = null;
      _title.clear();
      _description.clear();
      setState(() => _submitted = false);
      if (mounted) context.push(Routes.ticketFor(id));
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.mtFailed, tone: RkToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final ops = ref.watch(opsDataProvider).value;
    final tickets = ref.watch(ticketsProvider).value;
    final leases = ops?.leases ?? const <Doc<Lease>>[];
    final leaseId = _leaseId ?? leases.firstOrNull?.id;

    return SubPage(
      title: l10n.mtTab,
      children: [
        if (scope != null)
          RkCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    l10n.mtNew,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (scope.staff && leases.length > 1) ...[
                  RkSelect<String>(
                    key: const Key('ticketLease'),
                    label: l10n.mtUnit,
                    value: leaseId,
                    options: [
                      for (final l in leases)
                        RkSelectOption(l.id, _place(l.data)),
                    ],
                    onChanged: (v) => setState(() => _leaseId = v),
                  ),
                  const SizedBox(height: 12),
                ],
                RkField(
                  key: const Key('ticketTitle'),
                  label: l10n.mtTitle,
                  controller: _title,
                  error: _submitted && _title.text.trim().length < 3
                      ? l10n.mtRequired
                      : null,
                ),
                const SizedBox(height: 12),
                RkSelect<String>(
                  label: l10n.mtCategory,
                  value: _category,
                  options: [
                    for (final c in ticketCategories)
                      RkSelectOption(c, categoryLabel(l10n, c)),
                  ],
                  onChanged: (v) => setState(() => _category = v ?? 'other'),
                ),
                const SizedBox(height: 12),
                RkSelect<String>(
                  label: l10n.mtUrgency,
                  value: _urgency,
                  options: [
                    for (final u in urgencies)
                      RkSelectOption(u, urgencyLabel(l10n, u)),
                  ],
                  onChanged: (v) => setState(() => _urgency = v ?? 'normal'),
                ),
                const SizedBox(height: 12),
                RkField(
                  key: const Key('ticketDescription'),
                  label: l10n.mtDescription,
                  controller: _description,
                ),
                const SizedBox(height: 12),
                RkButton(
                  key: const Key('attachPhoto'),
                  label: _photo == null ? l10n.mtPhoto : '${l10n.mtPhoto} ✓',
                  variant: RkButtonVariant.quiet,
                  onPressed: () async {
                    final p = await ref.read(photoPickerProvider).pick();
                    if (p != null) setState(() => _photo = p);
                  },
                ),
                const SizedBox(height: 16),
                RkButton(
                  key: const Key('submitTicket'),
                  label: l10n.mtSubmit,
                  loading: _busy,
                  onPressed: () => _create(scope, leases),
                ),
              ],
            ),
          ),
        if (tickets == null)
          const Skeleton(height: 100)
        else if (tickets.isEmpty)
          EmptyState(title: l10n.mtNone)
        else
          Column(
            children: [
              for (final x in tickets)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    key: Key('ticket-${x.id}'),
                    borderRadius: BorderRadius.circular(RasikhTokens.radiusLg),
                    onTap: () => context.push(Routes.ticketFor(x.id)),
                    child: RkCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            x.data.title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${categoryLabel(l10n, x.data.category)} · ${urgencyLabel(l10n, x.data.urgency)}',
                            style: TextStyle(fontSize: 14, color: t.textMuted),
                          ),
                          const SizedBox(height: 6),
                          StatusDot(
                            status: x.data.status == 'closed'
                                ? RkStatus.ok
                                : RkStatus.warn,
                            label: statusLabel(l10n, x.data.status),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class TicketScreen extends ConsumerStatefulWidget {
  const TicketScreen({super.key, required this.ticketId});
  final String ticketId;

  @override
  ConsumerState<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends ConsumerState<TicketScreen> {
  final _vendor = TextEditingController();
  final _phone = TextEditingController();
  final _note = TextEditingController();
  int _rating = 5;
  String? _error;

  @override
  void dispose() {
    _vendor.dispose();
    _phone.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _act(
    OpsScope scope,
    String action, [
    Map<String, Object?> extra = const {},
  ]) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _error = null);
    try {
      await ref
          .read(ticketRepositoryProvider)
          .act(scope.orgId, widget.ticketId, action, extra);
    } catch (_) {
      if (mounted) setState(() => _error = l10n.mtFailed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final found = ref
        .watch(ticketsProvider)
        .value
        ?.where((x) => x.id == widget.ticketId)
        .firstOrNull;
    if (scope == null || found == null) {
      return SubPage(
        title: l10n.mtTab,
        children: const [Skeleton(height: 120)],
      );
    }
    final tk = found.data;
    final s = tk.status;
    final staff = scope.staff;
    final lease = ref
        .watch(opsDataProvider)
        .value
        ?.leases
        .where((l) => l.id == tk.leaseId)
        .firstOrNull;
    final sla = tk.sla(DateTime.now().toUtc().toIso8601String());

    return SubPage(
      title: tk.title,
      children: [
        RkCard(
          child: Column(
            key: const Key('ticketCard'),
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_place(lease?.data)} · ${categoryLabel(l10n, tk.category)} · ${urgencyLabel(l10n, tk.urgency)}',
                style: TextStyle(fontSize: 14, color: t.textMuted),
              ),
              if (tk.description.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(tk.description, style: const TextStyle(fontSize: 15)),
              ],
              const SizedBox(height: 8),
              Text(
                '${statusLabel(l10n, s)}${tk.vendorName == null ? '' : ' · ${tk.vendorName}'}',
                key: const Key('ticketStatus'),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (sla != null)
                Text(
                  slaLabel(l10n, sla),
                  key: const Key('ticketSla'),
                  style: TextStyle(fontSize: 13, color: t.textMuted),
                ),
              const SizedBox(height: 10),
              Container(
                key: const Key('ticketSuggested'),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
                  border: Border.all(color: t.border.withValues(alpha: 0.3)),
                ),
                child: Text(
                  '${tk.suggestedParty == 'tenant' ? l10n.mtSuggestTenant : l10n.mtSuggestOwner} ${l10n.mtSuggestNote}',
                  style: TextStyle(fontSize: 13, color: t.textMuted),
                ),
              ),
              if (tk.resolution != null && tk.resolution!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(tk.resolution!),
              ],
              if (tk.rating != null) ...[
                const SizedBox(height: 8),
                Text(l10n.mtRated(tk.rating!), key: const Key('ticketRated')),
              ],
            ],
          ),
        ),
        if (staff && (s == 'open' || s == 'assigned'))
          RkCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                RkField(
                  key: const Key('vendorName'),
                  label: l10n.mtVendor,
                  controller: _vendor,
                ),
                const SizedBox(height: 12),
                RkField(
                  key: const Key('vendorPhone'),
                  label: l10n.mtVendorPhone,
                  controller: _phone,
                  ltr: true,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                RkButton(
                  key: const Key('assign'),
                  label: l10n.mtAssign,
                  onPressed: () => _act(scope, 'assign', {
                    'vendorName': _vendor.text.trim(),
                    'vendorPhone': _phone.text.trim(),
                  }),
                ),
              ],
            ),
          ),
        if (staff && s == 'assigned')
          RkButton(
            key: const Key('start'),
            label: l10n.mtStart,
            onPressed: () => _act(scope, 'start'),
          ),
        if (staff && (s == 'assigned' || s == 'in_progress'))
          RkCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                RkField(
                  key: const Key('resolutionNote'),
                  label: l10n.mtResolution,
                  controller: _note,
                ),
                const SizedBox(height: 12),
                RkButton(
                  key: const Key('resolve'),
                  label: l10n.mtResolve,
                  onPressed: () =>
                      _act(scope, 'resolve', {'note': _note.text.trim()}),
                ),
              ],
            ),
          ),
        if (!staff && s == 'resolved')
          RkCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                RkSelect<int>(
                  key: const Key('ratingSelect'),
                  label: l10n.mtRating,
                  value: _rating,
                  options: [
                    for (final n in [5, 4, 3, 2, 1]) RkSelectOption(n, '$n'),
                  ],
                  onChanged: (v) => setState(() => _rating = v ?? 5),
                ),
                const SizedBox(height: 12),
                RkButton(
                  key: const Key('closeRate'),
                  label: l10n.mtCloseRate,
                  onPressed: () => _act(scope, 'close', {
                    'rating': _rating,
                    'ratingNote': '',
                  }),
                ),
              ],
            ),
          ),
        if (staff && s == 'resolved')
          RkButton(
            key: const Key('closeTicket'),
            label: l10n.mtClose,
            variant: RkButtonVariant.quiet,
            onPressed: () => _act(scope, 'close', {'ratingNote': ''}),
          ),
        if (s == 'open' || s == 'assigned')
          RkButton(
            key: const Key('cancelTicket'),
            label: l10n.mtCancel,
            variant: RkButtonVariant.quiet,
            onPressed: () => _act(scope, 'cancel'),
          ),
        if (_error != null)
          Text(
            _error!,
            key: const Key('ticketError'),
            style: TextStyle(color: t.danger),
          ),
      ],
    );
  }
}
