import SwiftUI

struct CategoryChoiceView: View {
    let model: BudgetLineFormModel
    @Binding var selection: Set<String>
    @State private var search = ""

    private var shown: [CategoryOption] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return typed.isEmpty ? model.categories : model.categories.filter { $0.name.localizedStandardContains(typed) }
    }

    var body: some View {
        List {
            ForEach(shown) { category in
                let takenBy = model.takenName(of: category)
                Button { toggle(category.id) } label: {
                    AmountRow {
                        VStack(alignment: .leading) {
                            Text(category.name)
                            if let takenBy {
                                Text("In \(takenBy)").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    } amount: {
                        if selection.contains(category.id) { Image(systemName: "checkmark") }
                    }
                }
                .foregroundStyle(.primary)
                .disabled(takenBy != nil)
            }
        }
        .navigationTitle("Categories")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search)
        .overlay {
            if shown.isEmpty && !search.isEmpty { ContentUnavailableView.search }
        }
    }

    private func toggle(_ id: String) {
        if selection.contains(id) {
            selection.remove(id)
        } else {
            selection.insert(id)
        }
    }
}
