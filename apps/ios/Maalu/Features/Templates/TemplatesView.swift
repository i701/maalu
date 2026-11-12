import SwiftUI

struct TemplatesView: View {
    @Environment(Session.self) private var session
    @State private var model = TemplatesModel()
    @State private var using: TransactionTemplate?
    @State private var renaming: TransactionTemplate?
    @State private var deleting: TransactionTemplate?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.templates) { template in
                    TemplateRow(template: template) { using = template }
                        .swipeActions(edge: .trailing) {
                            Button("Delete", systemImage: "trash", role: .destructive) {
                                deleting = template
                                isConfirmingDelete = true
                            }
                            Button("Rename", systemImage: "pencil") { renaming = template }
                        }
                }
            }
        }
        .overlay { TemplatesPlaceholder(model: model) }
        .navigationTitle("Templates")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $using) { template in
            TransactionFormView(startingFrom: template, onSaved: {})
        }
        .sheet(item: $renaming) { template in
            TemplateNameSheet(title: "Rename template", initialName: template.name) { name in
                await rename(template, to: name)
            }
        }
        .confirmationDialog("Delete this template?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: deleteSelected)
        } message: {
            Text("Transactions made from it are not affected.")
        }
        .alert("Something went wrong", item: $errorMessage) { _ in
        } message: { message in
            Text(message)
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func rename(_ template: TransactionTemplate, to name: String) async -> String? {
        guard let api = session.api else { return "Something went wrong." }
        return await model.rename(template, to: name, using: api)
    }

    private func deleteSelected() {
        guard let template = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.delete(template, using: api)
        }
    }
}
