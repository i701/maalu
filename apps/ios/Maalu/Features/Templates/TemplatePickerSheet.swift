import SwiftUI

/// "Start from a template": choosing one refills the form from it.
struct TemplatePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let templates: [TransactionTemplate]
    let onPick: (TransactionTemplate) -> Void

    var body: some View {
        NavigationStack {
            List(templates) { template in
                Button {
                    onPick(template)
                    dismiss()
                } label: {
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
            .navigationTitle("Start from a template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
            }
        }
    }
}
