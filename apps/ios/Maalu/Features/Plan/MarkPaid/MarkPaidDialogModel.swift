import Foundation
import Observation

/// Drives the "Mark as paid" dialog: loads the planned transaction when asked, holds what is typed, and sends it.
@MainActor @Observable
final class MarkPaidDialogModel {
    var isPresented = false
    var amountText = ""
    var chargedText = ""
    var errorMessage: String?
    private(set) var form: MarkPaidFormModel?
    /// What the person tapped it as: the plan names a bill by its subscription, the transaction by its vendor.
    private(set) var name = ""
    private var onDone: () -> Void = {}

    var title: LocalizedStringResource {
        guard let form else { return "Mark as paid" }
        return form.draft.verb.action
    }

    /// Whether the dialog has an amount to ask for (a transfer is only confirmed).
    var asksAmount: Bool { form?.draft.isTransfer == false }
    var asksCharged: Bool { form?.draft.isForeign == true }
    var canConfirm: Bool { current?.problem == nil }

    /// What the typed text comes to, so the same rules as the form apply.
    private var current: MarkPaidDraft? {
        guard var draft = form?.draft else { return nil }
        if asksAmount { draft.amount = Self.parse(amountText) }
        draft.charged = Self.parse(chargedText)
        return draft
    }

    func present(transactionID: String, named title: String? = nil, using api: Api, onDone: @escaping () -> Void) async {
        self.onDone = onDone
        async let transaction: ApiResult<Transaction> = api.get("transactions/\(transactionID)")
        async let profile: ApiResult<Profile> = api.get("users/me")
        let (transactionResult, profileResult) = await (transaction, profile)
        guard case .ok(let planned, _) = transactionResult, case .ok(let me, _) = profileResult else {
            if case .failed(_, let message) = transactionResult { errorMessage = message }
            else if case .failed(_, let message) = profileResult { errorMessage = message }
            return
        }
        let model = MarkPaidFormModel(planned: planned, baseCurrency: me.baseCurrency)
        form = model
        name = title ?? planned.title
        amountText = model.draft.amount.map { $0.formatted(.number.grouping(.never)) } ?? ""
        chargedText = ""
        isPresented = true
    }

    func confirm(using api: Api) async {
        guard let form, let draft = current else { return }
        form.draft = draft
        if await form.save(using: api) {
            onDone()
        } else {
            errorMessage = form.errorMessage
        }
    }

    private static func parse(_ text: String) -> Decimal? {
        Decimal(string: DecimalInput.sanitized(text), locale: .current)
    }
}
