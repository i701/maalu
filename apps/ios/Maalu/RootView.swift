import SwiftUI

struct RootView: View {
    @Environment(Session.self) private var session

    var body: some View {
        if session.server == nil {
            ServerView()
        } else if session.token == nil {
            LoginView()
        } else {
            MainTabs()
                .task(id: session.token) { await syncSettings() }
        }
    }

    private func syncSettings() async {
        guard let api = session.api else { return }
        await ShortNumbers.sync(using: api)
    }
}
