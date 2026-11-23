import SwiftUI

/// One budget limit as a ring that fills as it is used, with its name and what is left under it.
struct BudgetRing: View {
    let line: BudgetLine
    let currency: String
    @State private var isShown = false

    private var color: Color { Color(budgetStatus: line.status) }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle().inset(by: 3).stroke(color.opacity(0.18), lineWidth: 6)
                Circle()
                    .inset(by: 3)
                    .trim(from: 0, to: isShown ? min(Double(line.percent) / 100, 1) : 0)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(line.percent)%")
                    .font(.caption.weight(.semibold))
                    .numericFont()
            }
            .frame(width: 60, height: 60)
            .revealOnAppear($isShown)
            Text(line.name)
                .font(.caption.weight(.medium))
                .lineLimit(1)
            Text(BudgetText.left(line.available, currency: currency))
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}
