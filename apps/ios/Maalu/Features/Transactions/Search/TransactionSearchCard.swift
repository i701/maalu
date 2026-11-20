import SwiftUI

/// The top of the transactions list: a big light grey field on the white page with the search field, the Filters button, the quick type filters, the other active filters as chips you can
/// drop one at a time, and, once the list is narrowed, what the matching rows add up to.
struct TransactionSearchCard: View {
    @Binding var text: String
    @Binding var type: TransactionType?
    @Binding var planned: Bool
    let chips: [TransactionFilterChip]
    let totals: TransactionTotals?
    let filterCount: Int
    let onFilters: () -> Void
    let onRemove: (TransactionFilterChip) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search transactions", text: $text)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                if !text.isEmpty {
                    Button("Clear", systemImage: "xmark.circle.fill") { text = "" }
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.secondary)
                }
                Button("Filters", systemImage: "slider.horizontal.3", action: onFilters)
                    .labelStyle(.iconOnly)
                    .font(.title3)
                    .foregroundStyle(filterCount == 0 ? Color.secondary : Color.brand)
            }
            .buttonStyle(.borderless)
            .padding(.horizontal, Spacing.card)
            .padding(.vertical, 16)
            TransactionTypeChips(type: $type, planned: $planned)
                .padding(.bottom, 14)
            if !chips.isEmpty {
                TransactionFilterChips(chips: chips, onRemove: onRemove)
                    .padding(.bottom, 14)
            }
            if let totals {
                Divider().padding(.horizontal, Spacing.card)
                TransactionTotalsRow(totals: totals)
                    .padding(.horizontal, Spacing.card)
                    .padding(.vertical, 14)
            }
        }
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: Radius.card, style: .continuous))
    }
}
