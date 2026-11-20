struct SalarySplitMade: Decodable, Identifiable, Hashable {
    let kind: String
    let id: String
    let targetName: String
    let amount: String

    var isTransfer: Bool { kind == "transfer" }
}
