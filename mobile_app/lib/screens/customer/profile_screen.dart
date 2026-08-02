import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';
import '../../theme/app_theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _avatarCtrl;
  bool _editing = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authProvider).profile;
    _nameCtrl = TextEditingController(text: profile?.fullName ?? '');
    _phoneCtrl = TextEditingController(text: profile?.phone ?? '');
    _avatarCtrl = TextEditingController(text: profile?.avatarUrl ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _avatarCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final err = await ref.read(authProvider.notifier).updateProfile(
          fullName: _nameCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
          avatarUrl: _avatarCtrl.text.trim(),
        );
    if (err != null && mounted) {
      showSnack(context, err, isError: true);
    } else if (mounted) {
      setState(() => _editing = false);
      showSnack(context, 'Profile updated successfully!');
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await ref.read(authProvider.notifier).signOut();
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final profile = authState.profile;
    final loading = authState.isLoading;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Profile',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    TextButton(
                      onPressed: () {
                        if (_editing) {
                          _save();
                        } else {
                          setState(() => _editing = true);
                        }
                      },
                      child: Text(_editing ? 'Save' : 'Edit',
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Avatar + name
                Center(
                  child: Column(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 44,
                            backgroundColor: AppColors.primary,
                            backgroundImage: profile?.avatarUrl != null && profile!.avatarUrl!.isNotEmpty
                                ? NetworkImage(profile.avatarUrl!)
                                : null,
                            child: (profile?.avatarUrl == null || profile!.avatarUrl!.isEmpty)
                                ? Text(
                                    (profile?.fullName.isNotEmpty == true
                                            ? profile!.fullName[0]
                                            : '?')
                                        .toUpperCase(),
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 30,
                                        fontWeight: FontWeight.w700),
                                  )
                                : null,
                          ),
                          if (_editing)
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 28,
                                height: 28,
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.edit, color: Colors.white, size: 14),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(profile?.fullName ?? '',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          (profile?.role ?? 'customer').toUpperCase(),
                          style: const TextStyle(
                              color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Form fields
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Account Details',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        const SizedBox(height: 16),
                        _ProfileField(
                          label: 'Full Name',
                          controller: _nameCtrl,
                          icon: Icons.person_outline,
                          enabled: _editing,
                        ),
                        const SizedBox(height: 12),
                        _ProfileField(
                          label: 'Email',
                          value: profile?.email ?? '',
                          icon: Icons.email_outlined,
                          enabled: false,
                        ),
                        const SizedBox(height: 12),
                        _ProfileField(
                          label: 'Phone',
                          controller: _phoneCtrl,
                          icon: Icons.phone_outlined,
                          enabled: _editing,
                        ),
                        if (_editing) ...[
                          const SizedBox(height: 12),
                          _ProfileField(
                            label: 'Avatar URL',
                            controller: _avatarCtrl,
                            icon: Icons.image_outlined,
                            enabled: true,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                if (_editing)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: loading ? null : _save,
                      child: loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Profile'),
                    ),
                  ),
                if (_editing) const SizedBox(height: 8),
                if (_editing)
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => setState(() => _editing = false),
                      child: const Text('Discard Changes'),
                    ),
                  ),

                const SizedBox(height: 16),

                // Sign out
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.logout_outlined, color: AppColors.danger),
                    title: const Text('Sign Out',
                        style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                    onTap: _logout,
                  ),
                ),
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  final String label;
  final TextEditingController? controller;
  final String? value;
  final IconData icon;
  final bool enabled;

  const _ProfileField({
    required this.label,
    this.controller,
    this.value,
    required this.icon,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: controller ?? TextEditingController(text: value),
          enabled: enabled,
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 18),
          ),
        ),
      ],
    );
  }
}
