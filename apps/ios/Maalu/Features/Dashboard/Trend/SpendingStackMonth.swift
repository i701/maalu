import Foundation

/// One month's bar: what was spent, split by category, bottom piece first.
struct SpendingStackMonth: Identifiable {
    /// `2026-03`.
    let id: String
    let start: Date
    let pieces: [SpendingStackPiece]

    var total: Decimal { pieces.reduce(0) { $0 + $1.value } }

    func value(of name: String) -> Decimal {
        pieces.first { $0.name == name }?.value ?? 0
    }

    /// The pieces stacked from the baseline, each ending `gap` short of where the next begins (never more than a third of its own height).
    func layers(gap: Double) -> [SpendingStackLayer] {
        var start = 0.0
        return pieces.map { piece in
            let end = start + piece.amount
            defer { start = end }
            return SpendingStackLayer(piece: piece, start: start, end: end - min(gap, piece.amount / 3))
        }
    }
}
