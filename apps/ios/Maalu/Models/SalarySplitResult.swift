struct SalarySplitResult: Decodable {
    /// Transfers made between accounts.
    let transfers: Int
    /// Amounts set aside for goals tracked by hand.
    let entries: Int

    /// "Moved to 2 accounts and set aside for 1 goal."
    var message: String {
        var parts: [String] = []
        if transfers > 0 { parts.append(transfers == 1 ? String(localized: "moved to 1 account") : String(localized: "moved to \(transfers) accounts")) }
        if entries > 0 { parts.append(entries == 1 ? String(localized: "set aside for 1 goal") : String(localized: "set aside for \(entries) goals")) }
        guard !parts.isEmpty else { return String(localized: "Nothing was made.") }
        return parts.joined(separator: " " + String(localized: "and") + " ").capitalizedFirst + "."
    }
}

private extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
