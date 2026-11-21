import SwiftUI

extension EnvironmentValues {
    /// The type of the form page being drawn. The three pages sit side by side while you swipe between them, so each is laid out for its own type, not for the draft's.
    @Entry var formType: TransactionType?
}
