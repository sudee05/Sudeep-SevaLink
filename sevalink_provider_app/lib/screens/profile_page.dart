import 'package:flutter/material.dart';

import '../models/provider_profile.dart';
import '../services/provider_api.dart';
import '../widgets/section_card.dart';
import '../widgets/status_chip.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage(
      {super.key, required this.profile, required this.onSaved});

  final ProviderProfile profile;
  final VoidCallback onSaved;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final _businessName =
      TextEditingController(text: widget.profile.businessName);
  late final _phone = TextEditingController(text: widget.profile.phone);
  late final _location =
      TextEditingController(text: widget.profile.location);
  late final _experience =
      TextEditingController(text: widget.profile.experience);
  late final _certificates =
      TextEditingController(text: widget.profile.certificates.join(', '));
  late final _imageUrl =
      TextEditingController(text: widget.profile.imageUrl);
  late final _about = TextEditingController(text: widget.profile.about);
  bool _saving = false;
  bool _saved = false;

  @override
  void dispose() {
    _businessName.dispose();
    _phone.dispose();
    _location.dispose();
    _experience.dispose();
    _certificates.dispose();
    _imageUrl.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_businessName.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Business name is required')),
      );
      return;
    }
    setState(() {
      _saving = true;
      _saved = false;
    });
    try {
      await ProviderApi.saveProviderProfile(
        current: widget.profile,
        businessName: _businessName.text.trim(),
        phone: _phone.text.trim(),
        location: _location.text.trim(),
        experience: _experience.text.trim(),
        certificates: _certificates.text.trim(),
        imageUrl: _imageUrl.text.trim(),
        about: _about.text.trim(),
      );
      widget.onSaved();
      if (mounted) setState(() => _saved = true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Profile header
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor:
                      Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  backgroundImage: profile.imageUrl.isNotEmpty
                      ? NetworkImage(profile.imageUrl)
                      : null,
                  child: profile.imageUrl.isEmpty
                      ? Icon(Icons.storefront_rounded,
                          color: Theme.of(context).colorScheme.primary)
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.businessName.isEmpty
                            ? profile.fullName
                            : profile.businessName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      StatusChip(status: profile.approvalStatus),
                    ],
                  ),
                ),
                if (profile.rating > 0)
                  Column(
                    children: [
                      const Icon(Icons.star_rounded,
                          color: Colors.amber, size: 20),
                      Text(
                        profile.rating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Edit form
        SectionCard(
          title: 'Business Information',
          child: Column(
            children: [
              _field(_businessName, 'Business Name *',
                  Icons.storefront_outlined),
              _field(_phone, 'Phone', Icons.phone_outlined,
                  type: TextInputType.phone),
              _field(_location, 'Location / City',
                  Icons.location_on_outlined),
              _field(_experience, 'Experience (e.g. 5 years)',
                  Icons.workspace_premium_outlined),
              _field(
                _certificates,
                'Certificates (comma separated)',
                Icons.verified_outlined,
              ),
              _field(_imageUrl, 'Profile Image URL',
                  Icons.image_outlined),
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TextField(
                  controller: _about,
                  decoration: const InputDecoration(
                    labelText: 'About your business',
                    prefixIcon: Icon(Icons.info_outline_rounded),
                  ),
                  maxLines: 4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_rounded),
                label: Text(_saving ? 'Saving…' : 'Save Changes'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
        if (_saved)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              children: const [
                Icon(Icons.check_circle_rounded,
                    color: Colors.green, size: 18),
                SizedBox(width: 6),
                Text(
                  'Profile saved successfully!',
                  style: TextStyle(
                      color: Colors.green, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _field(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    TextInputType type = TextInputType.text,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
        ),
        keyboardType: type,
      ),
    );
  }
}
