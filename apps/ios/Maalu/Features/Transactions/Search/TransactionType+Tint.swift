import SwiftUI

extension TransactionType {
    /// The colour of this type's quick filter and of its token in the search field.
    var tint: Color {
        switch self {
        case .income: .success
        case .expense: .red
        case .transfer: .brand
        }
    }
}
