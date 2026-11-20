/// A salary waiting on the Pending screen, with its proposed split.
struct SalarySplitTask: Decodable, Identifiable, Hashable {
    let id: String
    let plan: SalarySplitPlan
}
