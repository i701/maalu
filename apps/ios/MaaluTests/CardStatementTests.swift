import Foundation
import Testing
@testable import Maalu

struct CardStatementTests {
    private func statement(state: String, remaining: String = "600", days: Int = 4) throws -> CardStatement {
        try Api.decoder.decode(CardStatement.self, from: Data(#"""
        {"account_id":"a","account_name":"Visa","currency":"MVR","statement_day":5,"due_day":25,"closed_on":"2026-11-05","due_on":"2026-11-25",
         "next_closes_on":"2026-12-05","statement_balance":"800","paid_since":"200","remaining":"\#(remaining)","remaining_base":"600","spent_since":"90",
         "owed_now":"690","credit_limit":null,"state":"\#(state)","days_until_due":\#(days)}
        """#.utf8))
    }

    @Test func aDayIsSaidAsAnOrdinal() {
        #expect([1, 2, 3, 4, 5, 11, 12, 13, 21, 22, 23, 25, 31].map(CardStatementText.ordinal)
            == ["1st", "2nd", "3rd", "4th", "5th", "11th", "12th", "13th", "21st", "22nd", "23rd", "25th", "31st"])
    }

    @Test func theDueDateReadsInDays() {
        #expect(CardStatementText.dueIn(0) == "today")
        #expect(CardStatementText.dueIn(1) == "tomorrow")
        #expect(CardStatementText.dueIn(-1) == "yesterday")
        #expect(CardStatementText.dueIn(4) == "in 4 days")
        #expect(CardStatementText.dueIn(-3) == "3 days ago")
    }

    @Test func theStatusFollowsTheStateAndHowSoonItIsDue() throws {
        #expect(CardStatementText.status(try statement(state: "overdue", days: -2)).tone == .late)
        #expect(CardStatementText.status(try statement(state: "due", days: 3)).tone == .warn)
        #expect(CardStatementText.status(try statement(state: "due", days: 10)).label == "To pay")
        #expect(CardStatementText.status(try statement(state: "paid")).label == "Paid")
        #expect(CardStatementText.status(try statement(state: "none")).tone == .quiet)
    }

    @Test func theListLineSaysWhatToPayAndBy() throws {
        let due = CardStatementText.line(try statement(state: "due"))
        #expect(due.hasPrefix("Pay "))
        #expect(due.contains("in 4 days"))
        #expect(CardStatementText.line(try statement(state: "overdue", days: -2)).contains("was due"))
        #expect(CardStatementText.schedule(try statement(state: "due")) == "Closes on the 5th, due on the 25th")
    }

    @Test func onlyAStatementWithMoneyLeftOffersRepay() throws {
        #expect(try statement(state: "due").owes)
        #expect(try statement(state: "overdue", days: -1).owes)
        #expect(try !statement(state: "paid").owes)
    }

    @Test func aRepaymentStartsAsATransferOfWhatIsLeft() throws {
        let card = try Api.decoder.decode(Card.self, from: Data(#"{"id":"c","name":"Visa","last_digits":null,"kind":"credit","account":{"id":"card-acc","name":"Visa","currency":"MVR"},"repay_account":{"id":"bank","name":"BML","currency":"MVR"}}"#.utf8))
        let draft = TransactionDraft(repaying: card, amount: 600)
        #expect(draft.type == .transfer)
        #expect(draft.amount == 600)
        #expect(draft.accountID == "bank")
        #expect(draft.toAccountID == "card-acc")
    }
}
