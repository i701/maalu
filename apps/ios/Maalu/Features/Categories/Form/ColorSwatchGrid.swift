import SwiftUI

/// The eight accent colours a category can have, plus (for a new category) automatic: nothing
/// selected means the API picks the one you use least.
struct ColorSwatchGrid: View {
    static let names = ["blue", "green", "orange", "violet", "pink", "amber", "lime", "slate"]

    let selection: String?
    let allowsAutomatic: Bool
    let onPick: (String?) -> Void

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
            ForEach(Self.names, id: \.self) { name in
                swatch(name)
            }
            if allowsAutomatic {
                Button(action: { onPick(nil) }) {
                    VStack(spacing: 4) {
                        swatchShape(nil, name: selection == nil ? "Automatic" : "")
                        Text("Automatic")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func swatch(_ name: String) -> some View {
        Button(action: { onPick(name) }) {
            swatchShape(name, name: selection == name ? name : "")
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(name) colour")
        .accessibilityAddTraits(selection == name ? .isSelected : [])
    }

    private func swatchShape(_ name: String?, name label: String) -> some View {
        ZStack {
            Circle()
                .fill(Color(accent: name))
                .frame(width: 36, height: 36)
            if label.isEmpty == false {
                Circle()
                    .strokeBorder(.primary, lineWidth: 2)
                    .frame(width: 44, height: 44)
            } else {
                Circle()
                    .strokeBorder(.quaternary, lineWidth: 1)
                    .frame(width: 44, height: 44)
            }
        }
    }
}
