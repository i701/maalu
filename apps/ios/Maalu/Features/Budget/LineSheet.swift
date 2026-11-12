enum LineSheet: Identifiable {
    case edit(BudgetLine)
    case move(BudgetLine)

    var id: String {
        switch self {
        case .edit(let line): "edit-\(line.id)"
        case .move(let line): "move-\(line.id)"
        }
    }
}
