import Foundation

extension MovePeriod {
    var header: String {
        guard let from = ISODate.date(start), let to = ISODate.date(end) else { return start }
        let calendar = Calendar.current
        let wholeMonth = calendar.component(.day, from: from) == 1
            && calendar.date(byAdding: .day, value: 1, to: to).map { calendar.component(.day, from: $0) == 1 } == true
        if wholeMonth { return from.formatted(.dateTime.month(.wide).year()) }
        return "\(from.formatted(.dateTime.day().month(.abbreviated))) – \(to.formatted(.dateTime.day().month(.abbreviated)))"
    }
}
