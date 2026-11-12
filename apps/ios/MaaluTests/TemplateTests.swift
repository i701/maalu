import Foundation
import Testing
@testable import Maalu

struct TemplateTests {
    private func accounts() throws -> [Account] {
        func json(_ id: String, _ name: String, _ group: String, _ currency: String, _ rate: String) -> String {
            #"""
            {"id":"\#(id)","name":"\#(name)","group":"\#(group)","currency":"\#(currency)","balance":"0","base_balance":"0",
             "opening_amount":"0","exchange_rate":"\#(rate)","auto_rate":false,"bank":null,"account_number":null,"description":null,
             "credit_limit":null,"statement_day":null,"due_day":null,"exclude_from_stats":false,"spendable":null,
             "archived_at":null,"transaction_count":0}
            """#
        }
        let list = [json("mvr", "BML", "accounts", "MVR", "1"), json("mvr2", "Savings", "savings", "MVR", "1")]
        return try Api.decoder.decode([Account].self, from: Data("[\(list.joined(separator: ","))]".utf8))
    }

    private func templateJSON(
        type: String = "expense",
        amount: String? = "250",
        category: String? = "Groceries",
        vendor: String? = "Shop",
        description: String? = nil,
        account: String? = #"{"id":"mvr","name":"BML","currency":"MVR"}"#,
        toAccount: String? = nil
    ) -> String {
        let null = "null"
        return #"""
        {"id":"1","name":"Groceries","type":"\#(type)","amount":\#(amount.map { "\"\($0)\"" } ?? null),"currency":"MVR",
         "payment_method":"debit_card","category":\#(category.map { "\"\($0)\"" } ?? null),"vendor":\#(vendor.map { "\"\($0)\"" } ?? null),
         "description":\#(description.map { "\"\($0)\"" } ?? null),"account":\#(account ?? null),"to_account":\#(toAccount ?? null),
         "tags":[],"created_at":"2026-11-12T00:00:00Z"}
        """#
    }

    private func decode(_ json: String) throws -> TransactionTemplate {
        try Api.decoder.decode(TransactionTemplate.self, from: Data(json.utf8))
    }

    private func body(_ request: some Encodable) throws -> [String: Any] {
        let data = try JSONEncoder().encode(request)
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func draft(_ configure: (inout TransactionDraft) -> Void) -> TransactionDraft {
        var draft = TransactionDraft()
        draft.amount = 250
        draft.accountID = "mvr"
        draft.category = "Groceries"
        draft.vendor = "Shop"
        configure(&draft)
        return draft
    }

    @Test func decodingMapsTheWireNames() throws {
        let template = try decode(templateJSON(description: "Weekly"))
        #expect(template.id == "1")
        #expect(template.name == "Groceries")
        #expect(template.type == .expense)
        #expect(template.amount == "250")
        #expect(template.currency == "MVR")
        #expect(template.paymentMethod == .debitCard)
        #expect(template.category == "Groceries")
        #expect(template.vendor == "Shop")
        #expect(template.description == "Weekly")
        #expect(template.account?.name == "BML")
        #expect(template.toAccount == nil)
    }

    @Test func summaryLinesUpTypeAmountCategoryVendorAndAccount() throws {
        let template = try decode(templateJSON())
        let amount = MoneyFormat.string(Decimal(250), currency: "MVR")
        #expect(template.summary == "Expense · \(amount) · Groceries · Shop · BML")
    }

    @Test func summaryForATransferNamesBothAccounts() throws {
        let template = try decode(templateJSON(
            type: "transfer", amount: nil, category: nil, vendor: nil,
            toAccount: #"{"id":"mvr2","name":"Savings","currency":"MVR"}"#
        ))
        #expect(template.summary == "Transfer · BML → Savings")
    }

    @Test func summaryLeavesOutWhatIsNotFilled() throws {
        let template = try decode(templateJSON(amount: nil, category: nil, vendor: nil, account: nil))
        #expect(template.summary == "Expense")
    }

    @Test @MainActor func nameProblem() {
        #expect(TemplateNameSheet.problem("") != nil)
        #expect(TemplateNameSheet.problem("   ") != nil)
        #expect(TemplateNameSheet.problem(String(repeating: "a", count: 201)) != nil)
        #expect(TemplateNameSheet.problem("Rent") == nil)
    }

    @Test func requestUsesTheApisSpellings() throws {
        let filled = draft { $0.note = "Weekly"; $0.method = .debitCard }
        let body = try self.body(TemplateRequest(draft: filled, accounts: try accounts(), name: "  Groceries  "))
        #expect(body["name"] as? String == "Groceries")
        #expect(body["type"] as? String == "expense")
        #expect(body["amount"] as? String == "250")
        #expect(body["payment_method"] as? String == "debit_card")
        #expect(body["category"] as? String == "Groceries")
        #expect(body["vendor_name"] as? String == "Shop")
        #expect(body["description"] as? String == "Weekly")
        #expect(body["account_id"] as? String == "mvr")
        #expect(body["to_account_id"] == nil)
    }

    @Test func requestLeavesOutWhatIsEmpty() throws {
        let empty = draft { $0.amount = nil; $0.category = "  "; $0.vendor = ""; $0.note = "  " }
        let body = try self.body(TemplateRequest(draft: empty, accounts: try accounts(), name: "X"))
        #expect(body["amount"] == nil)
        #expect(body["category"] == nil)
        #expect(body["vendor_name"] == nil)
        #expect(body["description"] == nil)
    }

    @Test func requestForATransferSendsTheDestinationAndNoVendorOrCategory() throws {
        let transfer = draft { $0.type = .transfer; $0.toAccountID = "mvr2" }
        let body = try self.body(TemplateRequest(draft: transfer, accounts: try accounts(), name: "Move"))
        #expect(body["to_account_id"] as? String == "mvr2")
        #expect(body["category"] == nil)
        #expect(body["vendor_name"] == nil)
    }

    @Test func aTemplateSeedsTheDraft() throws {
        let template = try decode(templateJSON(description: "Weekly"))
        let seeded = TransactionDraft(startingFrom: template)
        #expect(seeded.type == .expense)
        #expect(seeded.amount == 250)
        #expect(seeded.accountID == "mvr")
        #expect(seeded.category == "Groceries")
        #expect(seeded.vendor == "Shop")
        #expect(seeded.note == "Weekly")
        #expect(seeded.method == .debitCard)
        #expect(seeded.planned == false)
    }

    @Test func aTransferTemplateSeedsNoCategoryOrVendor() throws {
        let template = try decode(templateJSON(
            type: "transfer", category: nil, vendor: nil,
            toAccount: #"{"id":"mvr2","name":"Savings","currency":"MVR"}"#
        ))
        let seeded = TransactionDraft(startingFrom: template)
        #expect(seeded.type == .transfer)
        #expect(seeded.category.isEmpty)
        #expect(seeded.vendor.isEmpty)
        #expect(seeded.toAccountID == "mvr2")
    }

    @Test func renameSendsOnlyTheName() throws {
        let body = try self.body(TemplateRename(name: "Rent"))
        #expect(body["name"] as? String == "Rent")
    }
}
