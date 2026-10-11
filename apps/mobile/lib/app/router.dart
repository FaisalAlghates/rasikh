import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_screen.dart';
import '../features/home/home_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/workspace/workspace_screen.dart';
import 'providers.dart';

abstract final class Routes {
  static const home = '/';
  static const auth = '/auth';
  static const onboarding = '/onboarding';
  static const workspace = '/workspace';
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

      if (user == null) {
        return (loc == Routes.home || loc == Routes.auth) ? null : Routes.auth;
      }
      if (!user.hasOrg) return loc == Routes.onboarding ? null : Routes.onboarding;
      return loc == Routes.workspace ? null : Routes.workspace;
    },
    routes: [
      GoRoute(path: Routes.home, builder: (_, _) => const HomeScreen()),
      GoRoute(path: Routes.auth, builder: (_, _) => const AuthScreen()),
      GoRoute(path: Routes.onboarding, builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: Routes.workspace, builder: (_, _) => const WorkspaceScreen()),
    ],
  );
});
