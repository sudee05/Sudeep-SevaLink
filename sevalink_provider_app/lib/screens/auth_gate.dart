import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/provider_api.dart';
import 'auth_screen.dart';
import 'provider_shell.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final StreamSubscription<AuthState> _subscription;
  bool _signedIn = ProviderApi.currentUser != null;

  @override
  void initState() {
    super.initState();
    _subscription = ProviderApi.client.auth.onAuthStateChange.listen((state) {
      if (mounted) setState(() => _signedIn = state.session?.user != null);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _signedIn ? const ProviderShell() : const AuthScreen();
  }
}
