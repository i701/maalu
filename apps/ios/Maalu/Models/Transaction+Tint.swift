import SwiftUI

extension Transaction {
    /// A transfer is the brand's blue; everything else takes its category's colour.
    var tint: Color {
        type == .transfer ? .brand : Color(accent: categoryColor)
    }
}
