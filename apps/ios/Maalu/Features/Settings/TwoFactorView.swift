import SwiftUI

struct TwoFactorView: View {
    private enum Sheet: Identifiable {
        case setup, turnOff, newCodes
        case codes([String])

        var id: String {
            switch self {
            case .setup: "setup"
            case .turnOff: "turn-off"
            case .newCodes: "new-codes"
            case .codes: "codes"
            }
        }
    }

    @State private var enabled: Bool
    @State private var sheet: Sheet?
    /// Runs after the setting changed, so Settings can read it again.
    let onChanged: () async -> Void

    init(enabled: Bool, onChanged: @escaping () async -> Void) {
        _enabled = State(initialValue: enabled)
        self.onChanged = onChanged
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Status", value: enabled ? "On" : "Off")
            } footer: {
                Text(enabled
                    ? "Signing in also needs a 6-digit code from your authenticator app, or one of your recovery codes."
                    : "Ask for a 6-digit code from an authenticator app when you sign in, on top of your password.")
            }
            Section {
                if enabled {
                    Button("New recovery codes") { sheet = .newCodes }
                    Button("Turn off", role: .destructive) { sheet = .turnOff }
                } else {
                    Button("Set up") { sheet = .setup }
                }
            } footer: {
                Text("Turning it on or off, or making new recovery codes, signs out your other devices.")
            }
        }
        .navigationTitle("Two-factor sign-in")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $sheet) { sheet in
            NavigationStack {
                switch sheet {
                case .setup:
                    TwoFactorSetupView { codes in changed(on: true, showing: codes) }
                case .turnOff:
                    TwoFactorConfirmView(kind: .turnOff) { _ in changed(on: false, showing: nil) }
                case .newCodes:
                    TwoFactorConfirmView(kind: .newCodes) { codes in changed(on: true, showing: codes) }
                case .codes(let codes):
                    RecoveryCodesView(codes: codes)
                }
            }
        }
    }

    private func changed(on: Bool, showing codes: [String]?) {
        enabled = on
        sheet = codes.map(Sheet.codes)
        Task { await onChanged() }
    }
}
