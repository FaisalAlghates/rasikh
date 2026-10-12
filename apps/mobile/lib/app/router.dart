import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_screen.dart';
import '../features/gallery/gallery_screen.dart';
import '../features/intro/intro_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/inspect/inspection_screen.dart';
import '../features/inspect/inspections_screen.dart';
import '../features/account/privacy_screen.dart';
import '../features/ai/assistant_screen.dart';
import '../features/broker/ad_checker_screen.dart';
import '../features/broker/broker_screen.dart';
import '../features/broker/lead_screen.dart';
import '../features/building/buildings_screen.dart';
import '../features/building/my_buildings_screen.dart';
import '../features/maint/tickets_screen.dart';
import '../features/ops/expenses_screen.dart';
import '../features/ops/lease_form_screen.dart';
import '../features/ops/leases_screen.dart';
import '../features/ops/properties_screen.dart';
import '../features/ops/report_screen.dart';
import '../features/shell/app_shell.dart';
import 'providers.dart';

abstract final class Routes {
  static const home = '/';
  static const auth = '/auth';
  static const onboarding = '/onboarding';
  static const workspace = '/workspace';
  static const gallery = '/gallery';

  // Pushed above the shell once the user has an organization.
  static const properties = '/properties';
  static const leases = '/leases';
  static const expenses = '/expenses';
  static const report = '/report';
  static const inspections = '/inspections';
  static const tickets = '/tickets';
  static const buildings = '/buildings';
  static const myBuildings = '/my-buildings';
  static const assistant = '/assistant';
  static const privacy = '/privacy-rights';
  static const broker = '/broker';
  static const brokerAd = '/broker/ad';
  static String ticketFor(String id) => '/tickets/$id';
  static String inspectionFor(String id) => '/inspections/$id';
  static String leaseFor(String id) => '/leases/$id';
  static String leaseNewFor(String unitId) => '/lease/new/$unitId';

  static bool isWorkspace(String loc) =>
      loc == workspace ||
      loc == properties ||
      loc == expenses ||
      loc == report ||
      loc == leases ||
      loc == inspections ||
      loc == tickets ||
      loc == buildings ||
      loc == myBuildings ||
      loc == assistant ||
      loc == privacy ||
      loc == broker ||
      loc.startsWith('$broker/') ||
      loc.startsWith('$tickets/') ||
      loc.startsWith('$inspections/') ||
      loc.startsWith('$leases/') ||
      loc.startsWith('/lease/new/');
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: Routes.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      if (session.isLoading) return null;
      final user = session.value;
      final loc = state.matchedLocation;

      // The gallery is a design tool, reachable from the profile tab in debug builds.
      if (loc == Routes.gallery) return kDebugMode ? null : Routes.home;

      if (user == null) {
        return (loc == Routes.home || loc == Routes.auth) ? null : Routes.auth;
      }
      if (!user.hasOrg) {
        return loc == Routes.onboarding ? null : Routes.onboarding;
      }
      return Routes.isWorkspace(loc) ? null : Routes.workspace;
    },
    routes: [
      GoRoute(path: Routes.home, builder: (_, _) => const IntroScreen()),
      GoRoute(path: Routes.auth, builder: (_, _) => const AuthScreen()),
      GoRoute(
        path: Routes.onboarding,
        builder: (_, _) => const OnboardingScreen(),
      ),
      GoRoute(path: Routes.workspace, builder: (_, _) => const AppShell()),
      GoRoute(
        path: Routes.properties,
        builder: (_, _) => const PropertiesScreen(),
      ),
      GoRoute(path: Routes.leases, builder: (_, _) => const LeasesScreen()),
      GoRoute(
        path: '/leases/:id',
        builder: (_, s) => LeaseDetailScreen(leaseId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/lease/new/:unitId',
        builder: (_, s) => LeaseFormScreen(unitId: s.pathParameters['unitId']!),
      ),
      GoRoute(path: Routes.expenses, builder: (_, _) => const ExpensesScreen()),
      GoRoute(path: Routes.report, builder: (_, _) => const ReportScreen()),
      GoRoute(
        path: Routes.myBuildings,
        builder: (_, _) => const MyBuildingsScreen(),
      ),
      GoRoute(
        path: Routes.buildings,
        builder: (_, _) => const BuildingsScreen(),
      ),
      GoRoute(
        path: Routes.assistant,
        builder: (_, _) => const AssistantScreen(),
      ),
      GoRoute(path: Routes.privacy, builder: (_, _) => const PrivacyScreen()),
      GoRoute(path: Routes.broker, builder: (_, _) => const BrokerScreen()),
      GoRoute(
        path: Routes.brokerAd,
        builder: (_, _) => const AdCheckerScreen(),
      ),
      GoRoute(
        path: '/broker/lead/:id',
        builder: (_, s) => LeadScreen(leadId: s.pathParameters['id']!),
      ),
      GoRoute(path: Routes.tickets, builder: (_, _) => const TicketsScreen()),
      GoRoute(
        path: '/tickets/:id',
        builder: (_, s) => TicketScreen(ticketId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: Routes.inspections,
        builder: (_, _) => const InspectionsScreen(),
      ),
      GoRoute(
        path: '/inspections/:id',
        builder: (_, s) =>
            InspectionScreen(inspectionId: s.pathParameters['id']!),
      ),
      GoRoute(path: Routes.gallery, builder: (_, _) => const GalleryScreen()),
    ],
  );
});
