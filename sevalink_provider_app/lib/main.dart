import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/auth_gate.dart';
import 'theme/app_theme.dart';

const String supabaseUrl = 'https://giygtxqatkrgjeuojgma.supabase.co';
const String supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpeWd0eHFhdGtyZ2pldW9qZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Njk0MTcsImV4cCI6MjA5OTQ0NTQxN30.7g7oQjtBQTMpywe7iIPJcxP6Yh2BOUjA8ybzHCXDmWY';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const SevaLinkProviderApp());
}

class SevaLinkProviderApp extends StatefulWidget {
  const SevaLinkProviderApp({super.key});

  @override
  State<SevaLinkProviderApp> createState() => _SevaLinkProviderAppState();

  /// Allows any descendant to call `SevaLinkProviderApp.of(context).toggleTheme()`.
  static _SevaLinkProviderAppState of(BuildContext context) =>
      context.findAncestorStateOfType<_SevaLinkProviderAppState>()!;
}

class _SevaLinkProviderAppState extends State<SevaLinkProviderApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  void toggleTheme() {
    setState(() {
      _themeMode =
          _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SevaLink Provider',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: _themeMode,
      home: const AuthGate(),
    );
  }
}