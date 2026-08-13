import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key});

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  int _secondsLeft = 180;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft <= 0) {
        _timer?.cancel();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  String _formatCountdown() {
    final m = (_secondsLeft ~/ 60).toString().padLeft(2, '0');
    final s = (_secondsLeft % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.mark_email_unread_outlined,
                    size: 40, color: AppColors.primary),
              ),
              const SizedBox(height: 28),
              Text('Verify Your Email',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Text(
                'We sent a verification link to your email.\nPlease check your inbox and click the link.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 36),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _secondsLeft > 0
                      ? null
                      : () {
                          setState(() => _secondsLeft = 180);
                          _startTimer();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Verification email sent again.'),
                                backgroundColor: Colors.green),
                          );
                        },
                  child: Text(_secondsLeft > 0
                      ? 'Resend in ${_formatCountdown()}'
                      : 'Resend Email'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Go to Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
