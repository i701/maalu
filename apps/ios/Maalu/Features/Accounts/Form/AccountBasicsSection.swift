import SwiftUI

struct AccountBasicsSection: View {
    @Bindable var model: AccountFormModel

    var body: some View {
        Section {
            Picker("Group", selection: $model.draft.group) {
                ForEach(AccountGroup.allCases) { group in
                    Text(group.title).tag(group)
                }
            }
            TextField("Name", text: $model.draft.name)
        } footer: {
            Text(model.draft.group.help)
        }
    }
}
