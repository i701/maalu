import SwiftUI

struct SalarySplitLineRow: View {
    @Binding var line: SalarySplitLine

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Toggle(isOn: $line.isOn) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(line.name)
                    Text((line.reason ?? line.rule) + (line.isAuto && !line.isDone ? " · " + String(localized: "moves automatically") : ""))
                        .font(.subheadline)
                        .foregroundStyle(line.reason != nil && !line.isDone ? Color.red : Color.secondary)
                }
            }
            .disabled(line.reason != nil)
            if line.isOn {
                DecimalField("Amount", value: $line.amount)
            }
        }
    }
}
