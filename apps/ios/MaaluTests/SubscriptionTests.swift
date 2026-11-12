import Foundation
import Testing
@testable import Maalu

struct SubscriptionTests {
    static func subscription(_ overrides: [String: String] = [:]) throws -> Subscription {
        var fields: [String: String] = [
            "status": #""active""#, "next_due_date": #""2026-11-20""#, "is_overdue": "false",
            "installments_total": "null", "payments_made": "0", "amount_varies": "false",
            "interval_unit": #""month""#, "interval_count": "1", "remind_days_before": "3",
            "currency": #""MVR""#, "exchange_rate": #""1""#, "amount": #""96.5000""#,
            "account": "null", "vendor": "null",
        ]
        fields.merge(overrides) { _, new in new }
        let body = fields.map { "\"\($0.key)\":\($0.value)" }.joined(separator: ",")
        let json = """
        {"id":"s1","name":"MWSC","base_amount":"96.5","payment_method":"bank_transfer","category":"Utilities",
         "start_date":"2026-01-20","last_paid_date":null,"monthly_base_cost":"96.5",\(body)}
        """
        return try Api.decoder.decode(Subscription.self, from: Data(json.utf8))
    }

    @Test func decodesTheApisShape() throws {
        let subscription = try Self.subscription()
        #expect(subscription.intervalUnit == .month)
        #expect(subscription.status == .active)
        #expect(subscription.paymentMethod == .bankTransfer)
        #expect(subscription.remindDaysBefore == 3)
    }

    @Test func everyTextCountsOnlyWhenNotOne() throws {
        #expect(try Self.subscription().everyText == "every month")
        #expect(try Self.subscription(["interval_count": "3", "interval_unit": #""week""#]).everyText == "every 3 weeks")
    }

    @Test func dueLineSaysWhenItIsNextDueOrThatItIsLate() throws {
        #expect(try Self.subscription().dueLine.hasPrefix("every month · next "))
        let late = try Self.subscription(["is_overdue": "true"])
        #expect(late.dueLine.contains("overdue since"))
        #expect(late.isLate)
    }

    @Test func dueLineForAnEndedOrPausedPlan() throws {
        #expect(try Self.subscription(["status": #""paused""#]).dueLine == "every month · paused")
        #expect(try Self.subscription(["status": #""cancelled""#]).dueLine == "every month · cancelled")
        let done = try Self.subscription(["status": #""completed""#, "installments_total": "12", "payments_made": "12"])
        #expect(done.dueLine == "every month · all paid · 12 of 12 paid")
    }

    @Test func installmentsNeverCountPastTheTotal() throws {
        #expect(try Self.subscription(["installments_total": "12", "payments_made": "3"]).installmentsText == "3 of 12 paid")
        #expect(try Self.subscription(["installments_total": "12", "payments_made": "15"]).installmentsText == "12 of 12 paid")
        #expect(try Self.subscription().installmentsText == nil)
    }

    @Test func onlyAnOngoingOneCanBePausedAndAPausedOrCancelledOneResumed() throws {
        #expect(try Self.subscription().canPause)
        #expect(try Self.subscription(["status": #""paused""#]).canResume)
        #expect(try Self.subscription(["status": #""cancelled""#]).canResume)
        #expect(try Self.subscription(["status": #""completed""#]).canResume == false)
    }

    @Test func reminderTitles() {
        #expect(ReminderOption.title(nil) == "Never")
        #expect(ReminderOption.title(0) == "On the day")
        #expect(ReminderOption.title(1) == "1 day before")
        #expect(ReminderOption.title(5) == "5 days before")
        #expect(ReminderOption.title(7) == "A week before")
    }
}
