import SwiftUI

/// Maalu is self-hosted, so the first thing asked for is the address of the person's own server.
struct ServerView: View {
    @Environment(Session.self) private var session
    @State private var address = ""
    @State private var checking = false
    @State private var error: String?

    var body: some View {
        Form {
            Section {
                TextField("maalu.example.com", text: $address)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            } header: {
                Text("Your Maalu server")
            } footer: {
                Text(error ?? "The address you open Maalu at in a browser.").foregroundStyle(error == nil ? Color.secondary : Color.red)
            }
            Button(checking ? "Checking…" : "Continue") { connect() }
                .disabled(checking || address.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .navigationTitle("Maalu")
    }

    private func connect() {
        let server = normalizeServer(address)
        checking = true
        error = nil
        Task {
            error = await checkServer(server)
            checking = false
            if error == nil { session.setServer(server) }
        }
    }
}
