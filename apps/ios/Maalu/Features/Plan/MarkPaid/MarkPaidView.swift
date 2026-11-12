import SwiftUI

struct MarkPaidView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var loader: MarkPaidLoader
    private let onDone: () -> Void

    init(transactionID: String, onDone: @escaping () -> Void) {
        _loader = State(initialValue: MarkPaidLoader(transactionID: transactionID))
        self.onDone = onDone
    }

    var body: some View {
        NavigationStack {
            Group {
                if let form = loader.form {
                    MarkPaidForm(model: form, onDone: onDone)
                } else if let message = loader.errorMessage {
                    ContentUnavailableView("Could not load it", systemImage: "exclamationmark.triangle", description: Text(message))
                } else {
                    ProgressView()
                }
            }
            .toolbar {
                if loader.form == nil {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel", role: .cancel) { dismiss() }
                    }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await loader.load(using: api)
    }
}
