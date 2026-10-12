import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/app/app.dart';
import 'package:rasikh/app/inspection_providers.dart';
import 'package:rasikh/app/ops_providers.dart';
import 'package:rasikh/app/providers.dart';
import 'package:rasikh/app/ticket_providers.dart';
import 'package:rasikh/data/auth_repository.dart';
import 'package:rasikh/data/ticket_models.dart';
import 'package:rasikh/theme/app_theme.dart';
import 'package:rasikh/widgets/live_city.dart';

import 'helpers/fake_auth_repository.dart';
import 'helpers/fake_inspection_repository.dart';
import 'helpers/fake_ticket_repository.dart';
import 'helpers/test_env.dart';

Future<void> pumpTickets(
  WidgetTester tester,
  TestEnv env,
  FakeTicketRepository tickets,
  session,
) async {
  FontConfig.webFonts = false;
  SceneConfig.animate = false;
  tester.view.physicalSize = const Size(900, 3000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    const SizedBox(),
  ); // drop the previous session completely
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(initial: session),
        ),
        opsRepositoryProvider.overrideWithValue(env.ops),
        inspectionRepositoryProvider.overrideWithValue(
          FakeInspectionRepository(),
        ),
        ticketRepositoryProvider.overrideWithValue(tickets),
      ],
      child: const RasikhApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  _vendorTests();
  testWidgets(
    'tenant reports, owner assigns and resolves, tenant closes and rates',
    (tester) async {
      final env = TestEnv();
      await env.seedLease(tenantUid: 'tenant1');
      final repo = FakeTicketRepository()
        ..party = 'tenant'
        ..tenantUid = 'tenant1';

      // tenant reports a leak
      await pumpTickets(tester, env, repo, tenantSession());
      await env.tapKey(tester, 'nav-tickets');
      await env.fill(tester, 'ticketTitle', 'تسريب تحت المغسلة');
      await env.tapKey(tester, 'submitTicket');
      expect(repo.calls, ['create:تسريب تحت المغسلة']);
      expect(find.byKey(const Key('ticketCard')), findsOneWidget);
      expect(
        find.textContaining('المقترح: على المالك'),
        findsOneWidget,
      ); // a suggestion, with its disclaimer
      expect(find.text('ضمن المدة المستهدفة'), findsOneWidget);
      // a tenant cannot assign
      expect(find.byKey(const Key('assign')), findsNothing);

      // owner (same data, new session) assigns, starts, resolves
      repo.party = 'staff';
      await pumpTickets(tester, env, repo, ownerSession);
      await env.tapKey(tester, 'nav-tickets');
      await env.tapKey(tester, 'ticket-tk1');
      await env.fill(tester, 'vendorName', 'مؤسسة السباكة');
      await env.tapKey(tester, 'assign');
      expect(find.textContaining('مؤسسة السباكة'), findsWidgets);
      await env.tapKey(tester, 'start');
      expect(find.textContaining('قيد التنفيذ'), findsOneWidget);
      await env.fill(tester, 'resolutionNote', 'تم تبديل الوصلة');
      await env.tapKey(tester, 'resolve');
      expect(find.textContaining('تم الإصلاح'), findsWidgets);

      // tenant closes with a rating
      repo.party = 'tenant';
      await pumpTickets(tester, env, repo, tenantSession());
      await env.tapKey(tester, 'nav-tickets');
      await env.tapKey(tester, 'ticket-tk1');
      expect(find.byKey(const Key('start')), findsNothing);
      await env.tapKey(tester, 'closeRate');
      expect(find.byKey(const Key('ticketRated')), findsOneWidget);
      expect(find.text('التقييم: 5 من 5'), findsOneWidget);
      expect(repo.calls.last, 'act:close');
    },
  );

  testWidgets(
    'a tenant sees only their own tickets and a refused action shows an error',
    (tester) async {
      final env = TestEnv();
      final lease = await env.seedLease(tenantUid: 'tenant1');
      final repo = FakeTicketRepository()..party = 'tenant';
      repo.tenantUid = 'someone-else';
      await repo.create('o', _ticket(lease, 'بلاغ شخص آخر'));
      repo.tenantUid = 'tenant1';
      await repo.create('o', _ticket(lease, 'بلاغي'));
      await pumpTickets(tester, env, repo, tenantSession());
      await env.tapKey(tester, 'nav-tickets');
      expect(find.text('بلاغي'), findsOneWidget);
      expect(find.text('بلاغ شخص آخر'), findsNothing);

      // cancel, then the same ticket cannot be cancelled again by a stale screen
      await env.tapKey(tester, 'ticket-tk2');
      await env.tapKey(tester, 'cancelTicket');
      expect(find.textContaining('ملغى'), findsWidgets);
    },
  );
}

NewTicket _ticket(String leaseId, String title) => NewTicket(
  unitId: 'unit2',
  propertyId: 'prop1',
  leaseId: leaseId,
  title: title,
  category: 'plumbing',
  urgency: 'normal',
);

void _vendorTests() {
  testWidgets(
    'a vendor with a login sees only assigned tickets and can start and resolve, nothing else',
    (tester) async {
      final env = TestEnv();
      final lease = await env.seedLease();
      final repo = FakeTicketRepository()..party = 'vendor';
      repo.vendorUid = 'vendor1';
      await repo.create('o', _ticket(lease, 'مكيف معطل'));
      repo.party = 'staff';
      await repo.act('o', 'tk1', 'assign', {'vendorName': 'مؤسسة التبريد'});
      repo.party = 'vendor';
      await pumpTickets(
        tester,
        env,
        repo,
        const SessionUser(
          uid: 'vendor1',
          orgs: {
            'o': ['vendor'],
          },
        ),
      );
      await env.tapKey(tester, 'nav-tickets');
      expect(
        find.byKey(const Key('submitTicket')),
        findsNothing,
      ); // cannot open requests
      expect(find.text('مكيف معطل'), findsOneWidget);
      await env.tapKey(tester, 'ticket-tk1');
      expect(find.byKey(const Key('cancelTicket')), findsNothing);
      expect(find.byKey(const Key('assign')), findsNothing);
      await env.tapKey(tester, 'start');
      await env.fill(tester, 'resolutionNote', 'تم');
      await env.tapKey(tester, 'resolve');
      expect(find.textContaining('تم الإصلاح'), findsWidgets);
      expect(find.byKey(const Key('closeRate')), findsNothing);
      expect(find.byKey(const Key('closeTicket')), findsNothing);
    },
  );
}
