import Foundation

/// The pure rules for picking parents and merge targets. The server checks everything again.
enum CategoryLogic {
    /// The categories `self` may sit under: top-level ones other than itself. The tree is one
    /// level, so a category that has sub-categories of its own cannot become one.
    static func parentChoices(from categories: [Category], for category: Category?) -> [Category] {
        if let category, category.childCount > 0 { return [] }
        return categories.filter { $0.parentId == nil && $0.id != category?.id }
    }

    /// The categories `self` can be merged into: every other one (the server refuses the rest).
    static func mergeTargets(from categories: [Category], for category: Category) -> [Category] {
        categories.filter { $0.id != category.id }
    }
}
