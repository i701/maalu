import SwiftUI

/// Finding a place by name. It asks the server only when Search is pressed, never while typing.
struct LocationSearchSection: View {
    @Bindable var model: LocationPickerModel
    let onSearch: () -> Void
    let onChoose: (PlaceSearchHit) -> Void

    var body: some View {
        Section {
            HStack {
                TextField("A shop, a street, a town", text: $model.search)
                    .submitLabel(.search)
                    .onSubmit(onSearch)
                if model.isSearching {
                    ProgressView()
                } else {
                    Button("Search", action: onSearch)
                        .disabled(model.search.trimmingCharacters(in: .whitespaces).count < 2)
                }
            }
            ForEach(model.results) { hit in
                Button { onChoose(hit) } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(hit.name)
                        Text(hit.address)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text("Find a place")
        } footer: {
            Text("Only what you type, and roughly where the map is, is sent to look it up.")
        }
    }
}
