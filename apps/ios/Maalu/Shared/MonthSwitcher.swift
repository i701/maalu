import SwiftUI

struct MonthSwitcher: View {
    let canGoForward: Bool
    let previous: () -> Void
    let next: () -> Void

    var body: some View {
        ControlGroup {
            Button("Previous month", systemImage: "chevron.left", action: previous)
            Button("Next month", systemImage: "chevron.right", action: next)
                .disabled(!canGoForward)
        }
    }
}
