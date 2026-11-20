import SwiftUI

struct VendorsView: View {
    @Environment(Session.self) private var session
    @State private var model = VendorsModel()
    @State private var sheet: VendorSheet?
    @State private var merging: Vendor?
    @State private var deleting: Vendor?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        @Bindable var model = model
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                Picker("Show", selection: $model.locality) {
                    ForEach(VendorLocality.allCases) { locality in
                        Text(locality.title).tag(locality)
                    }
                }
                .pickerStyle(.segmented)
            }
            Section {
                ForEach(model.visible) { vendor in
                    Button {
                        sheet = .edit(vendor)
                    } label: {
                        VendorRow(vendor: vendor)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            deleting = vendor
                            isConfirmingDelete = true
                        }
                        Button("Merge", systemImage: "arrow.triangle.merge") { merging = vendor }
                    }
                }
            }
        }
        .overlay { VendorsPlaceholder(model: model) }
        .gradientHeader(.accentOrange)
        .navigationTitle("Vendors")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, prompt: "Search vendors")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add Vendor", systemImage: "plus") { sheet = .add }
            }
        }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .add: VendorFormView(onSaved: reloadNow)
            case .edit(let vendor): VendorFormView(editing: vendor, onSaved: reloadNow)
            }
        }
        .sheet(item: $merging) { vendor in
            MergeSheet(
                targets: model.mergeTargets(for: vendor),
                name: \.name,
                question: "Merge this vendor?",
                consequence: { "Every transaction, subscription and template of \(vendor.name) moves to \($0.name), which takes any details it lacks. \(vendor.name) is then deleted." },
                onMerge: { await merge(vendor, into: $0) }
            )
        }
        .confirmationDialog("Delete this vendor?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: deleteSelected)
        } message: {
            Text(deleting.map { "\($0.name)'s transactions are kept, with no vendor. To keep them under another vendor, merge instead." } ?? "")
        }
        .alert("Something went wrong", item: $errorMessage) { _ in
        } message: { message in
            Text(message)
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func reloadNow() {
        Task { await load() }
    }

    private func merge(_ vendor: Vendor, into target: Vendor) async -> String? {
        guard let api = session.api else { return String(localized: "Something went wrong.") }
        return await model.merge(vendor, into: target, using: api)
    }

    private func deleteSelected() {
        guard let vendor = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.delete(vendor, using: api)
        }
    }
}
