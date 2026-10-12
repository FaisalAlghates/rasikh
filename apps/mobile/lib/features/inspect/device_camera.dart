import 'dart:io' show Platform;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../data/evidence_camera.dart';
import '../../data/evidence_queue.dart';
import '../../data/inspection_models.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';

/// The real in-app camera. It records the capture time and, when allowed, the position; there is no gallery option.
/// (Not exercised by the widget tests, which use a fake camera; it needs a device or emulator with a camera.)
class DeviceEvidenceCamera implements EvidenceCamera {
  const DeviceEvidenceCamera();

  @override
  Future<CapturedPhoto?> capture(BuildContext context) => Navigator.of(context)
      .push<CapturedPhoto>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => const _CameraScreen(),
        ),
      );
}

String _deviceLabel() {
  if (kIsWeb) return 'web';
  try {
    return '${Platform.operatingSystem} ${Platform.operatingSystemVersion}'
        .trim();
  } catch (_) {
    return defaultTargetPlatform.name;
  }
}

Future<Gps?> _readGps() async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    final p = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 4),
      ),
    );
    return Gps(
      double.parse(p.latitude.toStringAsFixed(6)),
      double.parse(p.longitude.toStringAsFixed(6)),
      p.accuracy,
    );
  } catch (_) {
    return null; // no fix is simply recorded as absent; it never blocks the photo
  }
}

class _CameraScreen extends StatefulWidget {
  const _CameraScreen();

  @override
  State<_CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<_CameraScreen> {
  CameraController? _controller;
  bool _failed = false;
  bool _shooting = false;
  // Started when the screen opens, so the fix is usually ready by the time the shutter is pressed.
  late final Future<Gps?> _gps;

  @override
  void initState() {
    super.initState();
    _gps = _readGps();
    _open();
  }

  Future<void> _open() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) throw StateError('no camera');
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final c = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await c.initialize();
      if (!mounted) return await c.dispose();
      setState(() => _controller = c);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _shoot() async {
    final c = _controller;
    if (c == null || _shooting) return;
    setState(() => _shooting = true);
    try {
      final file = await c.takePicture();
      final capturedAt = DateTime.now();
      final bytes = await file.readAsBytes();
      final gps = await _gps.timeout(
        const Duration(seconds: 1),
        onTimeout: () => null,
      );
      if (!mounted) return;
      Navigator.of(context).pop(
        CapturedPhoto(
          bytes: bytes,
          capturedAt: capturedAt,
          gps: gps,
          device: _deviceLabel(),
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _shooting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = context.tokens;
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_failed)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    l10n.inspCameraDenied,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      height: 1.6,
                    ),
                  ),
                ),
              )
            else if (_controller == null)
              const Center(child: CircularProgressIndicator())
            else
              Center(child: CameraPreview(_controller!)),
            PositionedDirectional(
              top: 8,
              start: 8,
              child: IconButton(
                tooltip: l10n.inspCloseCamera,
                color: Colors.white,
                iconSize: 28,
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            if (!_failed)
              Positioned(
                left: 24,
                right: 24,
                bottom: 24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      l10n.inspCaptureNote,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Semantics(
                      button: true,
                      label: l10n.inspCapture,
                      child: GestureDetector(
                        key: const Key('cameraShutter'),
                        onTap: _controller == null ? null : _shoot,
                        child: Container(
                          width: 76,
                          height: 76,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                          ),
                          padding: const EdgeInsets.all(6),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _shooting ? t.textMuted : t.brand,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
