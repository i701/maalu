import SwiftUI

/// Figures in Rubik at the surrounding text style, so Dynamic Type still scales them, with tabular digits.
/// Headline figures are Medium: Rubik's Bold outweighs the title above them.
struct NumericFont: ViewModifier {
    @Environment(\.font) private var font

    func body(content: Content) -> some View {
        let (size, style, weight) = metrics
        content
            .font(.custom("Rubik", size: size, relativeTo: style).weight(weight))
            .monospacedDigit()
    }

    /// The system text styles' sizes at the default Dynamic Type setting.
    private var metrics: (CGFloat, Font.TextStyle, Font.Weight) {
        switch font {
        case .largeTitle: (34, .largeTitle, .medium)
        case .title: (28, .title, .medium)
        case .title2: (22, .title2, .regular)
        case .title3: (20, .title3, .regular)
        case .headline: (17, .headline, .semibold)
        case .callout: (16, .callout, .regular)
        case .subheadline: (15, .subheadline, .regular)
        case .footnote: (13, .footnote, .regular)
        case .caption: (12, .caption, .regular)
        case .caption2: (11, .caption2, .regular)
        default: (17, .body, .regular)
        }
    }
}

extension View {
    func numericFont() -> some View {
        modifier(NumericFont())
    }
}
