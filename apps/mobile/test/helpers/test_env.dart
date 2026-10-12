import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/data/evidence_queue.dart';
import 'package:rasikh/data/ops_models.dart';
import 'package:rasikh/domain/domain.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'fake_auth_repository.dart';
import 'fake_inspection_repository.dart';
import 'fake_ops_repository.dart';

/// Everything the app talks to, replaced by in-memory fakes, plus helpers to drive the UI.
class TestEnv {
  TestEnv() {
    queue = EvidenceQueue(
      store: MemoryQueueStore(),
      uploader: inspections.uploadEvidence,
      // Retries are fired by hand in tests, never by a real timer.
      schedule: (d, run) => scheduled.add(run),
    );
  }

  final ops = FakeOpsRepository();
  final inspections = FakeInspectionRepository();
  final camera = FakeEvidenceCamera();
  final calendar = FakeCalendarExporter();
  final scheduled = <void Function()>[];
  late final EvidenceQueue queue;
  FakeAuthRepository? auth;

  /// A property, an apartment and a lease. Returns the lease id.
  Future<String> seedLease({
    String? tenantUid,
    String tenantEmail = 'salem@test.sa',
  }) async {
    await ops.addProperty(
      'o',
      const Property(name: 'برج النخيل', city: 'الرياض'),
    );
    final prop = (await ops.properties('o').first).last.id;
    await ops.addUnit(
      'o',
      RentalUnit(propertyId: prop, label: 'شقة 3', type: 'apartment'),
    );
    final unit = (await ops.units('o').first).last.id;
    final res = await ops.createLease(
      'o',
      Lease(
        unitId: unit,
        propertyId: prop,
        ejarContractNo: '10203040',
        tenantName: 'سالم',
        tenantEmail: tenantEmail,
        tenantUid: tenantUid,
        propertyName: 'برج النخيل',
        unitLabel: 'شقة 3',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        annualRent: 42000,
        cycle: PaymentCycle.monthly,
        status: 'active',
      ),
    );
    return res.leaseId;
  }

  String get propertyId => 'prop1';
  String get unitId => 'unit2';

  Future<void> pump(WidgetTester tester, {required SessionUser session}) async {
    FontConfig.webFonts = false;
    SceneConfig.animate = false;
    auth = FakeAuthRepository(initial: session);
    // Tall enough that a whole inspection fits on screen: no scrolling, so nothing is culled from the lazy list.
    tester.view.physicalSize = const Size(900, 9000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth!),
          opsRepositoryProvider.overrideWithValue(ops),
          calendarExporterProvider.overrideWithValue(calendar),
          inspectionRepositoryProvider.overrideWithValue(inspections),
          evidenceCameraProvider.overrideWithValue(camera),
          evidenceQueueProvider.overrideWithValue(queue),
        ],
        child: const RasikhApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// Brings a widget on screen only when it is not already: long lists build lazily, and scrolling needlessly
  /// would push the header (status card, uploads banner) out of the tree.
  Future<void> reveal(WidgetTester tester, Finder f) async {
    final h = tester.view.physicalSize.height;
    bool visible() {
      if (f.evaluate().isEmpty) return false;
      final r = tester.getRect(f.first);
      return r.top >= 0 && r.bottom <= h;
    }

    if (visible()) return;
    final scrollable = find.byType(Scrollable).first;
    // not built yet (lazy list): look above first, then below
    for (var i = 0; i < 40 && f.evaluate().isEmpty; i++) {
      await tester.drag(scrollable, const Offset(0, 600));
      await tester.pump();
    }
    for (var i = 0; i < 40 && f.evaluate().isEmpty; i++) {
      await tester.drag(scrollable, const Offset(0, -600));
      await tester.pump();
    }
    if (visible()) return;
    final above = tester.getRect(f.first).top < 0;
    await tester.scrollUntilVisible(
      f,
      above ? -400 : 400,
      scrollable: scrollable,
      maxScrolls: 100,
    );
  }

  Future<void> tapFinder(WidgetTester tester, Finder f) async {
    await reveal(tester, f);
    await tester.tap(f);
    await tester.pumpAndSettle();
  }

  Future<void> tapKey(WidgetTester tester, String key) =>
      tapFinder(tester, find.byKey(Key(key)));
  Future<void> fill(WidgetTester tester, String key, String text) async {
    await tester.enterText(find.byKey(Key(key)), text);
    await tester.pump();
  }
}

const ownerSession = SessionUser(
  uid: 'owner1',
  hasPassword: true,
  orgs: {
    'o': ['owner'],
  },
);

SessionUser tenantSession({bool password = true, bool phone = false}) =>
    SessionUser(
      uid: 'tenant1',
      hasPassword: password,
      hasPhone: phone,
      orgs: const {
        'o': ['tenant'],
      },
    );
