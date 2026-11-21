import SwiftUI

/// The transaction type as loose labels with one Liquid Glass pill, like the navigation of the Copilot Money app. The pill follows the pages as they are swiped (`progress` is the page position, 0 to 2, fractional while moving): it slides and resizes between the two labels it is between, and each label takes its colour as the pill reaches it. Tap a label to go there.
/// The glass is its own layer under the labels, so it never blurs the text above it.
struct TransactionTypePicker: View {
    /// Where the pages are, in pages: 0 for the first type, 1 for the second.
    let progress: Double
    let onSelect: (TransactionType) -> Void
    @State private var frames: [Int: CGRect] = [:]
    @Environment(\.colorScheme) private var scheme

    private var types: [TransactionType] { TransactionType.allCases }

    var body: some View {
        ZStack(alignment: .topLeading) {
            if let pill {
                Capsule()
                    .fill(.clear)
                    .glassEffect(.regular, in: .capsule)
                    .frame(width: pill.width, height: pill.height)
                    .offset(x: pill.minX, y: pill.minY)
            }
            HStack(spacing: 8) {
                ForEach(Array(types.enumerated()), id: \.element.id) { index, type in
                    Button { onSelect(type) } label: {
                        Text(type.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.secondary.mix(with: ChipColors(tint: type.tint, scheme: scheme).ink, by: weight(of: index)))
                            .padding(.horizontal, 16)
                            .frame(height: 34)
                            .contentShape(.capsule)
                    }
                    .buttonStyle(.plain)
                    .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("typeBar")) } action: { frames[index] = $0 }
                    .accessibilityAddTraits(Int(progress.rounded()) == index ? .isSelected : [])
                }
            }
        }
        .coordinateSpace(.named("typeBar"))
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Type")
    }

    /// How much of the pill is on this label: 1 when it is there, 0 a page away.
    private func weight(of index: Int) -> Double {
        max(0, 1 - abs(progress - Double(index)))
    }

    /// The pill's frame, between the frames of the two labels the pages are between.
    private var pill: CGRect? {
        let clamped = min(max(progress, 0), Double(types.count - 1))
        let low = Int(clamped.rounded(.down))
        let high = min(low + 1, types.count - 1)
        guard let a = frames[low], let b = frames[high] else { return nil }
        let t = clamped - Double(low)
        return CGRect(x: a.minX + (b.minX - a.minX) * t, y: a.minY + (b.minY - a.minY) * t, width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t)
    }
}
