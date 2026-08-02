import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../services/supabase_api.dart' as api;

// ── Auth Provider ─────────────────────────────────────────────

class AuthState {
  final AppUser? profile;
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.profile, this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null && profile != null;

  AuthState copyWith({AppUser? profile, User? user, bool? isLoading, String? error}) => AuthState(
        profile: profile ?? this.profile,
        user: user ?? this.user,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    final session = Supabase.instance.client.auth.currentSession;
    if (session?.user != null) {
      try {
        final profile = await api.getProfile(session!.user.id);
        state = AuthState(user: session.user, profile: profile, isLoading: false);
      } catch (_) {
        state = const AuthState(isLoading: false);
      }
    } else {
      state = const AuthState(isLoading: false);
    }
    // Listen to auth changes
    Supabase.instance.client.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final session = data.session;
      if (event == AuthChangeEvent.signedIn && session != null) {
        try {
          final profile = await api.getProfile(session.user.id);
          state = AuthState(user: session.user, profile: profile);
        } catch (_) {
          state = AuthState(user: session.user);
        }
      } else if (event == AuthChangeEvent.signedOut) {
        state = const AuthState();
      }
    });
  }

  Future<String?> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await api.signInWithEmail(email: email, password: password);
      state = AuthState(
        user: res['user'] as User,
        profile: res['profile'] as AppUser,
        isLoading: false,
      );
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return e.toString();
    }
  }

  Future<String?> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    String role = 'customer',
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await api.signUpWithEmail(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
        role: role,
      );
      state = state.copyWith(isLoading: false);
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return e.toString();
    }
  }

  Future<void> signOut() async {
    await api.signOut();
    state = const AuthState();
  }

  Future<String?> updateProfile({String? fullName, String? phone, String? avatarUrl}) async {
    final userId = state.profile?.id;
    if (userId == null) return 'Not authenticated';
    state = state.copyWith(isLoading: true);
    try {
      final updated = await api.updateProfile(userId, {
        if (fullName != null) 'full_name': fullName!,
        if (phone != null) 'phone': phone!,
        if (avatarUrl != null) 'avatar_url': avatarUrl!,
      });
      state = state.copyWith(profile: updated, isLoading: false);
      return null;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return e.toString();
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

// ── Theme Provider ────────────────────────────────────────────

class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier() : super(ThemeMode.dark);
  void toggle() => state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
}

final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) => ThemeNotifier());

// ── Snackbar helper ───────────────────────────────────────────

void showSnack(BuildContext context, String msg, {bool isError = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
  );
}
