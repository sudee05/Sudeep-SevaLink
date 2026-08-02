import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/supabase_config.dart';
import 'providers/app_providers.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import 'services/fcm_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey); // ignore: deprecated_member_use

  // Initialize Firebase (optional — skip if google-services.json not added yet)
  try {
    await Firebase.initializeApp();
    await initFcm();
  } catch (e) {
    debugPrint('[Firebase] Not configured yet: $e');
  }

  runApp(const ProviderScope(child: SevaLinkApp()));
}

class SevaLinkApp extends ConsumerWidget {
  const SevaLinkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return MaterialApp.router(
      title: 'SevaLink',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      routerConfig: buildRouter(ref),
    );
  }
}
