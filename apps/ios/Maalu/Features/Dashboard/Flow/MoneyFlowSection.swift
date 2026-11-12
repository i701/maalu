import SwiftUI

struct MoneyFlowSection: View {
    let flow: MoneyFlow
    let currency: String
    @State private var showsTable = false
    @State private var isExpanded = false

    var body: some View {
        Section {
            AmountRow {
                Text("Total")
            } amount: {
                MoneyText(Decimal(flow.total), currency: currency)
            }
            if showsTable {
                MoneyFlowTable(flow: flow, currency: currency)
            } else {
                MoneyFlowDiagram(flow: flow, currency: currency)
            }
            Button(showsTable ? "Show the diagram" : "Show as a table", action: toggle)
            if !showsTable {
                Button("Expand the diagram", systemImage: "arrow.up.left.and.arrow.down.right") { isExpanded = true }
                    .fullScreenCover(isPresented: $isExpanded) {
                        MoneyFlowExpandedView(flow: flow, currency: currency)
                    }
            }
        } header: {
            Text("Money flow")
        }
    }

    private func toggle() {
        showsTable.toggle()
    }
}
