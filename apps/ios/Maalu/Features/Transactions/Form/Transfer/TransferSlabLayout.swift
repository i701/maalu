import CoreGraphics

/// The measurements of the two slabs of the transfer block: each a fixed height with a thin gap between, and the whole block as tall as both.
enum TransferSlabLayout {
    static let slabHeight: CGFloat = 116
    static let gap: CGFloat = 3
    static var pitch: CGFloat { slabHeight + gap }
    static var blockHeight: CGFloat { slabHeight * 2 + gap }
}
