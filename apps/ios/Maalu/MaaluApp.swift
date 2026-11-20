import CoreText
import SwiftUI

@main
struct MaaluApp: App {
    @State private var session = Session()

    init() {
        if let url = Bundle.main.url(forResource: "Sora-VariableFont_wght", withExtension: "ttf") {
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView().environment(session)
        }
    }
}
