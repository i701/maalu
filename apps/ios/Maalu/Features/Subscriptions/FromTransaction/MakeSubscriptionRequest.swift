struct MakeSubscriptionRequest: Encodable {
    var name: String?
    var intervalUnit: IntervalUnit
    var intervalCount: Int

    private enum CodingKeys: String, CodingKey {
        case name
        case intervalUnit = "interval_unit"
        case intervalCount = "interval_count"
    }
}
