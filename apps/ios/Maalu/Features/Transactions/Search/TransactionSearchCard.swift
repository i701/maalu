import SwiftUI

/// The top of the transactions list: a white pill with a layered shadow on the page with the search field and the Filters button; the active filters show as chips you can
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var isFocused: FocusState<Bool>.Binding

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                if let type {
                    TransactionSearchToken(title: String(localized: type.title), tint: type.tint) { self.type = nil }
                }
                if planned {
                    TransactionSearchToken(title: String(localized: "Planned"), tint: .orange) { planned = false }
                }
                TextField("Search", text: $text)
                    .focused(isFocused)
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
            .padding(.vertical, 20)
            if !chips.isEmpty {
                TransactionFilterChips(chips: chips, onRemove: onRemove)
                    .padding(.bottom, 14)
                    .transition(reveal)
            }
            if let totals {
                TransactionTotalsPanel(totals: totals)
                    .transition(reveal)
            }
        }
        .animation(.smooth(duration: 0.35), value: totals != nil)
        .animation(.smooth(duration: 0.35), value: chips.map(\.id))
        .card(radius: Self.pillRadius, elevation: 3)
    }

    private static let pillRadius: CGFloat = 20

    /// Chips and totals fade in and settle down from the top, or only fade when motion is reduced.
    private var reveal: AnyTransition {
        reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.96, anchor: .top))
    }
}
