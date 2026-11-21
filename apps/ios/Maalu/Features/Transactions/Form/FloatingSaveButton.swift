import SwiftUI

/// The transaction form's confirm button as a big Liquid Glass button floating at the bottom, with a spinner in its place while the save is on its way. It lives in a `safeAreaBar`, so the form scrolls under it with a soft blurred edge.
struct FloatingSaveButton: View {
    let isSaving: Bool
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isSaving {
                    ProgressView().accessibilityLabel("Saving")
                } else {
                    Text("Save").font(.body.weight(.semibold))
                }
            }
            .frame(maxWidth: .infinity, minHeight: 46)
        }
        .buttonStyle(.glassProminent)
        .tint(.brand)
        .disabled(!isEnabled || isSaving)
        .padding(.horizontal, 28)
        .padding(.bottom, 10)
    }
}
