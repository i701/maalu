import Foundation

enum LabelSpread {
    /// Keeps stacked labels apart: each centre at least `gap` from the one above, kept inside `0...limit`.
    static func positions(_ centers: [Double], gap: Double, limit: Double) -> [Double] {
        let order = centers.indices.sorted { centers[$0] < centers[$1] }
        var result = centers
        var last = -Double.infinity
        for index in order {
            result[index] = max(centers[index], last + gap)
            last = result[index]
        }
        var next = limit
        for index in order.reversed() {
            result[index] = min(result[index], next)
            next = result[index] - gap
        }
        return result.map { max(0, $0) }
    }
}
