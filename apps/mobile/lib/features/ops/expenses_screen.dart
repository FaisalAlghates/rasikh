import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/ops_providers.dart';
import '../../data/lease_draft.dart';
import '../../data/ops_models.dart';
import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_overlays.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'labels.dart';

class ExpensesScreen extends ConsumerStatefulWidget {
  const ExpensesScreen({super.key});

  @override
  ConsumerState<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends ConsumerState<ExpensesScreen> {
  final _amount = TextEditingController();
  final _date = TextEditingController(text: riyadhToday());
  final _note = TextEditingController();
  String? _propertyId;
  String _category = 'maintenance';
  bool _submitted = false;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _date.dispose();
    _note.dispose();
    super.dispose();
  }

  double? get _amountValue {
    final v = parseAmount(_amount.text);
    return v != null && v > 0 && v <= 100000000 ? v : null;
  }

  Future<void> _add(String orgId, String? propertyId) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _submitted = true);
    final date = asciiDigits(_date.text);
    if (propertyId == null || _amountValue == null || !isIsoDate(date)) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(opsRepositoryProvider)
          .addExpense(
            orgId,
            Expense(
              propertyId: propertyId,
              category: _category,
              amount: _amountValue!,
              date: date,
              note: _note.text.trim(),
            ),
          );
      _amount.clear();
      _note.clear();
      setState(() => _submitted = false);
    } catch (_) {
      if (mounted) {
        showRkToast(context, l10n.opsErrorGeneric, tone: RkToastTone.danger);
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
    final data = ref.watch(opsDataProvider).value;
    final properties = data?.properties ?? const <Doc<Property>>[];
    // With a single property there is nothing to choose.
    final propertyId =
        _propertyId ?? (properties.length == 1 ? properties.first.id : null);
    final expenses = [...?data?.expenses]
      ..sort((a, b) => b.data.date.compareTo(a.data.date));
    String propertyName(String id) =>
        properties.where((p) => p.id == id).firstOrNull?.data.name ?? '';

    return SubPage(
      title: l10n.opsTabExpenses,
      children: [
        if (data != null && properties.isEmpty)
          EmptyState(title: l10n.opsNoProperties)
        else
          RkCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    l10n.opsAddExpense,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                RkSelect<String>(
                  key: ValueKey('property-$propertyId'),
                  label: l10n.opsProperty,
                  placeholder: l10n.opsChoose,
                  value: propertyId,
                  options: [
                    for (final p in properties)
                      RkSelectOption(p.id, p.data.name),
                  ],
                  onChanged: (v) => setState(() => _propertyId = v),
                ),
                if (_submitted && propertyId == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      l10n.opsRequired,
                      style: TextStyle(fontSize: 13, color: t.danger),
                    ),
                  ),
                const SizedBox(height: 12),
                RkSelect<String>(
                  label: l10n.opsCategory,
                  value: _category,
                  options: [
                    for (final c in expenseCategories)
                      RkSelectOption(c, categoryLabel(l10n, c)),
                  ],
                  onChanged: (v) => setState(() => _category = v ?? 'other'),
                ),
                const SizedBox(height: 12),
                RkField(
                  key: const Key('expenseAmount'),
                  label: '${l10n.opsAmount} (${l10n.opsSar})',
                  controller: _amount,
                  ltr: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  error: _submitted && _amountValue == null
                      ? l10n.opsInvalidAmount
                      : null,
                ),
                const SizedBox(height: 12),
                RkDateField(
                  key: const Key('expenseDate'),
                  label: l10n.opsDate,
                  controller: _date,
                  pickerLabel: l10n.opsPickDate,
                  error: _submitted && !isIsoDate(asciiDigits(_date.text))
                      ? l10n.opsInvalidDate
                      : null,
                ),
                const SizedBox(height: 12),
                RkField(
                  key: const Key('expenseNote'),
                  label: l10n.opsNote,
                  controller: _note,
                ),
                const SizedBox(height: 16),
                RkButton(
                  key: const Key('addExpense'),
                  label: l10n.opsAddExpense,
                  loading: _busy,
                  onPressed: scope == null
                      ? null
                      : () => _add(scope.orgId, propertyId),
                ),
              ],
            ),
          ),
        if (data == null)
          const Skeleton(height: 80)
        else if (expenses.isEmpty && properties.isNotEmpty)
          EmptyState(title: l10n.opsNoExpenses)
        else
          Column(
            children: [
              for (final e in expenses)
                Container(
                  constraints: const BoxConstraints(minHeight: 56),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: t.border.withValues(alpha: 0.2)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${categoryLabel(l10n, e.data.category)} · ${propertyName(e.data.propertyId)}',
                              style: const TextStyle(fontSize: 16),
                            ),
                            Directionality(
                              textDirection: TextDirection.ltr,
                              child: Text(
                                e.data.note.isEmpty
                                    ? e.data.date
                                    : '${e.data.date} · ${e.data.note}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: t.textMuted,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${money(e.data.amount)} ${l10n.opsSar}',
                        style: const TextStyle(fontSize: 15),
                      ),
                    ],
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
