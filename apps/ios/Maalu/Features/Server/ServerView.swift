import SwiftUI

struct ServerView: View {
    @Environment(Session.self) private var session
    @State private var model = ServerModel()

    var body: some View {
        Form {
            Section {
                TextField("maalu.example.com", text: $model.address)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            } header: {
                Text("Your Maalu server")
            } footer: {
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                } else {
                    Text("The address you open Maalu at in a browser.")
                }
            }
            Button(model.isChecking ? "Checking…" : "Continue", action: connect)
                .disabled(!model.canConnect)
        }
        .navigationTitle("Maalu")
    }

    private func connect() {
        Task { await model.connect(using: session) }
    }
}
