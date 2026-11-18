struct Card: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let lastDigits: String?
    let account: AccountRef

    var label: String {
        guard let lastDigits else { return name }
        return "\(name) ·· \(lastDigits)"
    }
}
