import Foundation

extension Category {
    /// "Food › Groceries" for a sub-category, just the name for any other.
    var path: String {
        parent.map { "\($0) › \(name)" } ?? name
    }

    /// The line under the name: what the category is, whether it is the default, and what uses it.
    var summary: String {
        var parts: [String] = []
        if let effectiveKind {
            if kind == nil, let parent {
                parts.append(String(localized: "\(effectiveKind.title) · from \(parent)"))
            } else {
                parts.append(String(localized: effectiveKind.title))
            }
        } else {
            parts.append(String(localized: "Not sorted"))
        }
        if isSalary { parts.append(String(localized: "Default · pay")) }
        if childCount > 0 {
            parts.append(childCount == 1 ? String(localized: "1 sub-category") : String(localized: "\(childCount) sub-categories"))
        }
        parts.append(transactionCount == 1 ? String(localized: "1 transaction") : String(localized: "\(transactionCount) transactions"))
        if subscriptionCount > 0 {
            parts.append(subscriptionCount == 1 ? String(localized: "1 subscription") : String(localized: "\(subscriptionCount) subscriptions"))
        }
        return parts.joined(separator: " · ")
    }
}
