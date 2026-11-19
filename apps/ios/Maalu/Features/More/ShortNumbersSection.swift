import SwiftUI

struct ShortNumbersSection: View {
    @Environment(Session.self) private var session
    @AppStorage(MoneyFormat.shortKey) private var short = false
    @State private var errorMessage: String?

    var body: some View {
        Section {
            Toggle("Short numbers", isOn: Binding(get: { short }, set: save))
        } header: {
            Text("Numbers")
        } footer: {
            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            } else {
                Text("Write amounts of a thousand and over short, like \(MoneyFormat.string(Decimal(1_234_500), currency: "MVR", short: true)). Tap a short amount to see it in full.")
            }
        }
    }

    private func save(_ on: Bool) {
        Task {
            guard let api = session.api else { return }
            errorMessage = await ShortNumbers.save(on, using: api)
        }
    }
}
