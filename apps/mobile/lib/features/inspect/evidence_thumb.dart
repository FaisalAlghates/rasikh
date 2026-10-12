import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/inspection_providers.dart';
import '../../data/evidence_queue.dart';
import '../../data/inspection_models.dart';
import '../../domain/inspection.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/rasikh_tokens.g.dart';

/// Downloads a stored photo once and caches it while the screen is open.
final evidenceBytesProvider = FutureProvider.autoDispose
    .family<Uint8List, String>(
      (ref, path) =>
          ref.watch(inspectionRepositoryProvider).downloadEvidence(path),
    );

const _thumbWidth = 150.0;

Widget _frame(BuildContext context, Uint8List? bytes) {
  final t = context.tokens;
  final placeholder = Container(
    color: t.border.withValues(alpha: 0.2),
    alignment: Alignment.center,
    child: Icon(Icons.photo_outlined, color: t.textMuted),
  );
  return ClipRRect(
    borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
    child: AspectRatio(
      aspectRatio: 4 / 3,
      child: bytes == null
          ? placeholder
          : Image.memory(
              bytes,
              fit: BoxFit.cover,
              gaplessPlayback: true,
              excludeFromSemantics: true,
              errorBuilder: (_, _, _) => placeholder,
            ),
    ),
  );
}

class _Caption extends StatelessWidget {
  const _Caption(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 2),
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: context.tokens.textMuted,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    ),
  );
}

/// A photo that is already stored: time, hash, whether a position was recorded, and an integrity check.
class RemoteThumb extends ConsumerStatefulWidget {
  const RemoteThumb({super.key, required this.meta});
  final EvidenceMeta meta;

  @override
  ConsumerState<RemoteThumb> createState() => _RemoteThumbState();
}

enum _Check { idle, busy, ok, bad }

class _RemoteThumbState extends ConsumerState<RemoteThumb> {
  _Check _check = _Check.idle;

  Future<void> _verify() async {
    setState(() => _check = _Check.busy);
    try {
      final bytes = await ref
          .read(inspectionRepositoryProvider)
          .downloadEvidence(widget.meta.path);
      if (mounted) {
        setState(
          () => _check = matchesHash(bytes, widget.meta.sha256)
              ? _Check.ok
              : _Check.bad,
        );
      }
    } catch (_) {
      if (mounted) setState(() => _check = _Check.bad);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final m = widget.meta;
    final bytes = ref.watch(evidenceBytesProvider(m.path)).value;
    return SizedBox(
      width: _thumbWidth,
      child: Column(
        key: const Key('evidence'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            label: l10n.inspEvidenceAlt,
            image: true,
            child: _frame(context, bytes),
          ),
          _Caption(m.capturedAt.replaceFirst('T', ' ').substring(0, 19)),
          _Caption('SHA-256 ${m.sha256.substring(0, 10)}…'),
          Text(
            m.gps == null ? l10n.inspNoGps : l10n.inspHasGps,
            style: TextStyle(fontSize: 12, color: t.textMuted),
          ),
          TextButton(
            key: const Key('verifyEvidence'),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(48, 40),
              alignment: AlignmentDirectional.centerStart,
            ),
            onPressed: _check == _Check.busy ? null : _verify,
            child: Text(
              l10n.inspVerify,
              style: TextStyle(fontSize: 13, color: t.brandText),
            ),
          ),
          if (_check != _Check.idle)
            Semantics(
              liveRegion: true,
              child: Text(
                switch (_check) {
                  _Check.busy => l10n.inspVerifying,
                  _Check.ok => l10n.inspVerifiedOk,
                  _ => l10n.inspVerifiedBad,
                },
                key: const Key('verifyResult'),
                style: TextStyle(
                  fontSize: 12,
                  color: _check == _Check.ok
                      ? t.success
                      : _check == _Check.bad
                      ? t.danger
                      : t.textMuted,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A photo still on the phone, waiting for a connection. Its hash and time are already fixed.
class PendingThumb extends ConsumerWidget {
  const PendingThumb({super.key, required this.entry});
  final PendingEvidence entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    final queue = ref.watch(evidenceQueueProvider);
    return SizedBox(
      width: _thumbWidth,
      child: Column(
        key: const Key('pendingEvidence'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FutureBuilder<Uint8List?>(
            future: queue.store.bytes(entry.id),
            builder: (context, snap) => _frame(context, snap.data),
          ),
          _Caption(entry.capturedAt.replaceFirst('T', ' ').substring(0, 19)),
          _Caption('SHA-256 ${entry.sha256.substring(0, 10)}…'),
          Text(
            l10n.inspPendingUploadsNote,
            style: TextStyle(fontSize: 12, color: t.warning),
          ),
        ],
      ),
    );
  }
}
