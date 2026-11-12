struct CategoryOption: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let parentId: String?
    let isSalary: Bool
}
