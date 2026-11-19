struct GroupRemoved: Decodable {
    let removed: Int
    /// True when too few were left, so the group was deleted.
    let dissolved: Bool
}
