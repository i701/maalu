import SwiftUI

/// A slab's height and position between shut (0) and open over the whole block (1). It is `Animatable`, so its body runs for every frame of the animation and sets the size from the value in between: a Form row does not animate a plain change of frame.
struct TransferSlabGrowth: ViewModifier, Animatable {
    let index: Int
    var progress: Double

    nonisolated var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func body(content: Content) -> some View {
        let shutTop = CGFloat(index) * TransferSlabLayout.pitch
        let height = TransferSlabLayout.slabHeight + (TransferSlabLayout.blockHeight - TransferSlabLayout.slabHeight) * progress
        content
            .frame(height: height, alignment: index == 0 ? .top : .bottom)
            .offset(y: shutTop * (1 - progress))
            .frame(maxHeight: .infinity, alignment: .top)
    }
}
