import SwiftUI

struct VendorRow: View {
    let vendor: Vendor

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(vendor.name)
                Spacer()
                if let isLocal = vendor.isLocal {
                    Text(isLocal ? "Local" : "Foreign")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            if let details {
                Text(details)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    /// "Groceries · MVR · Majeedhee Magu": the usual category, the currency and where it is, whichever it has.
    private var details: String? {
        let parts = [vendor.defaultCategory, vendor.currency, vendor.address].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}
