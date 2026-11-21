import Foundation

/// A piece placed on its month's bar: where it starts and ends, a little short of the next piece so there is air between them.
struct SpendingStackLayer: Identifiable {
    let piece: SpendingStackPiece
    let start: Double
    let end: Double

    var id: String { piece.name }
}
