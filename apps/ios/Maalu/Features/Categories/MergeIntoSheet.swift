import SwiftUI

/// "Merge into another category": picking a target moves everything over after one confirm.
struct MergeIntoSheet: View {
    @Environment(\.dismiss) private var dismiss
    let category: Category
    let targets: [Category]
    let onMerge: (Category) async -> String?
    @State private var confirming: Category?
    @State private var isConfirming = false
    @State private var isMerging = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List(targets) { target in
                Button {
                    confirming = target
                    isConfirming = true
                } label: {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color(accent: target.color))
                            .frame(width: 12, height: 12)
                        Text(target.path)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .overlay { if isMerging { ProgressView() } }
            .navigationTitle("Merge into")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
            }
            .confirmationDialog("Merge this category?", isPresented: $isConfirming, titleVisibility: .visible) {
                if let target = confirming {
                    Button("Merge into \(target.name)", role: .destructive) { merge(target) }
                }
            } message: {
                Text(confirming.map { "Everything in \(category.name) moves to \($0.name)." } ?? "")
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        }
    }

    private func merge(_ target: Category) {
        isMerging = true
        Task {
            if let message = await onMerge(target) {
                errorMessage = message
                isMerging = false
            } else {
                dismiss()
            }
        }
    }
}
