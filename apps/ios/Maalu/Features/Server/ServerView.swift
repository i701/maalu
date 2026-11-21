import SwiftUI

struct ServerView: View {
    @Environment(Session.self) private var session
    @State private var model = ServerModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                AuthHeader()
                VStack(alignment: .leading, spacing: 10) {
                    Text("Your Maalu server")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    TextField("maalu.example.com", text: $model.address)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .padding(Spacing.card)
                        .card()
                    if let message = model.errorMessage {
                        Text(message).font(.footnote).foregroundStyle(.red)
                    } else {
                        Text("The address you open Maalu at in a browser.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                Button(action: connect) {
                    Text(model.isChecking ? "Checking…" : "Continue")
                        .font(.body.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 46)
                }
                .buttonStyle(.glassProminent)
                .tint(.brand)
                .padding(.horizontal, 12)
                .disabled(!model.canConnect)
            }
            .padding(.horizontal, Spacing.screen)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .gradientHeader()
        .tint(.brand)
    }

    private func connect() {
        Task { await model.connect(using: session) }
    }
}
