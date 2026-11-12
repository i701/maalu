import SwiftUI

struct TransactionTypeMenu: View {
    @Binding var selection: TransactionType?

    var body: some View {
        Menu("Filter", systemImage: "line.3.horizontal.decrease") {
            Picker("Type", selection: $selection) {
                Text("All types").tag(TransactionType?.none)
                ForEach(TransactionType.allCases) { type in
                    Text(type.title).tag(Optional(type))
                }
            }
            .pickerStyle(.inline)
        }
        .symbolVariant(selection == nil ? .none : .fill)
    }
}
