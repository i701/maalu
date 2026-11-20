import SwiftUI

struct SettingsView: View {
    @Environment(Session.self) private var session
    @State private var model = SettingsModel()

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if let settings = model.settings {
                Section {
                    LabeledContent("Email", value: settings.email)
                }
                ShortNumbersSection()
                Section {
                    Toggle("Start from a template", isOn: flag("start_from_template", settings.startFromTemplate) { $0.startFromTemplate = $1 })
                    Picker("Default account", selection: defaultAccount(settings)) {
                        Text("None").tag(String?.none)
                        ForEach(model.accounts) { Text($0.name).tag(String?.some($0.id)) }
                    }
                } header: {
                    Text("New transactions")
                } footer: {
                    Text("Offer your saved templates when adding a transaction. A new transaction starts in the default account.")
                }
                Section {
                    Toggle("Payments", isOn: flag("notify_payments", settings.notifyPayments) { $0.notifyPayments = $1 })
                    Toggle("Budget", isOn: flag("notify_budget", settings.notifyBudget) { $0.notifyBudget = $1 })
                    Toggle("Goals", isOn: flag("notify_goals", settings.notifyGoals) { $0.notifyGoals = $1 })
                    if model.canEmail {
                        Toggle("Email me", isOn: flag("notify_email", settings.notifyEmail) { $0.notifyEmail = $1 })
                        Toggle("Sign-in alerts", isOn: flag("notify_login", settings.notifyLogin) { $0.notifyLogin = $1 })
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text(model.canEmail ? "Email goes to \(settings.email)." : "Email is not set up on this server.")
                }
                Section("Security") {
                    NavigationLink("Change password", value: SettingsRoute.password)
                    NavigationLink("Two-factor sign-in", value: SettingsRoute.twoFactor)
                    NavigationLink("Where you are signed in", value: SettingsRoute.sessions)
                }
            }
        }
        .overlay { if model.settings == nil && model.errorMessage == nil { ProgressView() } }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: SettingsRoute.self) { route in
            switch route {
            case .password: ChangePasswordView(twoFactor: model.settings?.twoFactorEnabled ?? false)
            case .twoFactor: TwoFactorView(enabled: model.settings?.twoFactorEnabled ?? false) { await load() }
            case .sessions: SessionsView()
            }
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func flag(_ key: String, _ value: Bool, change: @escaping (inout UserSettings, Bool) -> Void) -> Binding<Bool> {
        Binding(get: { value }, set: { on in save(key, on) { change(&$0, on) } })
    }

    private func defaultAccount(_ settings: UserSettings) -> Binding<String?> {
        Binding(get: { settings.defaultAccountId }, set: { id in save("default_account_id", id) { $0.defaultAccountId = id } })
    }

    private func save<Value: Encodable & Sendable>(_ key: String, _ value: Value, change: @escaping (inout UserSettings) -> Void) {
        Task {
            guard let api = session.api else { return }
            await model.save(key, value, change: change, using: api)
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}
