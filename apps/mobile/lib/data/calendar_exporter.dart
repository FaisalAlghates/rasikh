import 'dart:convert';

import 'package:share_plus/share_plus.dart';

/// Hands an .ics file to the phone: the share sheet offers the calendar app (free, no server involved).
abstract class CalendarExporter {
  Future<void> export({
    required String fileName,
    required String ics,
    required String title,
  });
}

class ShareCalendarExporter implements CalendarExporter {
  const ShareCalendarExporter();

  @override
  Future<void> export({
    required String fileName,
    required String ics,
    required String title,
  }) async {
    final bytes = utf8.encode(ics);
    await SharePlus.instance.share(
      ShareParams(
        title: title,
        subject: title,
        files: [
          XFile.fromData(bytes, mimeType: 'text/calendar', name: fileName),
        ],
        fileNameOverrides: [fileName],
      ),
    );
  }
}
