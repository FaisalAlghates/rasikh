import 'package:flutter/widgets.dart';

import 'evidence_queue.dart';

/// Takes a photo for an inspection. The only way to add evidence is this in-app camera: there is no gallery
/// picker, so a photo cannot predate the visit. Returns null when the person backs out or the camera is unavailable.
abstract class EvidenceCamera {
  Future<CapturedPhoto?> capture(BuildContext context);
}
