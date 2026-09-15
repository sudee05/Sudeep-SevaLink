import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/models.dart';
import '../../services/supabase_api.dart' as api;
import '../../theme/app_theme.dart';

final _providerDetailProvider =
    FutureProvider.autoDispose.family<ProviderModel, String>(
  (ref, providerId) => api.getProviderById(providerId),
);

class ProviderDetailScreen extends ConsumerWidget {
  final String providerId;

  const ProviderDetailScreen({super.key, required this.providerId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providerAsync = ref.watch(_providerDetailProvider(providerId));

    return Scaffold(
      appBar: AppBar(title: const Text('Provider Details')),
      body: providerAsync.when(
        data: (provider) => _ProviderDetailContent(provider: provider),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ProviderDetailError(message: error.toString()),
      ),
    );
  }
}

class _ProviderDetailContent extends StatelessWidget {
  final ProviderModel provider;

  const _ProviderDetailContent({required this.provider});

  @override
  Widget build(BuildContext context) {
    final services = provider.services;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ProviderAvatar(provider: provider),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            provider.displayName,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          if ((provider.location ?? '').isNotEmpty)
                            _IconText(
                              icon: Icons.location_on_outlined,
                              text: provider.location!,
                            ),
                          const SizedBox(height: 6),
                          _RatingBadge(rating: provider.rating),
                        ],
                      ),
                    ),
                  ],
                ),
                if ((provider.experience ?? '').isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _DetailLine(label: 'Experience', value: provider.experience!),
                ],
                if ((provider.about ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    provider.about!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
                if (provider.certificates.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: provider.certificates
                        .map((certificate) => Chip(
                              label: Text(certificate),
                              side: const BorderSide(color: AppColors.primary),
                            ))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Services Offered',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (services.isNotEmpty)
                      Text(
                        '${services.length} service${services.length == 1 ? '' : 's'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (services.isEmpty)
                  Text(
                    'No services listed by this provider yet.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  )
                else
                  ...services.map((service) => _ServicePriceTile(service: service)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProviderAvatar extends StatelessWidget {
  final ProviderModel provider;

  const _ProviderAvatar({required this.provider});

  @override
  Widget build(BuildContext context) {
    final imageUrl = provider.imageUrl;
    return Container(
      width: 92,
      height: 92,
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
        image: imageUrl != null && imageUrl.isNotEmpty
            ? DecorationImage(image: NetworkImage(imageUrl), fit: BoxFit.cover)
            : null,
      ),
      child: imageUrl == null || imageUrl.isEmpty
          ? Center(
              child: Text(
                provider.displayName[0].toUpperCase(),
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                ),
              ),
            )
          : null,
    );
  }
}

class _RatingBadge extends StatelessWidget {
  final double rating;

  const _RatingBadge({required this.rating});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star, size: 16, color: AppColors.warning),
          const SizedBox(width: 4),
          Text(
            '${rating.toStringAsFixed(1)} / 5',
            style: const TextStyle(
              color: AppColors.warning,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _IconText extends StatelessWidget {
  final IconData icon;
  final String text;

  const _IconText({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.darkMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodySmall),
        ),
      ],
    );
  }
}

class _DetailLine extends StatelessWidget {
  final String label;
  final String value;

  const _DetailLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        text: '$label: ',
        style: const TextStyle(fontWeight: FontWeight.w700),
        children: [
          TextSpan(
            text: value,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _ServicePriceTile extends StatelessWidget {
  final ProviderServiceModel service;

  const _ServicePriceTile({required this.service});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service.name,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (service.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    service.description,
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            service.price > 0 ? fmt.format(service.price) : 'Price TBD',
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderDetailError extends StatelessWidget {
  final String message;

  const _ProviderDetailError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.danger, size: 42),
            const SizedBox(height: 12),
            Text(
              'Could not load provider information.',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              message.replaceFirst('Exception: ', ''),
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
