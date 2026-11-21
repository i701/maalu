import SwiftUI

/// A slab's height between shut (0) and open over the whole block (1), with its content clipped to it so a list taller than the slab does not spill out while it grows. It is `Animatable`, so its body runs for every frame of the animation and sets the size from the value in between: a Form row does not animate a plain change of frame.
struct TransferSlabGrowth: ViewModifier, Animatable {
    let index: Int
    let radius: CGFloat
    var progress: Double

    nonisolated var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func body(content: Content) -> some View {
        let height = TransferSlabLayout.slabHeight + (TransferSlabLayout.blockHeight - TransferSlabLayout.slabHeight) * progress
        content
            .frame(height: height, alignment: index == 0 ? .top : .bottom)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

/// Where a slab sits while it grows: from its place in the block up (or down) to the block's top edge.
struct TransferSlabOffset: ViewModifier, Animatable {
    let index: Int
    var progress: Double

    nonisolated var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func body(content: Content) -> some View {
        content
            .offset(y: CGFloat(index) * TransferSlabLayout.pitch * (1 - progress))
            .frame(maxHeight: .infinity, alignment: .top)
    }
}
