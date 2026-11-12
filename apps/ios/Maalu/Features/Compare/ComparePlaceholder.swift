import SwiftUI

struct ComparePlaceholder: View {
    let model: CompareModel

    var body: some View {
        if model.isLoading && !model.hasContent {
            ProgressView()
        }
    }
}
