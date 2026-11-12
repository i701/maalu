import Foundation

struct GoalDraft: Equatable {
    var name = ""
    var target: Decimal?
    var accountID: String?
    var monthly: Decimal?
    var hasTargetDate = false
    var targetDate = Calendar.current.date(byAdding: .month, value: 6, to: .now) ?? .now

    init() {}

    init(editing goal: Goal) {
        name = goal.name
        target = Money.decimal(goal.targetAmount)
        accountID = goal.account?.id
        monthly = goal.monthlyAmount.flatMap(Money.decimal)
        if let date = goal.targetDate.flatMap(ISODate.date) {
            hasTargetDate = true
            targetDate = date
        }
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the goal a name." }
        guard let target, target > 0 else { return "Enter a target above zero." }
        if let monthly, monthly <= 0 { return "The monthly amount must be above zero." }
        return nil
    }

    func createRequest() -> GoalRequest {
        GoalRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            targetAmount: target.map(Money.string),
            accountId: accountID,
            monthlyAmount: monthly.map(Money.string),
            targetDate: hasTargetDate ? ISODate.string(targetDate) : nil
        )
    }

    /// Only what changed. A cleared account, monthly amount or date is sent as an explicit null.
    func patchRequest(from original: GoalDraft) -> GoalRequest {
        var request = GoalRequest()
        if name != original.name { request.name = name.trimmingCharacters(in: .whitespaces) }
        if target != original.target { request.targetAmount = target.map(Money.string) }
        if accountID != original.accountID {
            request.accountId = accountID
            request.clearsAccount = accountID == nil
        }
        if monthly != original.monthly {
            request.monthlyAmount = monthly.map(Money.string)
            request.clearsMonthly = monthly == nil
        }
        if hasTargetDate != original.hasTargetDate || (hasTargetDate && targetDate != original.targetDate) {
            request.targetDate = hasTargetDate ? ISODate.string(targetDate) : nil
            request.clearsDate = !hasTargetDate
        }
        return request
    }
}
