import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class SevalinkLogo extends StatelessWidget {
  const SevalinkLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.handshake_outlined, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Seva',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  fontFamily: 'Outfit',
                ),
              ),
              TextSpan(
                text: 'Link',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w400,
                  color: Theme.of(context).colorScheme.onSurface,
                  fontFamily: 'Outfit',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
