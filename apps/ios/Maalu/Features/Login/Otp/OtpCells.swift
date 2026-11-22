import SwiftUI

/// The drawing of a one-time code: a row of cells under a blur-and-threshold filter, with the digits over them. A right code slides the cells together while a capsule grows from the middle, and the filter fuses them into one shape that says "Verified"; a wrong one shivers the row and lets the digits fall out.
/// The design is Bencho's One-time code block (MIT, bencho.dev), redrawn in SwiftUI: the filter is a `Canvas` blur followed by `alphaThreshold`.
/// It is `Animatable` in `merge` (0 to 1, a little past on a spring) and `shake` (0 to 1), so its body runs every frame of those animations.
struct OtpCells: View, Animatable {
    let code: String
    let length: Int
    let isChecking: Bool
    let showsCaret: Bool
    let cellColor: Color
    var merge: Double
    var shake: Double
    @Environment(\.colorScheme) private var scheme

    nonisolated var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(merge, shake) }
        set { merge = newValue.first; shake = newValue.second }
    }

    static let cellWidth: CGFloat = 42
    static let height: CGFloat = 52
    private static let gap: CGFloat = 8
    private static let capsuleWidth: CGFloat = 150
    private static let shakeSeconds = 0.62
    private static let pad: CGFloat = 14

    static func rowWidth(_ length: Int) -> CGFloat { CGFloat(length) * cellWidth + CGFloat(length - 1) * gap }

    private var rowWidth: CGFloat { Self.rowWidth(length) }
    private var m: Double { min(max(merge, 0), 1) }

    private func smooth(_ a: Double, _ b: Double, _ v: Double) -> Double {
        let u = min(max((v - a) / (b - a), 0), 1)
        return u * u * (3 - 2 * u)
    }

    private func home(_ i: Int) -> CGFloat { CGFloat(i) * (Self.cellWidth + Self.gap) }

    /// A decaying wave down the row after a wrong code.
    private func wobble(_ i: Int) -> CGFloat {
        guard shake > 0, shake < 1 else { return 0 }
        let t = shake * Self.shakeSeconds
        return 5 * exp(-t / 0.19) * sin(t * 2 * .pi * 10 + Double(i) * 0.55)
    }

    private func cellX(_ i: Int) -> CGFloat {
        let middle = (rowWidth - Self.cellWidth) / 2
        return home(i) + (middle - home(i)) * m + wobble(i)
    }

    var body: some View {
        TimelineView(.animation(paused: !isChecking)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            ZStack {
                goo(time: time)
                digits
                caret
                verified
            }
            .frame(width: rowWidth, height: Self.height)
        }
    }

    /// The cells and the capsule, drawn solid and joined by the filter.
    private func goo(time: Double) -> some View {
        Canvas { context, _ in
            context.addFilter(.alphaThreshold(min: 0.5, color: cellColor.mix(with: .green, by: 0.22 * m)))
            context.addFilter(.blur(radius: 3))
            context.drawLayer { layer in
                let radius = Self.height / 2 * smooth(0.15, 0.7, m) + 12 * (1 - smooth(0.15, 0.7, m))
                for i in 0..<length {
                    let x = Self.pad + cellX(i)
                    let scale = breath(i, time: time)
                    let rect = CGRect(x: x + Self.cellWidth * (1 - scale) / 2, y: Self.pad + Self.height * (1 - scale) / 2, width: Self.cellWidth * scale, height: Self.height * scale)
                    layer.fill(Path(roundedRect: rect, cornerRadius: radius), with: .color(.black))
                }
                let overshoot = merge - 1
                let width = Self.capsuleWidth * smooth(0.3, 1, m) * (1 + max(-0.12, overshoot) * 0.9)
                if width > 0.5 {
                    let stretch = 1 - max(-0.12, overshoot) * 0.55
                    let height = Self.height * stretch
                    let rect = CGRect(x: Self.pad + (rowWidth - width) / 2, y: Self.pad + (Self.height - height) / 2, width: width, height: height)
                    layer.fill(Path(roundedRect: rect, cornerRadius: height / 2), with: .color(.black))
                }
            }
        }
        .frame(width: rowWidth + Self.pad * 2, height: Self.height + Self.pad * 2)
        // white cells need a lift off the pale sky; the shadow follows the fused shape, so it works on the capsule too
        .shadow(color: .black.opacity(scheme == .dark ? 0 : 0.06), radius: 1.5, y: 1)
        .shadow(color: .black.opacity(scheme == .dark ? 0 : 0.08), radius: 8, y: 4)
        .accessibilityHidden(true)
    }

    /// While the code is being checked a soft wave of breath goes through the cells.
    private func breath(_ i: Int, time: Double) -> CGFloat {
        guard isChecking else { return 1 }
        let u = (time.truncatingRemainder(dividingBy: 0.9) / 0.9) * Double(length + 2) - Double(i)
        return 1 - 0.07 * (u > 0 && u < 2 ? sin(u / 2 * .pi) : 0)
    }

    private var digits: some View {
        ZStack {
            ForEach(0..<length, id: \.self) { i in
                if i < code.count {
                    let digit = String(code[code.index(code.startIndex, offsetBy: i)])
                    let out = shake > 0 ? smooth(0, 1, (shake * Self.shakeSeconds - 0.3 - Double(length - 1 - i) * 0.045) / 0.22) : 0
                    Text(digit)
                        .font(.title.weight(.semibold).monospacedDigit())
                        .opacity((1 - smooth(0, 0.45, m)) * (1 - out))
                        .offset(x: cellX(i) + Self.cellWidth / 2 - rowWidth / 2, y: out * 8)
                        .transition(.offset(y: 14).combined(with: .opacity).combined(with: .scale(scale: 0.86)))
                        .id("\(i)-\(digit)")
                }
            }
        }
        .animation(.snappy(duration: 0.28), value: code)
        .accessibilityHidden(true)
    }

    private var caret: some View {
        let index = min(code.count, length - 1)
        return Capsule()
            .fill(Color.accentColor)
            .frame(width: 2, height: 24)
            .offset(x: home(index) + Self.cellWidth / 2 - rowWidth / 2)
            .opacity(showsCaret && code.count < length && m < 0.08 ? 1 : 0)
            .animation(.spring(duration: 0.3, bounce: 0.3), value: index)
            .accessibilityHidden(true)
    }

    private var verified: some View {
        Label("Verified", systemImage: "checkmark")
            .font(.subheadline.weight(.semibold))
            .opacity(smooth(0.72, 1, m))
            .scaleEffect(0.92 + 0.08 * smooth(0.72, 1, m))
    }
}
