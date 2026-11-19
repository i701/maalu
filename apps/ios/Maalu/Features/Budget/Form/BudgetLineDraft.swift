import Foundation

struct BudgetLineDraft: Equatable {
    var name = ""
    var amount: Decimal?
    var categoryIDs: Set<String> = []
    var rollover = false
    /// The limit's own warning level; nil follows the budget's.
    var warnPercent: Int?
    var hasDates = false
    var startDate: String
    var endDate: String
    /// With dates: a monthly limit in every month they touch (true) or one total for the whole stretch (false).
    var repeats = false

    init(today: String = ISODate.string(.now)) {
        startDate = today
        endDate = ComparePreset.addDays(today, 29)
    }

    init(editing line: BudgetLine, today: String = ISODate.string(.now)) {
        self.init(today: today)
        name = line.name
        amount = Money.decimal(line.amount)
        categoryIDs = Set(line.categories.map(\.id))
        rollover = line.rollover
        warnPercent = line.warnPercent
        if let from = line.runsFrom, let until = line.runsUntil {
            hasDates = true
            repeats = true
            startDate = from
            endDate = until
        }
    }

    init(editing line: FixedBudgetLine) {
        startDate = line.startDate
        endDate = line.endDate
        hasDates = true
        name = line.name
        amount = Money.decimal(line.amount)
        categoryIDs = Set(line.categories.map(\.id))
        warnPercent = line.warnPercent
    }

    /// A new limit with the same name, categories and amount, starting the day after this one ends and as long.
    init(repeating line: FixedBudgetLine) {
        self.init(editing: line)
        let days = ISODate.date(line.startDate).flatMap { start in
            ISODate.date(line.endDate).flatMap { Calendar.current.dateComponents([.day], from: start, to: $0).day }
        } ?? 0
        startDate = ComparePreset.addDays(line.endDate, 1)
        endDate = ComparePreset.addDays(startDate, days)
    }

    var isOneTotal: Bool { hasDates && !repeats }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the limit a name." }
        guard let amount, amount > 0 else { return "Enter an amount above zero." }
        if categoryIDs.isEmpty { return "Choose at least one category." }
        if hasDates && endDate < startDate { return "The end date can't be before the start date." }
        return nil
    }

    func createRequest() -> BudgetLineRequest {
        BudgetLineRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            amount: amount.map(Money.string),
            categoryIds: categoryIDs.sorted(),
            warnPercent: warnPercent.map(Optional.some),
            rollover: isOneTotal ? false : rollover,
            startDate: hasDates ? startDate : nil,
            endDate: hasDates ? .some(endDate) : nil,
            repeat: hasDates ? repeats : nil
        )
    }

    /// Only what changed, so a limit's dates and moves are never touched by an edit of its name.
    func patchRequest(from original: BudgetLineDraft) -> BudgetLineRequest {
        var request = BudgetLineRequest(
            name: name != original.name ? name.trimmingCharacters(in: .whitespaces) : nil,
            amount: amount != original.amount ? amount.map(Money.string) : nil,
            categoryIds: categoryIDs != original.categoryIDs ? categoryIDs.sorted() : nil,
            warnPercent: warnPercent != original.warnPercent ? .some(warnPercent) : nil,
            rollover: !isOneTotal && rollover != original.rollover ? rollover : nil
        )
        if hasDates, !original.hasDates || startDate != original.startDate || endDate != original.endDate || repeats != original.repeats {
            request.startDate = startDate
            request.endDate = .some(endDate)
            request.repeat = repeats
        } else if !hasDates && original.hasDates {
            request.endDate = .some(nil)
        }
        return request
    }
}
