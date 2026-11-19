import Foundation

/// The list's filter: every vendor, or only the local, foreign or not yet sorted ones.
enum VendorLocality: String, CaseIterable, Identifiable {
    case all, local, foreign, unknown

    var id: Self { self }

    var title: LocalizedStringResource {
        switch self {
        case .all: "All"
        case .local: "Local"
        case .foreign: "Foreign"
        case .unknown: "Not set"
        }
    }

    func includes(_ vendor: Vendor) -> Bool {
        switch self {
        case .all: true
        case .local: vendor.isLocal == true
        case .foreign: vendor.isLocal == false
        case .unknown: vendor.isLocal == nil
        }
    }
}
