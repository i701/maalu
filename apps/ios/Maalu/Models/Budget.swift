struct Budget: Decodable {
    let currency: String
    let totals: BudgetTotals
    let lines: [BudgetLine]
    let fixedLines: [FixedBudgetLine]
    let attention: Int

    var runningFixedLines: [FixedBudgetLine] { fixedLines.filter(\.isRunning) }
    var isEmpty: Bool { lines.isEmpty && runningFixedLines.isEmpty }
}
