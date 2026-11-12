import Foundation

struct CategoryDraft {
    var id: String?
    var name = ""
    /// nil = automatic: a new category gets the colour you use least, an edited one keeps its own.
    var color: String?
    var parentId: String?
    var kind: CategoryKind?

    init() {}

    init(editing category: Category) {
        id = category.id
        name = category.name
        color = category.color
        parentId = category.parentId
        kind = category.kind
    }
}
