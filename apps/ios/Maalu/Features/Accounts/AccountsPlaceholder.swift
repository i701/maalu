import SwiftUI

struct AccountsPlaceholder: View {
    let model: AccountsModel

    var body: some View {
        if model.accounts.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.showsArchived {
                ContentUnavailableView("No archived accounts", systemImage: "archivebox")
            } else {
                ContentUnavailableView("No accounts yet", systemImage: "wallet.bifold", description: Text("Add an account to start tracking its balance."))
            }
        }
    }
}
