import SwiftUI

/// "Merge into another one": a searchable list of the others, and picking one moves everything over after one confirm.
struct MergeSheet<Item: Identifiable & Sendable>: View {
    @Environment(\.dismiss) private var dismiss
    let targets: [Item]
    let name: (Item) -> String
    let question: LocalizedStringResource
    /// What happens, said about the picked one.
    let consequence: (Item) -> String
    let onMerge: (Item) async -> String?
    @State private var confirming: Item?
    @State private var isConfirming = false
    @State private var isMerging = false
    @State private var errorMessage: String?
    @State private var search = ""

    private var shown: [Item] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return typed.isEmpty ? targets : targets.filter { name($0).localizedStandardContains(typed) }
    }

    var body: some View {
        NavigationStack {
            List(shown) { target in
                Button {
                    confirming = target
                    isConfirming = true
                } label: {
                    Text(name(target))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .overlay { if isMerging { ProgressView() } }
            .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always))
            .navigationTitle("Merge into")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
            }
            .confirmationDialog(Text(question), isPresented: $isConfirming, titleVisibility: .visible) {
                if let target = confirming {
                    Button("Merge into \(name(target))", role: .destructive) { merge(target) }
                }
            } message: {
                Text(confirming.map(consequence) ?? "")
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        }
    }

    private func merge(_ target: Item) {
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
