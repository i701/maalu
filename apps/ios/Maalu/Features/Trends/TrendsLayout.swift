import Foundation

/// The same data as a table of months or as stacked columns.
enum TrendsLayout: String, CaseIterable, Identifiable {
    case table, chart

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .table: "Table"
        case .chart: "Chart"
        }
    }
}
