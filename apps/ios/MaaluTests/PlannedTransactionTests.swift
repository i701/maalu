import Foundation
import Testing
@testable import Maalu

@MainActor
struct PlannedTransactionTests {
    private func transaction(planned: Bool) throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"t","type":"expense","amount":"10","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"10","category":"Bills",
         "description":null,"transaction_date":"2026-11-15","transaction_time":null,"planned":\#(planned),"payment_method":"other",
         "account":{"id":"a","name":"BML","currency":"MVR"},"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":null,"refunded_amount":"0","splits":[],"adjustment":false}
        """#.utf8))
    }

    private func body(_ request: TransactionRequest) throws -> [String: Any] {
        try #require(try JSONSerialization.jsonObject(with: try JSONEncoder().encode(request)) as? [String: Any])
    }

    private var tomorrow: Date { Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now }
    private var yesterday: Date { Calendar.current.date(byAdding: .day, value: -1, to: .now) ?? .now }

    @Test func aFutureDatePlansItUntilThePersonChoosesAndAPastDatePostsIt() {
        let model = TransactionFormModel()
        #expect(!model.draft.planned)
        model.draft.date = tomorrow
        model.dateChanged()
        #expect(model.draft.planned)
        model.draft.date = yesterday
        model.dateChanged()
        #expect(!model.draft.planned)
    }

    @Test func onceTheSwitchIsSetByHandADateChangeLeavesItAlone() {
        let model = TransactionFormModel()
        model.isPlanned = true
        model.draft.date = yesterday
        model.dateChanged()
        #expect(model.draft.planned)
        model.isPlanned = false
        model.draft.date = tomorrow
        model.dateChanged()
        #expect(!model.draft.planned)
    }

    @Test func anExistingTransactionKeepsWhatItHasWhateverTheDate() throws {
        let model = TransactionFormModel(editing: try transaction(planned: false))
        model.draft.date = tomorrow
        model.dateChanged()
        #expect(!model.draft.planned)
    }

    @Test func theRequestSendsPlannedOnlyWhenItIsOnOrWasTurnedOff() throws {
        var draft = TransactionDraft()
        draft.amount = 10
        draft.category = "Bills"
        let accounts: [Account] = []
        #expect(try body(draft.request(accounts: accounts, baseCurrency: "MVR", editing: nil))["planned"] == nil)

        draft.planned = true
        #expect(try body(draft.request(accounts: accounts, baseCurrency: "MVR", editing: nil))["planned"] as? Bool == true)

        let original = try transaction(planned: true)
        draft.planned = false
        #expect(try body(draft.request(accounts: accounts, baseCurrency: "MVR", editing: original))["planned"] as? Bool == false)
    }

    @Test func thePlannedFilterAsksForUpcomingAndCountsAsActive() {
        var filter = TransactionFilter()
        #expect(!filter.queryItems.contains { $0.name == "planned" })
        filter.planned = true
        #expect(filter.queryItems.contains { $0.name == "planned" && $0.value == "true" })
        #expect(filter.isActive)
        #expect(filter.clearingDetails().planned)
    }

    @Test func aPlannedRowSaysSo() throws {
        #expect(try transaction(planned: true).subtitle.hasPrefix("Planned"))
        #expect(try !transaction(planned: false).subtitle.contains("Planned"))
    }
}
