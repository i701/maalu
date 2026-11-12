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
        }
    }
}
