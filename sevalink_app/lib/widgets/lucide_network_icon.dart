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
    final iconName = name?.trim().toLowerCase();
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
