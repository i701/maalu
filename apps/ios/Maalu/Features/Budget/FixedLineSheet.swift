enum FixedLineSheet: Identifiable {
    case edit(FixedBudgetLine)
    case repeatNext(FixedBudgetLine)

    var id: String {
        switch self {
        case .edit(let line): "edit-\(line.id)"
        case .repeatNext(let line): "repeat-\(line.id)"
        }
    }
}
