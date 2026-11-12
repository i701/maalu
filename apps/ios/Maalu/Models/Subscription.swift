struct Subscription: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let vendor: NamedRef?
    let amount: String
    let currency: String
    let exchangeRate: String
    let baseAmount: String
    let account: AccountRef?
    let paymentMethod: PaymentMethod
    let category: String
    let intervalUnit: IntervalUnit
    let intervalCount: Int
    let startDate: String
    let status: SubscriptionStatus
    let lastPaidDate: String?
    let nextDueDate: String?
    let isOverdue: Bool
    let monthlyBaseCost: String
    let installmentsTotal: Int?
    let paymentsMade: Int
    let remindDaysBefore: Int?
    let amountVaries: Bool

    var canPause: Bool { status == .active }
    var canResume: Bool { status == .paused || status == .cancelled }
}
