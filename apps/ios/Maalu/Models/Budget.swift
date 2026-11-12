struct Budget: Decodable {
    let currency: String
    let period: BudgetPeriod
    let totals: BudgetTotals
    let lines: [BudgetLine]
    let fixedLines: [FixedBudgetLine]
    let attention: Int

    var runningFixedLines: [FixedBudgetLine] { fixedLines.filter(\.isRunning) }
    var isEmpty: Bool { lines.isEmpty && runningFixedLines.isEmpty }

    /// Limits for set dates whose days touch the period on screen, running ones first and ended ones last.
    var fixedLinesInPeriod: [FixedBudgetLine] {
        fixedLines.filter { $0.startDate <= period.end && $0.endDate >= period.start }
    }
}
