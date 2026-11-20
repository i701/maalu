/// The lines the person confirmed.
struct SalarySplitRequest: Encodable {
    struct Line: Encodable {
        let targetType: String
        let targetId: String
        let amount: String

        private enum CodingKeys: String, CodingKey {
            case targetType = "target_type"
            case targetId = "target_id"
            case amount
        }
    }

    let items: [Line]

    init(lines: [SalarySplitLine]) {
        items = lines.filter(\.isOn).map { Line(targetType: $0.targetType, targetId: $0.targetID, amount: Money.string($0.amount ?? 0)) }
    }
}
