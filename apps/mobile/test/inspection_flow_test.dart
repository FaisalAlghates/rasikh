import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/data/inspection_models.dart';
import 'package:rasikh/widgets/rk_button.dart';
import 'package:rasikh/widgets/rk_surfaces.dart' show StatTile;

import 'helpers/fake_inspection_repository.dart';
import 'helpers/test_env.dart';

const _rooms = [
  'entrance',
  'living',
  'bedroom_1',
  'kitchen',
  'bathroom_1',
  'balcony',
  'meters',
];

bool _disabled(WidgetTester tester, String key) =>
    tester.widget<RkButton>(find.byKey(Key(key))).onPressed == null;

/// Marks every room "all good". The first room starts open; the others are opened and closed again.
Future<void> answerAllGood(TestEnv env, WidgetTester tester) async {
  for (final room in _rooms) {
    if (room != _rooms.first) await env.tapKey(tester, 'roomHeader-$room');
    await env.tapKey(tester, 'allGood-$room');
    await env.tapKey(tester, 'roomHeader-$room');
  }
}

/// Label of a StatTile, after making sure it is built (the report sits far down a long, lazy list).
Future<String> tile(TestEnv env, WidgetTester tester, String key) async {
  await env.reveal(tester, find.byKey(Key(key)));
  final w = tester.widget<StatTile>(find.byKey(Key(key)));
  return '${w.label}: ${w.value}';
}

Future<void> openInspectionsFromHome(TestEnv env, WidgetTester tester) async {
  await env.tapKey(tester, 'nav-inspections');
}

