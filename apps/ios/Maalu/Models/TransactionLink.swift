import Foundation

struct TransactionLink: Decodable, Identifiable {
    let id: String
    let url: String
    let title: String?

    /// The site's name without `www.`, for showing under the link.
    var site: String? {
        URLComponents(string: url)?.host.map { $0.hasPrefix("www.") ? String($0.dropFirst(4)) : $0 }
    }
}
