import Foundation
import Observation

@MainActor @Observable
final class RefundFormModel {
    var draft: RefundDraft
    private(set) var accounts: [Account] = []
    private(set) var baseCurrency = ""
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let purchase: Transaction?
    private let refund: Transaction?

    /// A new refund of `purchase`.
    init(purchase: Transaction) {
        self.purchase = purchase
        refund = nil
        draft = RefundDraft(purchase: purchase)
    }

    /// Changing `refund`.
    init(refund: Transaction) {
        purchase = nil
        self.refund = refund
        draft = RefundDraft(editing: refund)
    }

    /// A refund is in its purchase's currency.
    var currency: String { refund?.currency ?? purchase?.currency ?? "" }
    var isForeign: Bool { !baseCurrency.isEmpty && currency != baseCurrency }
    var usableAccounts: [Account] { accounts.filter { $0.currency == currency } }
    var canSave: Bool { !isSaving && draft.problem == nil }

    /// The purchase, what it cost and when.
    var context: String {
        if let purchase {
            return "\(purchase.title) · \(MoneyFormat.string(purchase.amount, currency: purchase.currency)) · \(Self.day(purchase.transactionDate))"
        }
        guard let of = refund?.refundOf else { return "" }
        return "\(of.vendorName ?? of.category) · \(MoneyFormat.string(of.amount, currency: of.currency)) · \(Self.day(of.transactionDate))"
    }

    func load(using api: Api) async {
        async let profile: ApiResult<Profile> = api.get("users/me")
        async let list: ApiResult<[Account]> = api.get("accounts")
        let (me, all) = await (profile, list)
        if case .ok(let me, _) = me { baseCurrency = me.baseCurrency }
        if case .ok(let all, _) = all { accounts = all }
    }

    /// True when it was saved; otherwise `errorMessage` says why.
    func save(using api: Api) async -> Bool {
        isSaving = true
        defer { isSaving = false }
        let request = draft.request(purchaseID: purchase?.id, isForeign: isForeign)
        let result: ApiResult<Transaction> = if let refund {
            await api.patchJSON("transactions/\(refund.id)", body: request)
        } else {
            await api.postJSON("transactions", body: request)
        }
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        errorMessage = nil
        return true
    }

    private static func day(_ iso: String) -> String {
        ISODate.date(iso)?.formatted(.dateTime.day().month(.abbreviated)) ?? iso
    }
}
