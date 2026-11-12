struct MovePeriod: Identifiable {
    let start: String
    let end: String
    let moves: [BudgetMove]

    var id: String { start }
}
