enum GoalSheet: Identifiable {
    case edit(Goal)
    case money(Goal)

    var id: String {
        switch self {
        case .edit(let goal): "edit-\(goal.id)"
        case .money(let goal): "money-\(goal.id)"
        }
    }
}
