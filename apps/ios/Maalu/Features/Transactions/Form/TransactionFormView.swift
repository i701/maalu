import SwiftUI

struct TransactionFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: TransactionFormModel
    @State private var isPickingTemplate = false
    /// The page in view (the type), and how far the pages have scrolled, in pages, for the bar's pill.
    @State private var position: TransactionType?
    @State private var progress: Double
    /// False until the pages have been scrolled to the draft's type: the scroll view first reports its first page, which must not overwrite the type.
    @State private var isPositioned = false
    /// The home indicator's height: the pages run to the screen edge, and the blur and the Save button keep clear of it.
    @State private var bottomInset: CGFloat = 0
    @State private var isSavingTemplate = false
    private let onSaved: () -> Void
    /// The rounded top of the container the fields sit in, under the fixed type bar.
    private static let containerShape = UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)

    init(editing transaction: Transaction? = nil, duplicating copy: Transaction? = nil, startingFrom template: TransactionTemplate? = nil, seed: TransactionDraft? = nil, onSaved: @escaping () -> Void) {
        let model = TransactionFormModel(editing: transaction, duplicating: copy, startingFrom: template, seed: seed)
        _model = State(initialValue: model)
        _position = State(initialValue: model.draft.type)
        _progress = State(initialValue: Double(TransactionType.allCases.firstIndex(of: model.draft.type) ?? 0))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // fixed above the pages: they scroll in their own container below and never pass behind the bar
                TransactionTypePicker(progress: progress, onSelect: select)
                    .padding(.horizontal, Spacing.screen)
                    .padding(.bottom, 12)
                ScrollViewReader { proxy in
                ScrollView(.horizontal) {
                    HStack(spacing: 0) {
                        ForEach(TransactionType.allCases) { type in
                            TransactionFormPage(model: model, type: type, bottomInset: bottomInset, onSaveAndAddAnother: saveAndAddAnother)
                                .containerRelativeFrame(.horizontal)
                                .id(type)
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollPosition(id: $position)
                .scrollTargetBehavior(.paging)
                .scrollIndicators(.hidden)
                .onScrollGeometryChange(for: Double.self) { $0.containerSize.width > 0 ? $0.contentOffset.x / $0.containerSize.width : 0 } action: { _, page in progress = page }
                .overlay(alignment: .top) { EdgeBlur(edge: .top, height: 36) }
                .overlay(alignment: .bottom) {
                    ZStack(alignment: .bottom) {
                        EdgeBlur(edge: .bottom, height: 110 + bottomInset)
                        FloatingSaveButton(isSaving: model.isSaving, isEnabled: model.canSave, action: save)
                            .padding(.bottom, bottomInset)
                    }
                }
                .background(Color(.systemGroupedBackground), in: Self.containerShape)
                .clipShape(Self.containerShape)
                .task {
                    // shortcut: a short wait lets the pages lay out before scrolling to the draft's page; breaks if layout ever takes longer, when the form would open on the first type
                    try? await Task.sleep(for: .milliseconds(60))
                    proxy.scrollTo(model.draft.type, anchor: .leading)
                    try? await Task.sleep(for: .milliseconds(80))
                    isPositioned = true
                }
                }
            }
            .ignoresSafeArea(.container, edges: .bottom)
            .onChange(of: position) { if isPositioned, let position { model.draft.type = position } }
            .onChange(of: model.draft.type) { if position != model.draft.type { position = model.draft.type } }
            .sensoryFeedback(.selection, trigger: position)
            .gradientHeader(height: 320)
            .sensoryFeedback(.success, trigger: model.savedCount)
            .overlay { if model.isLoading { ProgressView() } }
            .saving(model.isSaving)
            .navigationTitle(model.isEditing ? "Edit Transaction" : "New Transaction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(model.savedCount > 0 ? "Done" : "Cancel", role: .cancel, action: close)
                        .disabled(model.isSaving)
                }
                ToolbarItem(placement: .primaryAction) {
                    if !model.isEditing {
                        Menu("Template", systemImage: "bookmark") {
                            if !model.templates.isEmpty {
                                Button("Start from a template", systemImage: "bookmark") { isPickingTemplate = true }
                            }
                            Button("Save as template", systemImage: "bookmark.fill") { isSavingTemplate = true }
                        }
                        .disabled(model.isSaving)
                    }
                }
            }
            .sheet(isPresented: $isPickingTemplate) {
                TemplatePickerSheet(templates: model.templates) { model.apply($0) }
            }
            .sheet(isPresented: $isSavingTemplate) {
                TemplateNameSheet(title: "Save as template", helper: "Fills in the account, category, vendor, method and amount (if you typed one).") { name in
                    await saveTemplate(named: name)
                }
            }
            .navigationDestination(for: NameField.self) { field in
                switch field {
                case .category:
                    NamePickerView(title: "Category", options: model.categories, selection: $model.draft.category)
                case .vendor:
                    NamePickerView(title: "Vendor", options: model.vendors, allowsNone: true, selection: $model.draft.vendor)
                case .itemCategory(let id):
                    NamePickerView(title: "Category", options: model.categories, selection: itemCategory(id))
                }
            }
            .navigationDestination(for: TagsRoute.self) { _ in
                TagsPickerView(options: model.tags, selection: $model.draft.tags)
            }
            .onChange(of: model.draft.vendor) { model.vendorChanged() }
            .task { await load() }
        }
        .onGeometryChange(for: CGFloat.self) { $0.safeAreaInsets.bottom } action: { bottomInset = $0 }
    }

    /// The category of one item, by its id, for the picker.
    private func itemCategory(_ id: UUID) -> Binding<String> {
        Binding(
            get: { model.draft.items.first { $0.id == id }?.category ?? "" },
            set: { name in
                guard let index = model.draft.items.firstIndex(where: { $0.id == id }) else { return }
                model.draft.items[index].category = name
            }
        )
    }

    /// A tap on a label scrolls the pages to that type.
    private func select(_ type: TransactionType) {
        withAnimation(.smooth(duration: 0.35)) { position = type }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func save() {
        Task {
            guard let api = session.api, await model.save(using: api) else { return }
            onSaved()
            dismiss()
        }
    }

    private func close() {
        // the transaction was made even though some of its files were not
        if model.filesPendingFor != nil { onSaved() }
        dismiss()
    }

    private func saveAndAddAnother() {
        Task {
            guard let api = session.api, await model.saveAndAddAnother(using: api) else { return }
            onSaved()
        }
    }

    private func saveTemplate(named name: String) async -> String? {
        guard let api = session.api else { return "Something went wrong." }
        return await model.saveTemplate(named: name, using: api)
    }
}
