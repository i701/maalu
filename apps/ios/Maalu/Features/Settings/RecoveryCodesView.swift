import SwiftUI

/// The codes, once. Each works once if the phone with the authenticator app is lost.
struct RecoveryCodesView: View {
    @Environment(\.dismiss) private var dismiss
    let codes: [String]

    var body: some View {
        List {
            Section {
                ForEach(codes, id: \.self) { Text($0).font(.body.monospaced()).textSelection(.enabled) }
            } footer: {
                Text("Keep these somewhere safe. They are not shown again, and each one works once in place of an authenticator code.")
            }
            Section {
                ShareLink("Copy or save the codes", item: codes.joined(separator: "\n"))
            }
        }
        .navigationTitle("Recovery codes")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
        }
        .interactiveDismissDisabled()
    }
}
