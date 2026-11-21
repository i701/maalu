import SwiftUI

/// The transfer form's two slabs, one over the other: the account the money is from and the one it goes to, with an arrow on the seam that turns to swap them. Press an account chip and that slab grows to cover the block and lists the accounts; pick one and it shrinks back.
/// The design is Bencho's Asset swap block (MIT, bencho.dev), redrawn in SwiftUI with accounts for coins.
struct TransferSlabs: View {
    @Bindable var model: TransactionFormModel
    /// 0 for the top slab, 1 for the bottom one, while its list is open.
    @State private var picking: Int?
    @State private var turns = 0

    private var from: Account? { model.accounts.first { $0.id == model.draft.accountID } }
    private var to: Account? { model.toAccount }
    private var shapeRadius: CGFloat { Radius.card }

    var body: some View {
        ZStack(alignment: .top) {
            slab(0)
            slab(1)
            TransferFlipButton(turns: turns, isHidden: picking != nil, action: swap)
                .offset(y: TransferSlabLayout.slabHeight + TransferSlabLayout.gap / 2 - 20)
                .frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(height: TransferSlabLayout.blockHeight)
    }

    private func slab(_ index: Int) -> some View {
        let isOpen = picking == index
        let isSqueezed = picking != nil && !isOpen
        return ZStack(alignment: index == 0 ? .top : .bottom) {
            TransferSlabFace(role: index == 0 ? "From" : "To", account: index == 0 ? from : to, onChoose: { open(index) }, topInset: index == 0 ? 0 : 14) {
                amount(index)
            }
            .opacity(isOpen ? 0 : 1)
            .allowsHitTesting(!isOpen && picking == nil)
            if isOpen {
                TransferAccountList(
                    heading: index == 0 ? "From" : "To",
                    accounts: model.accounts,
                    selectedID: index == 0 ? model.draft.accountID : model.draft.toAccountID,
                    onPick: { choose($0, slot: index) },
                    onClose: close
                )
                .transition(.opacity.animation(.easeOut(duration: 0.18).delay(0.1)))
            }
        }
        .frame(maxWidth: .infinity)
        .card(radius: shapeRadius)
        .modifier(TransferSlabGrowth(index: index, progress: isOpen ? 1 : 0))
        .opacity(isSqueezed ? 0 : 1)
        .zIndex(isOpen ? 3 : 1)
        .accessibilityElement(children: .contain)
    }

    /// The paying slab holds the amount typed; the receiving one the same amount, or in another currency what arrives, which is typed too.
    @ViewBuilder
    private func amount(_ index: Int) -> some View {
        if index == 0 {
            DecimalField("0", value: $model.draft.amount)
        } else if model.needsToAmount {
            DecimalField("0", value: $model.draft.toAmount)
        } else if let amount = model.draft.amount {
            Text(amount, format: .number.precision(.fractionLength(0...4)))
        } else {
            Text("0").foregroundStyle(.tertiary)
        }
    }

    /// The other slab's account trades places with the one picked, as the web's exchange does rather than allowing an account for itself.
    private func choose(_ account: Account, slot: Int) {
        model.draft.chooseTransferAccount(account.id, forSource: slot == 0)
        model.accountChanged()
        close()
    }

    /// The slab grows over the block on a quick spring, the list fading in as it grows. Explicit, so a Form row cannot swallow it.
    private func open(_ index: Int) {
        withAnimation(.spring(duration: 0.38, bounce: 0.08)) { picking = index }
    }

    private func close() {
        withAnimation(.spring(duration: 0.3, bounce: 0)) { picking = nil }
    }

    private func swap() {
        model.draft.reverseTransfer(inTwoCurrencies: model.needsToAmount)
        model.accountChanged()
        withAnimation(.spring(duration: 0.6, bounce: 0.3)) { turns += 1 }
    }
}
