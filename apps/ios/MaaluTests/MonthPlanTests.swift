import Foundation
import Testing
@testable import Maalu

struct MonthPlanTests {
    private func bill(_ id: String, _ title: String, _ date: String, _ amount: String, overdue: Bool = false, estimate: Bool = false) -> String {
        #"""
        {"id":"\#(id)","title":"\#(title)","date":"\#(date)","amount":"\#(amount)","overdue":\#(overdue),"account":"BML","subscription":null,"estimate":\#(estimate),"transfer":false}
        """#
    }

    private func data(balance: String = "1000", reserved: String = "0", bills: [String] = [], cards: [String] = [], expected: [String] = []) throws -> AvailableToSpend {
        try Api.decoder.decode(AvailableToSpend.self, from: Data(#"""
        {"currency":"MVR","period_start":"2026-11-01","period_end":"2026-11-30","today":"2026-11-12","available":"0","balance":"\#(balance)",
         "bills_total":"0","card_payments_total":"0","reserved_total":"\#(reserved)","accounts":[],
         "bills":[\#(bills.joined(separator: ","))],"card_payments":[\#(cards.joined(separator: ","))],"reserved":[],"expected":[\#(expected.joined(separator: ","))]}
        """#.utf8))
    }

    @Test func eachBillTakesItsAmountOffWhatIsLeftInOrder() throws {
        let plan = MonthPlan(try data(balance: "1000", reserved: "200", bills: [
            bill("b", "Water", "2026-11-20", "100"), bill("a", "Rent", "2026-11-15", "500"),
        ]))
        #expect(plan.startingPoint == 800)
        let rows = plan.days.flatMap(\.rows)
        #expect(rows.map(\.title) == ["Rent", "Water"])
        #expect(rows.map(\.left) == [300, 200])
        #expect(plan.firstShort == nil)
    }

    @Test func theMoneyRunsOutAtTheFirstBillThatGoesBelowZero() throws {
        let plan = MonthPlan(try data(balance: "300", bills: [
            bill("a", "Rent", "2026-11-15", "250"), bill("b", "Wifi", "2026-11-16", "100"), bill("c", "Gym", "2026-11-17", "10"),
        ]))
        #expect(plan.firstShort?.title == "Wifi")
        #expect(plan.days.flatMap(\.rows).map(\.isShort) == [false, true, true])
    }

    @Test func overdueComesFirstAndIncomeIsListedButNeverCounted() throws {
        let income = #"{"id":"i","title":"Salary","date":"2026-11-15","amount":"10000","overdue":false,"account":null,"subscription":null,"estimate":false,"transfer":false}"#
        let plan = MonthPlan(try data(balance: "100", bills: [
            bill("a", "Rent", "2026-11-15", "40"), bill("o", "Phone", "2026-11-05", "10", overdue: true),
        ], expected: [income]))
        #expect(plan.days.first?.isOverdue == true)
        let titles = plan.days.flatMap(\.rows).map(\.title)
        #expect(titles == ["Phone", "Rent", "Salary"])
        let salary = try #require(plan.days.flatMap(\.rows).first { $0.title == "Salary" })
        #expect(salary.left == nil)
        #expect(plan.days.flatMap(\.rows).first { $0.title == "Rent" }?.left == 50)
    }

    @Test func rowsOnTheSameDayShareOneSection() throws {
        let plan = MonthPlan(try data(bills: [bill("a", "B", "2026-11-15", "1"), bill("b", "A", "2026-11-15", "1"), bill("c", "C", "2026-11-16", "1")]))
        #expect(plan.days.count == 2)
        #expect(plan.days[0].rows.map(\.title) == ["A", "B"])
    }

    @Test func aCardStatementHasNoMarkAsPaid() throws {
        let card = #"{"account_id":"c1","title":"Visa","date":"2026-11-20","amount":"400","overdue":false}"#
        let plan = MonthPlan(try data(cards: [card]))
        let row = try #require(plan.days.first?.rows.first)
        #expect(row.kind == .card)
        #expect(!row.canMarkPaid)
        #expect(row.title.contains("Visa"))
    }

    @Test func dayTitlesSayTodayAndTomorrow() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        func title(_ date: String) -> String {
            PlanDay(id: date, date: date, rows: []).title(today: "2026-11-12", calendar: calendar)
        }
        #expect(title("2026-11-12") == "Today")
        #expect(title("2026-11-13") == "Tomorrow")
        #expect(PlanDay(id: "overdue", date: nil, rows: []).title(today: "2026-11-12") == "Overdue")
    }

    @Test func dueLabelsAreWordedByDistanceAndInflect() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        func text(_ date: String) -> String { String(DueLabel.text(for: date, today: "2026-11-12", calendar: calendar).characters) }
        #expect(text("2026-11-12") == "Due today")
        #expect(text("2026-11-13") == "Due tomorrow")
        #expect(text("2026-11-17") == "Due in 5 days")
        #expect(text("2026-11-11") == "1 day overdue")
        #expect(text("2026-11-09") == "3 days overdue")
    }
}
