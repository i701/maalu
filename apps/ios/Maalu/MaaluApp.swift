import SwiftUI

@main
struct MaaluApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView().environment(session)
        }
    }
}
