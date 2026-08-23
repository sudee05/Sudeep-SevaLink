class ProviderProfile {
  const ProviderProfile({
    required this.userId,
    this.providerId,
    this.fullName = '',
    this.phone = '',
    this.businessName = '',
    this.location = '',
    this.experience = '',
    this.about = '',
    this.imageUrl = '',
    this.certificates = const [],
    this.rating = 0,
    this.approvalStatus = 'pending',
  });

  final String userId;
  final String? providerId;
  final String fullName;
  final String phone;
  final String businessName;
  final String location;
  final String experience;
  final String about;
  final String imageUrl;
  final List<String> certificates;
  final double rating;
  final String approvalStatus;
}
