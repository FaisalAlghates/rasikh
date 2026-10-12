import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/ai_providers.dart';
import '../../app/ops_providers.dart';
import '../../data/ai_repository.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/rk_button.dart';
import '../../widgets/rk_field.dart';
import '../../widgets/rk_surfaces.dart';
import '../../widgets/tab_page.dart';

/// Asks the server-side assistant about the person's own records. Every answer is marked as AI-made and is only
/// a suggestion: this screen never changes a record.
class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});
  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _q = TextEditingController();
  bool _busy = false;
  AiResult? _result;
  AiFailure? _failure;

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _ask(String orgId) async {
    final text = _q.text.trim();
    if (text.length < 2) return;
    setState(() {
      _busy = true;
      _result = null;
      _failure = null;
    });
    try {
      final r = await ref.read(aiRepositoryProvider).ask(orgId, 'assistant', {
        'question': text,
      });
      if (mounted) setState(() => _result = r);
    } on AiException catch (e) {
      if (mounted) setState(() => _failure = e.failure);
    } catch (_) {
      if (mounted) setState(() => _failure = AiFailure.generic);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _failureText(AppLocalizations l, AiFailure f) => switch (f) {
    AiFailure.dailyLimit => l.aiLimitDaily,
    AiFailure.monthlyCap => l.aiLimitMonthly,
    AiFailure.unavailable => l.aiUnavailable,
    AiFailure.notAllowed => l.aiNotAllowed,
    AiFailure.generic => l.aiFailed,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final scope = ref.watch(opsScopeProvider);
    final r = _result;
    return SubPage(
      title: l10n.aiTab,
      children: [
        Text(l10n.aiIntro, style: TextStyle(fontSize: 13, color: t.textMuted)),
        const SizedBox(height: 16),
        RkField(
          key: const Key('aiQuestion'),
          label: l10n.aiQuestion,
          controller: _q,
        ),
        const SizedBox(height: 12),
        RkButton(
          key: const Key('aiSend'),
          label: _busy ? l10n.aiSending : l10n.aiSend,
          loading: _busy,
          onPressed: scope == null ? null : () => _ask(scope.orgId),
        ),
        const SizedBox(height: 16),
        if (_failure != null)
          Semantics(
            liveRegion: true,
            child: Text(
              _failureText(l10n, _failure!),
              key: const Key('aiError'),
              style: TextStyle(color: t.danger),
            ),
          ),
        if (r is AiRefused)
          Semantics(
            liveRegion: true,
            child: Text(
              r.message,
              key: const Key('aiRefused'),
              style: TextStyle(color: t.warning),
            ),
          ),
        if (r is AiAnswer)
          RkCard(
            child: Column(
              key: const Key('aiAnswer'),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  key: const Key('aiBadge'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: t.brand,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    r.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: t.onBrand,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(r.text),
                if (r.citations.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    '${l10n.aiCitations}: ${r.citations.join(' · ')}',
                    style: TextStyle(fontSize: 12, color: t.textMuted),
                  ),
                ],
                for (final d in r.disclaimers) ...[
                  const SizedBox(height: 8),
                  Text(
                    d,
                    key: const Key('aiDisclaimer'),
                    style: TextStyle(fontSize: 12, color: t.warning),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}
