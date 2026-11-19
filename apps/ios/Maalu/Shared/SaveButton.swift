import SwiftUI

/// A form's confirm button: a spinner in its place while the save is on its way, the button again once it succeeds or fails.
struct SaveButton: View {
    let title: LocalizedStringKey
    let isSaving: Bool
    let isEnabled: Bool
    let action: () -> Void

    init(_ title: LocalizedStringKey = "Save", isSaving: Bool, isEnabled: Bool = true, action: @escaping () -> Void) {
        self.title = title
        self.isSaving = isSaving
        self.isEnabled = isEnabled
        self.action = action
    }

    var body: some View {
        if isSaving {
            ProgressView()
                .accessibilityLabel("Saving")
        } else {
            Button(title, action: action)
                .disabled(!isEnabled)
        }
    }
}
