import SwiftUI

/// The accounts to choose from, drawn inside a slab that has grown to cover the whole block, under its own heading and a close button.
struct TransferAccountList: View {
    let heading: LocalizedStringResource
    let accounts: [Account]
    let selectedID: String?
    let onPick: (Account) -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 2) {
            HStack {
                Text(heading)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Close", systemImage: "xmark", action: onClose)
                    .labelStyle(.iconOnly)
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .frame(width: 30, height: 30)
            }
            .padding(.leading, 12)
            ScrollView {
                VStack(spacing: 2) {
                    ForEach(accounts) { account in
                        Button { onPick(account) } label: {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 1) {
                                    HStack(spacing: 8) {
                                        Text(account.name).fontWeight(.medium)
                                        Text(account.currency).font(.footnote).foregroundStyle(.secondary)
                                    }
                                    Text(account.numberAndBalance)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                                Spacer()
                                if account.id == selectedID { Image(systemName: "checkmark").font(.footnote.weight(.semibold)) }
                            }
                            .padding(.horizontal, 12)
                            .frame(minHeight: 52)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)
        .padding(.bottom, 8)
    }
}
