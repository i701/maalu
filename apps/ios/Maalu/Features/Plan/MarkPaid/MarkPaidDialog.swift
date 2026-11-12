import SwiftUI

extension View {
    /// The "Mark as paid" dialog: confirms the amount (and, for another currency, what it was charged) and posts it.
    func markPaidDialog(_ model: MarkPaidDialogModel, session: Session) -> some View {
        modifier(MarkPaidDialog(model: model, session: session))
    }
}

private struct MarkPaidDialog: ViewModifier {
    @Bindable var model: MarkPaidDialogModel
    let session: Session

    func body(content: Content) -> some View {
        content
            .alert(Text(model.title), isPresented: $model.isPresented) {
                if model.asksAmount {
                    TextField("Amount", text: $model.amountText).keyboardType(.decimalPad)
                }
                if model.asksCharged {
                    TextField("Charged in \(model.form?.baseCurrency ?? "") (optional)", text: $model.chargedText).keyboardType(.decimalPad)
                }
                Button("Cancel", role: .cancel) {}
                Button(action: confirm) { Text(model.title) }.disabled(!model.canConfirm)
            } message: {
                if let planned = model.form?.planned {
                    Text("\(model.name) · \(planned.currency)")
                }
            }
            .alert("Could not save", item: $model.errorMessage) { _ in
            } message: { message in
                Text(message)
            }
    }

    private func confirm() {
        Task {
            guard let api = session.api else { return }
            await model.confirm(using: api)
        }
    }
}
