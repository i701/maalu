import SwiftUI

/// Every category by month. Each cell is shaded by its share of the biggest figure in the table and always shows its number,
/// so shade is never the only signal. The table scrolls sideways with the category names kept in place.
struct TrendsTable: View {
    let data: CategoryMonths
    let rows: [CategoryMonthRow]
    let tint: Color

    private static let nameWidth = 112.0

    var body: some View {
        let biggest = TrendsMath.maxCell(rows)
        let totals = TrendsMath.columnTotals(rows, count: data.months.count)
        let grand = totals.reduce(0, +)
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                name("Category", isHeader: true)
                ForEach(rows) { row in
                    HStack(spacing: 6) {
                        Circle().fill(Color(accent: row.color)).frame(width: 8, height: 8)
                        name(row.category)
                    }
                }
                Divider()
                name("All categories", isBold: true)
            }
            .frame(width: Self.nameWidth)
            ScrollView(.horizontal) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) {
                        ForEach(data.months, id: \.self) { TrendCell(text: TrendsMath.monthColumn($0), isHeader: true) }
                        TrendCell(text: String(localized: "Total"), isHeader: true)
                        TrendCell(text: String(localized: "Per month"), isHeader: true)
                    }
                    ForEach(rows) { row in
                        HStack(spacing: 0) {
                            ForEach(Array(row.values.enumerated()), id: \.offset) { _, value in
                                TrendCell(text: TrendsMath.cellText(value), tint: tint, shade: TrendsMath.heat(value, max: biggest))
                            }
                            TrendCell(text: TrendsMath.cellText(row.totalValue), isBold: true)
                            TrendCell(text: TrendsMath.cellText(TrendsMath.monthlyAverage(row)))
                        }
                    }
                    Divider()
                    HStack(spacing: 0) {
                        ForEach(Array(totals.enumerated()), id: \.offset) { _, value in
                            TrendCell(text: TrendsMath.cellText(value), isBold: true)
                        }
                        TrendCell(text: TrendsMath.cellText(grand), isBold: true)
                        TrendCell(text: TrendsMath.cellText(grand / Decimal(max(data.months.count, 1))))
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }

    private func name(_ text: String, isHeader: Bool = false, isBold: Bool = false) -> some View {
        Text(text)
            .font(isHeader ? .footnote : .subheadline)
            .fontWeight(isBold ? .semibold : .regular)
            .foregroundStyle(isHeader ? Color.secondary : Color.primary)
            .lineLimit(1)
            .frame(maxWidth: .infinity, minHeight: TrendCell.height, alignment: .leading)
    }
}
