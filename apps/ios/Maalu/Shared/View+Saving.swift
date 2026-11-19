import SwiftUI

extension View {
    /// While a form is saving: nothing in it can be changed and the sheet cannot be swiped away, so what is sent is what was on screen.
    func saving(_ isSaving: Bool) -> some View {
        disabled(isSaving).interactiveDismissDisabled(isSaving)
    }
}
