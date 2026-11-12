import SwiftUI

/// A tap starts a new transaction from the template; rename and delete are the row's swipe actions.
struct TemplateRow: View {
    let template: TransactionTemplate
    let onUse: () -> Void

    var body: some View {
        Button(action: onUse) {
            VStack(alignment: .leading) {
                Text(template.name)
                Text(template.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
