import SwiftUI

struct AccountsViewMenu: View {
    @Bindable var model: AccountsModel

    var body: some View {
        Menu("View Options", systemImage: model.bank == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill") {
            Picker("Group", selection: $model.grouping) {
                ForEach(AccountGrouping.allCases) { grouping in
                    Text(grouping.title).tag(grouping)
                }
            }
            if !model.banks.isEmpty {
                Picker("Bank", selection: $model.bank) {
                    Text("All banks").tag(String?.none)
                    ForEach(model.banks, id: \.self) { bank in
                        Text(bank).tag(String?.some(bank))
                    }
                }
                .pickerStyle(.menu)
            }
        }
    }
}
