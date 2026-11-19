import SwiftUI

/// Figures in Rubik at the surrounding text style, so Dynamic Type still scales them, with tabular digits.
/// Headline figures are Medium and tracked tighter (as the web's figures, -0.03em): Rubik is wide, and its Bold outweighs the title above them.
struct NumericFont: ViewModifier {
    @Environment(\.font) private var font

    func body(content: Content) -> some View {
        let (size, style, weight, tracking) = metrics
        content
            .font(.custom("Rubik", size: size, relativeTo: style).weight(weight))
            .monospacedDigit()
            .tracking(size * tracking)
    }

    /// The system text styles' sizes at the default Dynamic Type setting, and the tracking in ems.
    private var metrics: (CGFloat, Font.TextStyle, Font.Weight, CGFloat) {
        switch font {
        case .largeTitle: (34, .largeTitle, .medium, -0.03)
        case .title: (28, .title, .medium, -0.03)
        case .title2: (22, .title2, .regular, -0.02)
        case .title3: (20, .title3, .regular, -0.02)
        case .headline: (17, .headline, .semibold, 0)
        case .callout: (16, .callout, .regular, 0)
        case .subheadline: (15, .subheadline, .regular, 0)
        case .footnote: (13, .footnote, .regular, 0)
        case .caption: (12, .caption, .regular, 0)
        case .caption2: (11, .caption2, .regular, 0)
        default: (17, .body, .regular, 0)
        }
    }
}

extension View {
    func numericFont() -> some View {
        modifier(NumericFont())
    }
}
