import Foundation
import Testing
@testable import Maalu

struct TrashTests {
    private func transactionJSON(deletedAt: String?) -> String {
        #"""
        {"id":"1","type":"expense","amount":"12","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"12",
         "category":"Food","description":"Lunch","transaction_date":"2026-11-10","transaction_time":null,"planned":false,
         "payment_method":"cash","account":{"id":"mvr","name":"BML","currency":"MVR"},"to_account":null,
         "vendor":{"id":"v","name":"Cafe"},"card":null,"subscription":null,"tags":[],"refund_of":null,
         "refunded_amount":"0","splits":[],"adjustment":false,"deleted_at":\#(deletedAt.map { "\"\($0)\"" } ?? "null")}
        """#
    }

    @Test func aTrashedTransactionReadsItsDeletedDay() throws {
        let transaction = try Api.decoder.decode(Transaction.self, from: Data(transactionJSON(deletedAt: "2026-11-12T14:03:25Z").utf8))
        #expect(transaction.deletedAt == "2026-11-12T14:03:25Z")
        #expect(transaction.deletedDay == "2026-11-12")
        #expect(ISODate.date(transaction.deletedDay ?? "") != nil)
    }

    @Test func aLiveTransactionHasNoDeletedDay() throws {
        let transaction = try Api.decoder.decode(Transaction.self, from: Data(transactionJSON(deletedAt: nil).utf8))
        #expect(transaction.deletedAt == nil)
        #expect(transaction.deletedDay == nil)
    }
}