void main() {
  group('owner: guided inspection', () {
    testWidgets(
      'start → answer every room → photo evidence → verify → sign (needs a fresh login)',
      (tester) async {
        final env = TestEnv();
        await env.seedLease();
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);

        // start a move-in for the lease (a one-bedroom apartment: 48 items)
        await tester.tap(find.byKey(const Key('inspLease')));
        await tester.pumpAndSettle();
        await tester.tap(find.text('برج النخيل · شقة 3 · سالم').last);
        await tester.pumpAndSettle();
        await env.fill(tester, 'inspBedrooms', '1');
        await env.tapKey(tester, 'startInspection');

        final id = env.inspections.ids.single;
        expect(env.inspections.calls, ['create:move_in']);
        expect(find.byKey(const Key('progress')), findsOneWidget);
        expect(find.text('0 من 48 بنداً'), findsOneWidget);

        // signing is blocked until every item has an answer
        expect(_disabled(tester, 'signOwner'), isTrue);
        expect(find.byKey(const Key('finishFirst')), findsOneWidget);
        await answerAllGood(env, tester);
        expect(find.text('48 من 48 بنداً'), findsOneWidget);
        expect(_disabled(tester, 'signOwner'), isFalse);

        // a defect: damaged living-room walls need a photo, taken only with the in-app camera
        await env.tapKey(tester, 'roomHeader-living');
        await env.tapKey(tester, 'cond-living__walls-damaged');
        expect(
          env.inspections.itemsOf(id)['living__walls']!.condition,
          'damaged',
        );
        env.camera.photos.add(FakeEvidenceCamera.photo(1));
        await env.tapKey(tester, 'camera-living__walls');
        expect(env.camera.calls, 1);

        final meta = env.inspections.mediaOf(id).single;
        expect(meta.room, 'living');
        expect(meta.item, 'walls');
        expect(meta.sha256, hasLength(64));
        expect(meta.gps?.lat, 24.7136);
        expect(
          meta.capturedAt,
          matches(RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')),
        );
        expect(find.byKey(const Key('evidence')), findsOneWidget);
        expect(find.byKey(const Key('pendingEvidence')), findsNothing);

        // integrity check: the stored file still matches the hash taken at capture
        await env.tapKey(tester, 'verifyEvidence');
        expect(find.text('الملف مطابق للبصمة المسجّلة'), findsOneWidget);

        // signing asks for the password again, then calls the server
        await env.tapKey(tester, 'signOwner');
        expect(find.byKey(const Key('signPassword')), findsOneWidget);
        await env.fill(tester, 'signPassword', 'Ops-pass-2026!');
        await env.tapKey(tester, 'signConfirm');

        expect(env.auth!.calls, contains('reauthPassword'));
        expect(env.inspections.calls, contains('sign:owner'));
        expect(env.inspections.get(id)!.status, 'pending_signatures');
        expect(find.byKey(const Key('signedOwner')), findsOneWidget);
        expect(
          tester.widget<Text>(find.byKey(const Key('signedOwner'))).data,
          contains('وقّع'),
        );
        expect(find.byKey(const Key('signOwner')), findsNothing);
        // frozen: no more condition chips or camera buttons
        expect(find.byKey(const Key('camera-living__walls')), findsNothing);
      },
    );

    testWidgets(
      'a wrong password blocks the signature before the server is asked',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease();
        final id = env.inspections.seed(leaseId: lease);
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);
        await env.tapKey(tester, 'inspection-move_in');

        env.auth!.failNextReauthWith = AuthFailure.invalidCredentials;
        await env.tapKey(tester, 'signOwner');
        await env.fill(tester, 'signPassword', 'wrong-password');
        await env.tapKey(tester, 'signConfirm');
        expect(
          find.text('تعذّر التحقق من هويتك. راجع البيانات وحاول مرة أخرى.'),
          findsOneWidget,
        );
        expect(env.inspections.calls, isNot(contains('sign:owner')));
        expect(env.inspections.get(id)!.status, 'draft');
      },
    );

    testWidgets('a tampered photo blocks the signature with a clear message', (
      tester,
    ) async {
      final env = TestEnv();
      final lease = await env.seedLease();
      final id = env.inspections.seed(
        leaseId: lease,
        conditions: {'living__walls': 'damaged'},
      );
      await env.pump(tester, session: ownerSession);
      await openInspectionsFromHome(env, tester);
      await env.tapKey(tester, 'inspection-move_in');

      await env.tapKey(tester, 'roomHeader-living');
      env.camera.photos.add(FakeEvidenceCamera.photo(2));
      await env.tapKey(tester, 'camera-living__walls');
      final path = env.inspections.mediaOf(id).single.path;
      env.inspections.files[path] = (env.inspections.files[path]!)
        ..[10] ^= 1; // one flipped byte

      await env.tapKey(tester, 'verifyEvidence');
      expect(find.text('الملف لا يطابق البصمة المسجّلة'), findsOneWidget);

      await env.tapKey(tester, 'signOwner');
      await env.fill(tester, 'signPassword', 'Ops-pass-2026!');
      await env.tapKey(tester, 'signConfirm');
      expect(
        find.text('تغيّر أحد الملفات عن بصمته المسجّلة، ولا يمكن التوقيع.'),
        findsOneWidget,
      );
      expect(env.inspections.get(id)!.status, 'draft');
    });

    testWidgets('a defect without a photo cannot be signed', (tester) async {
      final env = TestEnv();
      final lease = await env.seedLease();
      final id = env.inspections.seed(
        leaseId: lease,
        conditions: {'kitchen__sink': 'poor'},
      );
      await env.pump(tester, session: ownerSession);
      await openInspectionsFromHome(env, tester);
      await env.tapKey(tester, 'inspection-move_in');
      await env.tapKey(tester, 'signOwner');
      await env.fill(tester, 'signPassword', 'Ops-pass-2026!');
      await env.tapKey(tester, 'signConfirm');
      expect(find.text('كل بند رديء أو تالف يحتاج صورة.'), findsOneWidget);
      expect(env.inspections.get(id)!.status, 'draft');
    });
  });

  group('offline-first photos', () {
    testWidgets(
      'captured offline: kept on the phone with its hash, uploaded when the network returns',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease();
        final id = env.inspections.seed(leaseId: lease);
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);
        await env.tapKey(tester, 'inspection-move_in');
        await env.tapKey(tester, 'roomHeader-living');

        env.inspections.offline = true;
        env.camera.photos.add(FakeEvidenceCamera.photo(3));
        await env.tapKey(tester, 'camera-living__walls');

        // nothing reached the server, but the photo is on the phone and shown as waiting
        expect(env.inspections.mediaOf(id), isEmpty);
        expect(find.byKey(const Key('pendingUploads')), findsOneWidget);
        expect(find.text('1 صور بانتظار الرفع'), findsOneWidget);
        expect(find.byKey(const Key('pendingEvidence')), findsOneWidget);
        expect(find.byKey(const Key('evidence')), findsNothing);
        final waiting = env.queue.pending.value.single;
        expect(waiting.sha256, hasLength(64));

        // back online: retry now
        env.inspections.offline = false;
        await env.tapKey(tester, 'retryUploads');
        expect(
          env.inspections.mediaOf(id).single.sha256,
          waiting.sha256,
        ); // same hash as at capture
        expect(find.byKey(const Key('pendingUploads')), findsNothing);
        expect(find.byKey(const Key('evidence')), findsOneWidget);
      },
    );

    testWidgets(
      'a photo queued for an inspection that got signed meanwhile is dropped with a notice',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease();
        final id = env.inspections.seed(leaseId: lease);
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);
        await env.tapKey(tester, 'inspection-move_in');
        await env.tapKey(tester, 'roomHeader-living');

        env.inspections.offline = true;
        env.camera.photos.add(FakeEvidenceCamera.photo(4));
        await env.tapKey(tester, 'camera-living__walls');
        expect(find.byKey(const Key('pendingUploads')), findsOneWidget);

        // meanwhile the owner's signature froze the inspection (done from another device)
        env.inspections.offline = false;
        env.inspections.signAs = 'owner';
        await env.inspections.sign('o', id);
        expect(env.inspections.get(id)!.status, 'pending_signatures');

        await env.tapKey(tester, 'retryUploads');
        // the upload is refused for good, so it is dropped instead of retried forever
        expect(env.queue.pending.value, isEmpty);
        expect(env.queue.rejected.value, 1);
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('rejectedUploads')), findsOneWidget);
      },
    );
  });

  group('tenant', () {
    testWidgets(
      'reviews, comments and signs second; the second signature seals it',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease(tenantUid: 'tenant1');
        final id = env.inspections.seed(
          leaseId: lease,
          tenantUid: 'tenant1',
          status: 'pending_signatures',
          owner: SignatureInfo(
            uid: 'owner1',
            digest: 'd' * 64,
            at: DateTime.utc(2026, 10, 12, 9),
          ),
        );
        env.inspections.signAs = 'tenant';
        await env.pump(tester, session: tenantSession());
        await openInspectionsFromHome(env, tester);

        // no staff controls for a tenant
        expect(find.byKey(const Key('startInspection')), findsNothing);
        await env.tapKey(tester, 'inspection-move_in');
        expect(find.byKey(const Key('allGood-entrance')), findsNothing);
        expect(find.byKey(const Key('signOwner')), findsNothing);
        expect(find.byKey(const Key('signTenant')), findsOneWidget);

        await env.fill(tester, 'tenantCommentField', 'أوافق مع ملاحظة الجدار');
        await env.tapKey(tester, 'saveTenantComment');
        expect(
          env.inspections.get(id)!.tenantComment,
          'أوافق مع ملاحظة الجدار',
        );

        await env.tapKey(tester, 'signTenant');
        await env.fill(tester, 'signPassword', 'Ops-pass-2026!');
        await env.tapKey(tester, 'signConfirm');

        expect(env.inspections.get(id)!.status, 'sealed');
        expect(find.byKey(const Key('sealedNote')), findsOneWidget);
        expect(find.byKey(const Key('signTenant')), findsNothing);
        expect(
          find.text('موثّق ومقفل'),
          findsWidgets,
        ); // the status line and the toast
      },
    );

    testWidgets('a phone account confirms with a fresh SMS code', (
      tester,
    ) async {
      final env = TestEnv();
      final lease = await env.seedLease(tenantUid: 'tenant1');
      final id = env.inspections.seed(
        leaseId: lease,
        tenantUid: 'tenant1',
        status: 'pending_signatures',
        owner: SignatureInfo(uid: 'owner1', digest: 'd' * 64),
      );
      env.inspections.signAs = 'tenant';
      await env.pump(
        tester,
        session: tenantSession(password: false, phone: true),
      );
      await openInspectionsFromHome(env, tester);
      await env.tapKey(tester, 'inspection-move_in');
      await env.tapKey(tester, 'signTenant');

      expect(find.byKey(const Key('signPassword')), findsNothing);
      await env.tapKey(tester, 'signSendCode');
      expect(env.auth!.calls, contains('startReauthPhone'));
      await env.fill(tester, 'signCode', '123456');
      await env.tapKey(tester, 'signConfirm');
      expect(env.auth!.calls, contains('confirmReauthPhone:123456'));
      expect(env.inspections.get(id)!.status, 'sealed');
    });

    testWidgets('sees only their own lease’s inspections', (tester) async {
      final env = TestEnv();
      final lease = await env.seedLease(tenantUid: 'tenant1');
      env.inspections.seed(
        leaseId: lease,
        tenantUid: 'tenant1',
        status: 'sealed',
      );
      env.inspections.seed(
        leaseId: 'other-lease',
        tenantUid: 'someone-else',
        kind: 'move_out',
      );
      await env.pump(tester, session: tenantSession());
      await openInspectionsFromHome(env, tester);
      expect(find.byKey(const Key('inspection-move_in')), findsOneWidget);
      expect(find.byKey(const Key('inspection-move_out')), findsNothing);
    });
  });

  group('move-out comparison', () {
    testWidgets(
      'the owner decides wear vs damage and a cost; the report totals only damage',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease(tenantUid: 'tenant1');
        final moveIn = env.inspections.seed(
          leaseId: lease,
          tenantUid: 'tenant1',
          status: 'sealed',
          sealedAt: DateTime.utc(2026, 1, 2),
        );
        final out = env.inspections.seed(
          leaseId: lease,
          tenantUid: 'tenant1',
          kind: 'move_out',
          moveInId: moveIn,
          conditions: {'kitchen__sink': 'poor', 'living__walls': 'fair'},
        );
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);
        await tester.tap(find.byKey(const Key('inspection-move_out')));
        await tester.pumpAndSettle();

        // two items got worse; nothing is judged until a person decides
        expect(find.byKey(const Key('compareReport')), findsOneWidget);
        expect(find.byKey(const Key('cmp-kitchen__sink')), findsOneWidget);
        expect(find.byKey(const Key('cmp-living__walls')), findsOneWidget);
        expect((await tile(env, tester, 'pendingAssessment')), contains('2'));
        expect((await tile(env, tester, 'damageTotal')), contains('0'));

        // kitchen sink: damage of 350 SAR
        await env.tapKey(tester, 'roomHeader-kitchen');
        await env.tapFinder(
          tester,
          find.byKey(const ValueKey('assess-sink-null')),
        );
        await tester.tap(find.text('ضرر على المستأجر').last);
        await tester.pumpAndSettle();
        await env.fill(tester, 'cost-kitchen__sink', '350');
        await env.tapKey(tester, 'saveCost-kitchen__sink');
        expect(
          env.inspections.itemsOf(out)['kitchen__sink']!.assessment,
          'damage',
        );
        expect(env.inspections.itemsOf(out)['kitchen__sink']!.costSar, 350);
        expect((await tile(env, tester, 'damageTotal')), contains('350'));
        expect((await tile(env, tester, 'pendingAssessment')), contains('1'));

        // living-room walls: normal wear costs nothing
        await env.tapKey(tester, 'roomHeader-living');
        await env.tapFinder(
          tester,
          find.byKey(const ValueKey('assess-walls-null')),
        );
        await tester.tap(find.text('استهلاك عادي').last);
        await tester.pumpAndSettle();
        expect(
          env.inspections.itemsOf(out)['living__walls']!.assessment,
          'wear',
        );
        expect((await tile(env, tester, 'damageTotal')), contains('350'));
        expect((await tile(env, tester, 'pendingAssessment')), contains('0'));
      },
    );

    testWidgets(
      'only a sealed move-in of the same lease is offered for comparison',
      (tester) async {
        final env = TestEnv();
        final lease = await env.seedLease();
        final sealed = env.inspections.seed(leaseId: lease, status: 'sealed');
        await env.pump(tester, session: ownerSession);
        await openInspectionsFromHome(env, tester);
        await tester.tap(find.byKey(const Key('inspLease')));
        await tester.pumpAndSettle();
        await tester.tap(find.text('برج النخيل · شقة 3 · سالم').last);
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('inspKind')));
        await tester.pumpAndSettle();
        await tester.tap(find.text('فحص التسليم').last);
        await tester.pumpAndSettle();
        expect(
          find.text('سيُقارَن هذا الفحص بفحص الاستلام الموثّق.'),
          findsOneWidget,
        );
        await env.tapKey(tester, 'startInspection');
        final created = env.inspections.ids.firstWhere((i) => i != sealed);
        expect(env.inspections.get(created)!.moveInId, sealed);
        expect(env.inspections.get(created)!.kind, 'move_out');
      },
    );
  });

  group('property health record', () {
    testWidgets('the Record tab shows the lease and the signed inspection', (
      tester,
    ) async {
      final env = TestEnv();
      final lease = await env.seedLease();
      env.inspections.seed(
        leaseId: lease,
        status: 'sealed',
        sealedAt: DateTime.utc(2026, 1, 2, 10),
      );
      await env.pump(tester, session: ownerSession);
      await env.tapKey(tester, 'dock-2');
      expect(find.byKey(const Key('healthRecord')), findsOneWidget);
      expect(find.text('فحص استلام موثّق · شقة 3'), findsOneWidget);
      expect(find.text('بداية عقد · شقة 3'), findsOneWidget);
    });

    testWidgets('with no records it says what will appear', (tester) async {
      final env = TestEnv();
      await env.pump(tester, session: ownerSession);
      await env.tapKey(tester, 'dock-2');
      expect(
        find.text('ستظهر هنا أحداث العقار: العقود والفحوصات والمصروفات.'),
        findsOneWidget,
      );
    });
  });
}
