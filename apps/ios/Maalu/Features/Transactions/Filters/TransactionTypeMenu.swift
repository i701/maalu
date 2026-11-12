import SwiftUI

struct TransactionTypeMenu: View {
    @Binding var selection: TransactionType?
    @Binding var planned: Bool

    var body: some View {
        Menu("Filter", systemImage: "line.3.horizontal.decrease") {
            Toggle("Planned", systemImage: "calendar", isOn: $planned)
            Picker("Type", selection: $selection) {
                Text("All types").tag(TransactionType?.none)
                ForEach(TransactionType.allCases) { type in
                    Text(type.title).tag(Optional(type))
                }
            }
            .pickerStyle(.inline)
        }
        .foregroundStyle(selection == nil && !planned ? Color.primary : Color.accentColor)
    }
}
