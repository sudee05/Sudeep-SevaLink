import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../main.dart' show razorpayKeyId;

class RazorpayPaymentResult {
  final String paymentId;
  final String? orderId;
  final String? signature;

  const RazorpayPaymentResult({required this.paymentId, this.orderId, this.signature});
}

Future<RazorpayPaymentResult> payWithRazorpay({
  required double amount,
  required String name,
  required String description,
  String currency = 'INR',
  String? email,
  String? contact,
  Map<String, dynamic>? notes,
  Map<String, dynamic>? theme,
}) async {
  final keyId = razorpayKeyId;
  if (keyId.isEmpty || keyId == 'rzp_test_your_key_here') {
    throw Exception('Set razorpayTestKeyId in lib/main.dart or pass --dart-define=RAZORPAY_KEY_ID=...');
  }

  final amountInPaise = (amount * 100).round();
  if (amountInPaise <= 0) {
    throw Exception('Invalid payment amount.');
  }

  final completer = Completer<RazorpayPaymentResult>();
  final razorpay = Razorpay();

  void cleanup() {
    razorpay.clear();
  }

  razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse response) {
    if (!completer.isCompleted) {
      completer.complete(RazorpayPaymentResult(
        paymentId: response.paymentId ?? '',
        orderId: response.orderId,
        signature: response.signature,
      ));
    }
    cleanup();
  });

  razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse response) {
    if (!completer.isCompleted) {
      completer.completeError(Exception(response.message ?? 'Payment failed.'));
    }
    cleanup();
  });

  razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse response) {
    if (!completer.isCompleted) {
      completer.completeError(Exception('External wallet ${response.walletName} is not supported.'));
    }
    cleanup();
  });

  try {
    razorpay.open({
      'key': keyId,
      'amount': amountInPaise,
      'currency': currency,
      'name': name,
      'description': description,
      if (email != null || contact != null)
        'prefill': {
          if (email != null) 'email': email,
          if (contact != null) 'contact': contact,
        },
      if (notes != null) 'notes': notes,
      if (theme != null) 'theme': theme,
    });
  } catch (e) {
    cleanup();
    rethrow;
  }

  return completer.future.whenComplete(cleanup);
}