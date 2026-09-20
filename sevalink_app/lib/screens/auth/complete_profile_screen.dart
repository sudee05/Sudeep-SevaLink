import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';

class CompleteProfileScreen extends ConsumerStatefulWidget {
  const CompleteProfileScreen({super.key});
  @override
  ConsumerState<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends ConsumerState<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  final _phone = TextEditingController();

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: ref.read(authProvider).profile?.fullName ?? '');
  }

  @override
  void dispose() { _name.dispose(); _phone.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final error = await ref.read(authProvider.notifier).updateProfile(
      fullName: _name.text.trim(), phone: _phone.text.trim());
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.red));
    } else {
      context.go('/customer');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).isLoading;
    return Scaffold(
      appBar: AppBar(title: const Text('Complete your profile')),
      body: SafeArea(child: Form(key: _formKey, child: ListView(padding: const EdgeInsets.all(24), children: [
        const Text('One last step', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('Please add your details before continuing to Home.'),
        const SizedBox(height: 28),
        TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)), validator: (v) => v == null || v.trim().length < 2 ? 'Enter your full name' : null),
        const SizedBox(height: 16),
        TextFormField(controller: _phone, keyboardType: TextInputType.phone, maxLength: 10, decoration: const InputDecoration(labelText: 'Phone number', prefixIcon: Icon(Icons.phone_outlined), counterText: ''), validator: (v) => v == null || !RegExp(r'^[6-9]\d{9}$').hasMatch(v.trim()) ? 'Enter a valid 10-digit phone number' : null),
        const SizedBox(height: 28),
        SizedBox(height: 52, child: ElevatedButton(onPressed: loading ? null : _save, child: loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Save and continue'))),
      ]))),
    );
  }
}