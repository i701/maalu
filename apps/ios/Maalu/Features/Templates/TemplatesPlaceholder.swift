import SwiftUI

struct TemplatesPlaceholder: View {
    let model: TemplatesModel

    var body: some View {
        if model.templates.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No templates yet", systemImage: "bookmark", description: Text("Fill in a transaction you repeat, then choose Save as template from the Template menu at the top of the form."))
            }
        }
    }
}
