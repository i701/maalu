import Foundation

struct Category: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let color: String
    let kind: CategoryKind?
    let effectiveKind: CategoryKind?
    let isSalary: Bool
    let parentId: String?
    let parent: String?
    let childCount: Int
    let transactionCount: Int
    let subscriptionCount: Int
}
