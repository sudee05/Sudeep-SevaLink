import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../widgets/sevalink_logo.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _sent = false;
  bool _loading = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() => _loading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(email);
      if (mounted) {
        setState(() => _sent = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reset link sent! Check your email.'),
              backgroundColor: Colors.green));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Forgot Password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SevalinkLogo(),
              const SizedBox(height: 32),
              Text('Reset Password',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text('We will send reset instructions to your email.',
                  style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 28),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  hintText: 'Email address',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _sent || _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(_sent ? 'Link Sent ✓' : 'Send Reset Link'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
