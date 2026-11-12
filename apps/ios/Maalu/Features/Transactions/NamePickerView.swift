import SwiftUI

struct NamePickerView: View {
    let title: LocalizedStringResource
    let options: [String]
    var allowsNone = false
    @Binding var selection: String
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var typed: String { search.trimmingCharacters(in: .whitespaces) }

    private var matches: [String] {
        typed.isEmpty ? options : options.filter { $0.localizedStandardContains(typed) }
    }

    private var isNewName: Bool {
        !typed.isEmpty && !options.contains { $0.localizedCaseInsensitiveCompare(typed) == .orderedSame }
    }

    var body: some View {
        List {
            if isNewName {
                Button("Use “\(typed)”") { choose(typed) }
            }
            if allowsNone && typed.isEmpty {
                Button("None") { choose("") }
            }
            ForEach(matches, id: \.self) { name in
                Button { choose(name) } label: {
                    HStack {
                        Text(name)
                        Spacer()
                        if name == selection { Image(systemName: "checkmark") }
                    }
                }
                .foregroundStyle(.primary)
            }
        }
        .navigationTitle(Text(title))
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always))
    }

    private func choose(_ name: String) {
        selection = name
        dismiss()
    }
}
