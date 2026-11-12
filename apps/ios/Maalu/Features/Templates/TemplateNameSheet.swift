import SwiftUI

/// One name field, for saving a form as a template and for renaming one. `onSave` returns a message
/// when the server refused, and the sheet stays open with it.
struct TemplateNameSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool
    let title: LocalizedStringResource
    let helper: LocalizedStringResource?
    let onSave: (String) async -> String?

    init(title: LocalizedStringResource, initialName: String = "", helper: LocalizedStringResource? = nil, onSave: @escaping (String) async -> String?) {
        self.title = title
        self.helper = helper
        self.onSave = onSave
        _name = State(initialValue: initialName)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                        .focused($isFocused)
                } footer: {
                    if let helper {
                        Text(helper)
                    }
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle(String(localized: title))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(isSaving || Self.problem(name) != nil)
                }
            }
            .interactiveDismissDisabled(isSaving)
        }
        .task { isFocused = true }
    }

    /// The first thing wrong with a template's name, or nil. The server checks again.
    static func problem(_ name: String) -> LocalizedStringResource? {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return "Give it a name." }
        if trimmed.count > 200 { return "A name can have 200 characters at most." }
        return nil
    }

    private func save() {
        isSaving = true
        errorMessage = nil
        Task {
            if let message = await onSave(name) {
                errorMessage = message
                isSaving = false
            } else {
                dismiss()
            }
        }
    }
}
