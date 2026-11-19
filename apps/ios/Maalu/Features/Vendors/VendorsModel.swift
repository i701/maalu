import Foundation
import Observation

@MainActor @Observable
final class VendorsModel {
    private(set) var vendors: [Vendor] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var search = ""
    var locality = VendorLocality.all

    var visible: [Vendor] { Self.matching(vendors, locality: locality, search: search) }

    /// What the search and filter leave; the list comes whole, so it is done here. Search covers the name, contact and address, as the API's.
    nonisolated static func matching(_ vendors: [Vendor], locality: VendorLocality, search: String) -> [Vendor] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return vendors.filter { vendor in
            locality.includes(vendor) && (typed.isEmpty || [vendor.name, vendor.contact, vendor.address].contains { $0?.localizedStandardContains(typed) == true })
        }
    }

    func load(using api: Api) async {
        let result: ApiResult<[Vendor]> = await api.get("vendors")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            vendors = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Every other vendor, by name: where this one's transactions, subscriptions and templates can go.
    func mergeTargets(for vendor: Vendor) -> [Vendor] {
        vendors.filter { $0.id != vendor.id }.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    /// Returns a message when the server refused, nil on success.
    func delete(_ vendor: Vendor, using api: Api) async -> String? {
        let result = await api.delete("vendors/\(vendor.id)")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil on success.
    func merge(_ vendor: Vendor, into target: Vendor, using api: Api) async -> String? {
        let result: ApiResult<Vendor> = await api.postJSON("vendors/\(vendor.id)/merge", body: MergeRequest(intoId: target.id))
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }
}
