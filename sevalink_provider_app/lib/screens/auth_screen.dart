import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/provider_api.dart';
import 'email_confirmation_screen.dart';

String? _required(String? value) =>
    (value == null || value.trim().isEmpty) ? 'Required' : null;

String? _emailValidator(String? value) {
  final required = _required(value);
  if (required != null) return required;
  final email = value!.trim();
  final valid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  return valid ? null : 'Enter a valid email address';
}

String? _phoneValidator(String? value) {
  if (value == null || value.trim().isEmpty) return 'Phone number is required';
  final digits = value.trim().replaceAll(RegExp(r'\s+'), '');
  if (!RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
    return 'Enter a valid 10-digit mobile number';
  }
  return null;
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.initialError});

  final String? initialError;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _address = TextEditingController();
  bool _signup = false;
  bool _busy = false;
  bool _showPassword = false;
  bool _showConfirmation = false;
  bool _forgotMode = false;
  bool _resetEmailSent = false;
  File? _avatarFile;
  bool _pickingImage = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _error = widget.initialError;
  }

  @override
  void didUpdateWidget(covariant AuthScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialError != oldWidget.initialError) {
      _error = widget.initialError;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    setState(() => _pickingImage = true);
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      if (picked != null && mounted) setState(() => _avatarFile = File(picked.path));
    } finally {
      if (mounted) setState(() => _pickingImage = false);
    }
  }

  Future<void> _submitForgotPassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth
          .resetPasswordForEmail(_email.text.trim());
      if (mounted) setState(() => _resetEmailSent = true);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              ProviderApi.authErrorMessage(error, signingUp: false),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_signup) {
        await ProviderApi.signUp(
          fullName: _name.text.trim(),
          phone: _phone.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
          address: _address.text.trim(),
          avatarFile: _avatarFile,
        );
        if (mounted) setState(() => _showConfirmation = true);
      } else {
        await ProviderApi.signIn(_email.text.trim(), _password.text);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              ProviderApi.authErrorMessage(error, signingUp: _signup),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signInWithGoogle() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ProviderApi.signInWithGoogle();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              ProviderApi.authErrorMessage(error, signingUp: false),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_showConfirmation) {
      return EmailConfirmationScreen(
        onLogin: () => setState(() {
          _showConfirmation = false;
          _password.clear();
          _error = null;
        }),
      );
    }

    // ── Forgot password mode ──────────────────────────────────
    if (_forgotMode) {
      return _buildForgotPasswordScreen(context);
    }

    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                children: [
                  // Logo / header
                  Image.asset(
                    'assets/sevalink_logo.png',
                    height: 64,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    _signup ? 'Create Provider Account' : 'SevaLink Provider',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _signup
                        ? 'Sign up to manage services and bookings.'
                        : 'Login to accept bookings and chat with customers.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: const Color(0xFF6B7280)),
                  ),
                  const SizedBox(height: 28),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_signup) ...[
                              // Avatar picker
                              Center(
                                child: GestureDetector(
                                  onTap: _pickingImage ? null : _pickAvatar,
                                  child: Stack(
                                    children: [
                                      CircleAvatar(
                                        radius: 40,
                                        backgroundColor:
                                            cs.primary.withValues(alpha: 0.12),
                                        backgroundImage: _avatarFile != null
                                            ? FileImage(_avatarFile!)
                                            : null,
                                        child: _avatarFile == null
                                            ? Icon(Icons.person_outline,
                                                size: 40, color: cs.primary)
                                            : null,
                                      ),
                                      Positioned(
                                        bottom: 0,
                                        right: 0,
                                        child: Container(
                                          padding: const EdgeInsets.all(5),
                                          decoration: BoxDecoration(
                                            color: cs.primary,
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                                color: Theme.of(context)
                                                    .scaffoldBackgroundColor,
                                                width: 2),
                                          ),
                                          child: _pickingImage
                                              ? const SizedBox(
                                                  width: 10,
                                                  height: 10,
                                                  child: CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      color: Colors.white))
                                              : const Icon(Icons.camera_alt,
                                                  size: 10,
                                                  color: Colors.white),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Center(
                                child: Text(
                                  'Profile photo (optional)',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                          color: const Color(0xFF9CA3AF)),
                                ),
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _name,
                                decoration: const InputDecoration(
                                  labelText: 'Full Name',
                                  prefixIcon: Icon(Icons.person_outline),
                                ),
                                validator: _required,
                                textInputAction: TextInputAction.next,
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _phone,
                                decoration: const InputDecoration(
                                  labelText: 'Phone (10 digits)',
                                  prefixIcon: Icon(Icons.phone_outlined),
                                  counterText: '',
                                ),
                                keyboardType: TextInputType.phone,
                                maxLength: 10,
                                validator: _phoneValidator,
                                textInputAction: TextInputAction.next,
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _address,
                                decoration: const InputDecoration(
                                  labelText: 'Business Address',
                                  prefixIcon: Icon(Icons.location_on_outlined),
                                  alignLabelWithHint: true,
                                ),
                                keyboardType: TextInputType.streetAddress,
                                maxLines: 2,
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty)
                                        ? 'Address is required'
                                        : null,
                                textInputAction: TextInputAction.next,
                              ),
                              const SizedBox(height: 14),
                            ],
                            TextFormField(
                              controller: _email,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              validator: _emailValidator,
                              textInputAction: TextInputAction.next,
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _password,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _showPassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                  ),
                                  onPressed: () => setState(
                                      () => _showPassword = !_showPassword),
                                ),
                              ),
                              obscureText: !_showPassword,
                              validator: (value) =>
                                  (value ?? '').length < 6
                                      ? 'Use at least 6 characters'
                                      : null,
                              onFieldSubmitted: (_) => _submit(),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: cs.error.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline,
                                        color: cs.error, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style:
                                            TextStyle(color: cs.error, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 20),
                            FilledButton(
                              onPressed: _busy ? null : _submit,
                              style: FilledButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 14),
                              ),
                              child: _busy
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white),
                                    )
                                  : Text(
                                      _signup ? 'Create Account' : 'Login',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700),
                                    ),
                            ),
                            if (!_signup) ...[
                              const SizedBox(height: 12),
                              // ── OR divider ───────────────────
                              Row(
                                children: [
                                  const Expanded(child: Divider()),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    child: Text('OR',
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: const Color(0xFF9CA3AF),
                                              letterSpacing: 1.2,
                                            )),
                                  ),
                                  const Expanded(child: Divider()),
                                ],
                              ),
                              const SizedBox(height: 12),
                              // ── Google Sign-In button ────────
                              OutlinedButton.icon(
                                onPressed: _busy ? null : _signInWithGoogle,
                                icon: Image.network(
                                  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                                  height: 20,
                                  width: 20,
                                  errorBuilder: (_, __, ___) =>
                                      const Icon(Icons.g_mobiledata, size: 24),
                                ),
                                label: const Text('Sign in with Google'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 14),
                                  side: BorderSide(
                                      color: cs.outline.withValues(alpha: 0.3)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => setState(() {
                                        _signup = !_signup;
                                        _error = null;
                                      }),
                              child: Text(
                                _signup
                                    ? 'Already have an account? Login'
                                    : 'New provider? Create account',
                              ),
                            ),
                            if (!_signup)
                              TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => setState(() {
                                          _forgotMode = true;
                                          _resetEmailSent = false;
                                          _error = null;
                                          _email.clear();
                                        }),
                                child: const Text('Forgot password?'),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

extension _ForgotPasswordExt on _AuthScreenState {
  Widget _buildForgotPasswordScreen(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (_resetEmailSent) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.mark_email_read_outlined,
                          size: 56, color: Colors.green),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Check Your Email',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "We've sent a reset link to\n${_email.text.trim()}",
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: const Color(0xFF6B7280)),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Check your spam folder if you don't see it.",
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: const Color(0xFF9CA3AF)),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 36),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => setState(() {
                          _forgotMode = false;
                          _resetEmailSent = false;
                          _signup = false;
                          _error = null;
                        }),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text(
                          'Back to Login',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    // Forgot password entry form
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                children: [
                  Image.asset(
                    'assets/sevalink_logo.png',
                    height: 56,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Forgot Password',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Enter your email and we'll send you a reset link.",
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: const Color(0xFF6B7280)),
                  ),
                  const SizedBox(height: 28),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _email,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              validator: _emailValidator,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _submitForgotPassword(),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: cs.error.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline,
                                        color: cs.error, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style: TextStyle(
                                            color: cs.error, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 20),
                            FilledButton(
                              onPressed: _busy ? null : _submitForgotPassword,
                              style: FilledButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: _busy
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white),
                                    )
                                  : const Text(
                                      'Send Reset Link',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w700),
                                    ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => setState(() {
                                        _forgotMode = false;
                                        _error = null;
                                      }),
                              child: const Text('Back to Login'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
