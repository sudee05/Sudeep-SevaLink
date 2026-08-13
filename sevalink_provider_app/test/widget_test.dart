import 'package:flutter_test/flutter_test.dart';
import 'package:sevalink_provider_app/main.dart';

void main() {
  testWidgets('provider workflow loads dashboard', (WidgetTester tester) async {
    await tester.pumpWidget(const SevaLinkProviderApp());

    expect(find.text('SevaLink Provider'), findsOneWidget);
    expect(find.text('Business Overview'), findsNothing);
    expect(find.text("Today's Bookings"), findsOneWidget);
    expect(find.text('Pending Requests'), findsWidgets);
  });
}
