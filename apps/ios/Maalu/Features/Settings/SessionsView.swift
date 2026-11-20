import SwiftUI

struct SessionsView: View {
    @Environment(Session.self) private var session
    @State private var model = SessionsModel()
    @State private var isConfirmingOthers = false

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.sessions) { device in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(DeviceName.describe(device.userAgent)).fontWeight(.medium)
                            if device.current {
                                Text("This device").font(.caption).foregroundStyle(.tint)
                            }
                        }
                        Text("Last used \(DeviceName.ago(device.lastUsedAt))" + (device.ipAddress.map { " · \($0)" } ?? ""))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .swipeActions(edge: .trailing) {
                        if !device.current {
                            Button("Sign out", role: .destructive) { end(device) }
                        }
                    }
                }
            } footer: {
                Text("A sign-in ends 30 days after you last used it. Swipe a device to sign it out if you don't recognise it.")
            }
            Section {
                Button("Sign out all other devices", role: .destructive) { isConfirmingOthers = true }
                    .disabled(model.otherCount == 0)
            }
        }
        .overlay { if model.isLoading { ProgressView() } }
        .navigationTitle("Where you are signed in")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .confirmationDialog("Sign out all other devices?", isPresented: $isConfirmingOthers, titleVisibility: .visible) {
            Button("Sign out \(model.otherCount) other \(model.otherCount == 1 ? "device" : "devices")", role: .destructive) {
                Task {
                    guard let api = session.api else { return }
                    await model.endOthers(using: api)
                }
            }
        }
    }

    private func end(_ device: DeviceSession) {
        Task {
            guard let api = session.api else { return }
            await model.end(device, using: api)
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}
