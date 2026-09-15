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
  bool _checkingSession = true;
  bool _signedIn = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _verifyCurrentSession();
    _subscription = ProviderApi.client.auth.onAuthStateChange.listen((state) {
      if (state.session?.user != null) {
        _verifyCurrentSession();
      } else if (state.event == AuthChangeEvent.signedOut ||
          state.event == AuthChangeEvent.initialSession) {
        if (mounted) {
          setState(() {
            _checkingSession = false;
            _signedIn = false;
          });
        }
      }
    });
  }

  Future<void> _verifyCurrentSession() async {
    final user = ProviderApi.client.auth.currentSession?.user;
    if (user == null) {
      if (mounted) {
        setState(() {
          _checkingSession = false;
          _signedIn = false;
        });
      }
      return;
    }
    try {
      await ProviderApi.ensureProviderRole(user.id);
      if (mounted) {
        setState(() {
          _checkingSession = false;
          _signedIn = true;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _checkingSession = false;
          _signedIn = false;
          _error = ProviderApi.authErrorMessage(error, signingUp: false);
        });
      }
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingSession) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return _signedIn ? const ProviderShell() : AuthScreen(initialError: _error);
  }
}
