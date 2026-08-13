import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String _method = 'upi';
  final _idCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Secure Checkout',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('Choose a payment method to complete booking.',
                style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _MethodTile('UPI', 'upi', Icons.account_balance_wallet_outlined, _method,
                        (v) => setState(() => _method = v)),
                    _MethodTile('Card', 'card', Icons.credit_card_outlined, _method,
                        (v) => setState(() => _method = v)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _idCtrl,
                      decoration: InputDecoration(
                        hintText: _method == 'upi' ? 'UPI ID (e.g. name@upi)' : 'Card number',
                        prefixIcon: Icon(_method == 'upi'
                            ? Icons.account_balance_wallet_outlined
                            : Icons.credit_card_outlined),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.lock_outline, size: 16),
                        label: const Text('Pay Now'),
                        onPressed: () => context.go('/customer/booking/success'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => context.go('/customer/booking/failed'),
                        child: const Text('Simulate Failure'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MethodTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final String current;
  final ValueChanged<String> onChanged;

  const _MethodTile(this.label, this.value, this.icon, this.current, this.onChanged);

  @override
  Widget build(BuildContext context) {
    final selected = current == value;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.darkBorder,
              width: selected ? 2 : 1),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? AppColors.primary : null),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
            const Spacer(),
            if (selected) const Icon(Icons.check_circle, color: AppColors.primary, size: 18),
          ],
        ),
      ),
    );
  }
}
