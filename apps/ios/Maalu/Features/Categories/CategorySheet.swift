enum CategorySheet: Identifiable {
    case add
    case edit(Category)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let category): "edit-\(category.id)"
        }
    }
}
