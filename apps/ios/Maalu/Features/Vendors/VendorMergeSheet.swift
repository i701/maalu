import SwiftUI

/// "Merge into another vendor": picking one moves everything over after one confirm.
struct VendorMergeSheet: View {
    @Environment(\.dismiss) private var dismiss
    let vendor: Vendor
    let targets: [Vendor]
    let onMerge: (Vendor) async -> String?
    @State private var confirming: Vendor?
    @State private var isConfirming = false
    @State private var isMerging = false
    @State private var errorMessage: String?
    @State private var search = ""

    private var shown: [Vendor] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return typed.isEmpty ? targets : targets.filter { $0.name.localizedStandardContains(typed) }
    }

    var body: some View {
        NavigationStack {
            List(shown) { target in
                Button {
                    confirming = target
                    isConfirming = true
                } label: {
                    Text(target.name)
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
            .confirmationDialog("Merge this vendor?", isPresented: $isConfirming, titleVisibility: .visible) {
                if let target = confirming {
                    Button("Merge into \(target.name)", role: .destructive) { merge(target) }
                }
            } message: {
                Text(confirming.map { "Every transaction, subscription and template of \(vendor.name) moves to \($0.name), which takes any details it lacks. \(vendor.name) is then deleted." } ?? "")
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        }
    }

    private func merge(_ target: Vendor) {
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
