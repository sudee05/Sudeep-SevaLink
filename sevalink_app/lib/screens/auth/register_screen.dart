import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';
import '../../theme/app_theme.dart';
import '../widgets/sevalink_logo.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String _role = 'customer';
  bool _obscure = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final err = await ref.read(authProvider.notifier).signUp(
          email: _emailCtrl.text.trim(),
          password: _passCtrl.text,
          fullName: _nameCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
          role: _role,
        );
    if (err != null && mounted) {
      showSnack(context, err, isError: true);
    } else if (mounted) {
      context.pushReplacement('/verify-email');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).isLoading;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                const SevalinkLogo(),
                const SizedBox(height: 40),
                Text('Create Account',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('Join SevaLink as a customer or provider',
                    style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 28),

                // Role toggle
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.darkBorder),
                  ),
                  padding: const EdgeInsets.all(4),
                  child: Row(
                    children: [
                      _roleChip('Customer', 'customer'),
                      _roleChip('Service Provider', 'provider'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Full Name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) =>
                      v == null || v.trim().length < 2 ? 'Full name required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (v) =>
                      v == null || !v.contains('@') ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: 'Phone number',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  validator: (v) =>
                      v == null || v.trim().length < 10 ? 'Enter a valid phone' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    hintText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) =>
                      v == null || v.length < 6 ? 'At least 6 characters' : null,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: loading ? null : _submit,
                    child: loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(_role == 'provider'
                            ? 'Create provider account'
                            : 'Create customer account'),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Already have an account? ",
                        style: Theme.of(context).textTheme.bodyMedium),
                    GestureDetector(
                      onTap: () => context.pushReplacement('/login'),
                      child: Text('Login',
                          style: TextStyle(
                              color: AppColors.primary, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, String value) {
    final selected = _role == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _role = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.darkMuted,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
