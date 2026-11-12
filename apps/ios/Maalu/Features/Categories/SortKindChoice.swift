import Foundation

/// One category in the sort dialog, with the kind being chosen for it.
struct SortKindChoice: Identifiable {
    let category: Category
    var kind: CategoryKind?

    var id: String { category.id }
}
