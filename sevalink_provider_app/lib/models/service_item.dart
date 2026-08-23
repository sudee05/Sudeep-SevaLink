class ServiceItem {
  const ServiceItem({
    required this.id,
    required this.name,
    this.description = '',
    this.categoryId,
    this.categoryName = '',
    this.price = 0,
    this.enrolled = false,
  });

  final String id;
  final String name;
  final String description;
  final String? categoryId;
  final String categoryName;
  final double price;
  final bool enrolled;

  ServiceItem copyWith({
    bool? enrolled,
    double? price,
  }) {
    return ServiceItem(
      id: id,
      name: name,
      description: description,
      categoryId: categoryId,
      categoryName: categoryName,
      price: price ?? this.price,
      enrolled: enrolled ?? this.enrolled,
    );
  }
}
