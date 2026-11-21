import SwiftUI

/// What one slab shows when it is shut: its role, an amount, and the account chip in the corner that opens the list.
struct TransferSlabFace<Amount: View>: View {
    let role: LocalizedStringResource
    let account: Account?
    let onChoose: () -> Void
    /// Extra room at the top, for the arrow that overlaps the top of the lower slab.
    var topInset: CGFloat = 0
    @ViewBuilder let amount: Amount

    var body: some View {
        ZStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(role)
                    Spacer()
                    if let account {
                        Text(account.numberAndBalance)
                            .lineLimit(1)
                    }
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
                Spacer(minLength: 0)
                amount
                    .font(.title.weight(.medium))
                    .padding(.trailing, 130)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            Button(action: onChoose) {
                HStack(spacing: 8) {
                    Text(account?.name ?? String(localized: "Choose"))
                        .font(.footnote.weight(.medium))
                        .lineLimit(1)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 12)
                .frame(height: 30)
                .background(Color.primary.opacity(0.06), in: .capsule)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            .accessibilityLabel("\(String(localized: role)): \(account?.name ?? String(localized: "no account")). Choose another account")
        }
        .padding(16)
        .padding(.top, topInset)
        .frame(maxWidth: .infinity)
        .frame(height: TransferSlabLayout.slabHeight)
    }
}
