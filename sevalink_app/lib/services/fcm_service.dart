import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_api.dart' as api;

/// Call this after Supabase and Firebase are initialized.
/// Gets the FCM token and saves it to the profiles table.
Future<void> initFcm() async {
  try {
    final messaging = FirebaseMessaging.instance;

    // Request permission (iOS + Android 13+)
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus != AuthorizationStatus.authorized) return;

    final token = await messaging.getToken();
    if (token == null) return;

    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    // Persist to Supabase profiles table
    await api.upsertFcmToken(userId, token);

    // Refresh when token rotates
    messaging.onTokenRefresh.listen((newToken) async {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid != null) await api.upsertFcmToken(uid, newToken);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // You can show a local notification here using flutter_local_notifications
      // For now just print for debugging
      print('[FCM] Foreground: ${message.notification?.title} — ${message.notification?.body}');
    });
  } catch (e) {
    // FCM init is non-critical — don't crash the app
    print('[FCM] Init error: $e');
  }
}
