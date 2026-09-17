import 'package:flutter/material.dart';

class SevalinkLogo extends StatelessWidget {
  /// [height] controls the logo image height. Defaults to 36.
  const SevalinkLogo({super.key, this.height = 36});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset(
            'assets/sevalink_logo.png',
            height: height,
            width: height,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            'SevaLink',
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.primary,
                  letterSpacing: -0.3,
                  fontSize: 15,
                ),
          ),
        ),
      ],
    );
  }
}
