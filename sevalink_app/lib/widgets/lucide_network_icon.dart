import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class LucideNetworkIcon extends StatelessWidget {
  final String? name;
  final double size;
  final Color? color;

  const LucideNetworkIcon({
    super.key,
    required this.name,
    this.size = 24,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final iconName = _toLucideKebabCase(name);
    if (iconName == null || iconName.isEmpty) {
      return Icon(Icons.help_outline, size: size, color: color);
    }

    final url = 'https://unpkg.com/lucide-static/icons/$iconName.svg';
    final colorFilter = color == null
        ? null
        : ColorFilter.mode(color!, BlendMode.srcIn);

    return SvgPicture.network(
      url,
      width: size,
      height: size,
      colorFilter: colorFilter,
      placeholderBuilder: (context) => SizedBox(
        width: size,
        height: size,
        child: const Center(
          child: CircularProgressIndicator(strokeWidth: 1.5),
        ),
      ),
      errorBuilder: (context, error, stackTrace) =>
          Icon(Icons.help_outline, size: size, color: color),
    );
  }
}

String? _toLucideKebabCase(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;

  return trimmed
      .replaceAllMapped(
        RegExp(r'([a-z0-9])([A-Z])'),
        (match) => '${match.group(1)}-${match.group(2)}',
      )
      .replaceAll(RegExp(r'[\s_]+'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .toLowerCase();
}
