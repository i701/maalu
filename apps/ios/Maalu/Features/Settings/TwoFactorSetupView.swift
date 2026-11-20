import SwiftUI

/// Add the secret to an authenticator app, then prove it works with a code.
struct TwoFactorSetupView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model = TwoFactorSetupModel()
    let onEnabled: ([String]) -> Void

    var body: some View {
        @Bindable var model = model
        Form {
            if let setup = model.setup {
                Section {
                    if let image = QRCode.image(for: setup.otpauthUri) {
                        Image(uiImage: image)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: 220)
                            .frame(maxWidth: .infinity)
                            .accessibilityLabel("QR code for your authenticator app")
                    }
                    if let url = URL(string: setup.otpauthUri) {
                        Link("Open in an authenticator app", destination: url)
                    }
                } header: {
                    Text("1. Add it to your app")
                } footer: {
                    Text("Scan the code from another device, or open it here if the app is on this phone.")
                }
                Section {
                    LabeledContent("Key") { Text(setup.secret).font(.footnote.monospaced()).textSelection(.enabled) }
                } footer: {
                    Text("Or type this key into the app by hand.")
                }
                Section {
                    TextField("6-digit code", text: $model.code)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                } header: {
                    Text("2. Enter the code it shows")
                } footer: {
                    if let message = model.errorMessage {
                        Text(message).foregroundStyle(.red)
                    } else {
                        Text("Turning it on signs out your other devices.")
                    }
                }
            } else if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
        }
        .overlay { if model.setup == nil && model.errorMessage == nil { ProgressView() } }
        .navigationTitle("Set up two-factor")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) {
                Button("Turn on", action: enable).disabled(!model.canEnable)
            }
        }
        .task {
            guard let api = session.api else { return }
            await model.start(using: api)
        }
    }

    private func enable() {
        Task {
            guard let api = session.api, let codes = await model.enable(using: api) else { return }
            onEnabled(codes)
        }
    }
}
