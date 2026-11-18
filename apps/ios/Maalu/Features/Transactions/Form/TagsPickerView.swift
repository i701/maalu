import SwiftUI

struct TagsPickerView: View {
    let options: [String]
    @Binding var selection: [String]
    @State private var search = ""

    private var typed: String { search.trimmingCharacters(in: .whitespaces) }

    private var names: [String] {
        let all = options + selection.filter { name in !options.contains { $0.localizedCaseInsensitiveCompare(name) == .orderedSame } }
        return typed.isEmpty ? all : all.filter { $0.localizedStandardContains(typed) }
    }

    private var isNewName: Bool {
        !typed.isEmpty && !(options + selection).contains { $0.localizedCaseInsensitiveCompare(typed) == .orderedSame }
    }

    var body: some View {
        List {
            if isNewName {
                Button("Add “\(typed)”", action: addTyped)
            }
            ForEach(names, id: \.self) { name in
                Button { toggle(name) } label: {
                    HStack {
                        Text(name)
                        Spacer()
                        if selection.contains(name) { Image(systemName: "checkmark") }
                    }
                }
                .foregroundStyle(.primary)
            }
        }
        .navigationTitle("Tags")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always))
    }

    private func addTyped() {
        selection.append(typed)
        search = ""
    }

    private func toggle(_ name: String) {
        if let index = selection.firstIndex(of: name) {
            selection.remove(at: index)
        } else {
            selection.append(name)
        }
    }
}
