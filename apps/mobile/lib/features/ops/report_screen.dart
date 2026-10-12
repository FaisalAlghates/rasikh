import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/ops_providers.dart';
import '../../domain/domain.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';
import 'labels.dart';

/// Yearly income and expenses, computed from the user's own records. Informational, not an accounting document.
class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  int _year = int.parse(riyadhToday().substring(0, 4));

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final data = ref.watch(opsDataProvider).value;
    final totals = data == null
        ? null
        : yearTotals(
            _year,
            [
              for (final p in data.payments)
                (
                  dueDate: p.data.dueDate,
                  amount: p.data.amount,
                  paid: p.data.paid,
                ),
            ],
            [
              for (final e in data.expenses)
                (date: e.data.date, amount: e.data.amount),
            ],
          );

    Widget tile(String key, String label, double? v) => StatTile(
      key: Key(key),
      label: label,
      value: v == null ? '—' : money(v),
      note: l10n.opsSar,
    );

    return SubPage(
      title: l10n.opsReportTitle,
      children: [
        Row(
          children: [
            RkIconButton(
              key: const Key('yearPrev'),
              icon:
                  Icons.chevron_left_rounded, // mirrors itself in right-to-left
              label: '${l10n.opsYear} ${_year - 1}',
              onPressed: () => setState(() => _year--),
            ),
            Expanded(
              child: Center(
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    '$_year',
                    key: const Key('reportYear'),
                    style: displayStyle(context, 32),
                  ),
                ),
              ),
            ),
            RkIconButton(
              key: const Key('yearNext'),
              icon: Icons.chevron_right_rounded,
              label: '${l10n.opsYear} ${_year + 1}',
              onPressed: () => setState(() => _year++),
            ),
          ],
        ),
        tile('rep-expected', l10n.opsExpected, totals?.expected),
        tile('rep-collected', l10n.opsCollected, totals?.collected),
        tile('rep-outstanding', l10n.opsOutstanding, totals?.outstanding),
        tile('rep-expenses', l10n.opsExpenses, totals?.expenses),
        tile('rep-net', l10n.opsNet, totals?.net),
        Text(
          l10n.opsReportNote,
          style: TextStyle(fontSize: 13, color: t.textMuted),
        ),
      ],
    );
  }
}
