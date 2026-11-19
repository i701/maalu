import Foundation

/// A typed web address checked by the API's rule (the web's `parseUrl`): http or https only, `https://` added when no scheme is typed.
enum ParsedLink: Equatable {
    case url(String)
    case problem(LocalizedStringResource)

    init(_ input: String) {
        let typed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if typed.isEmpty { self = .problem("Type a web address."); return }
        if typed.contains(where: \.isWhitespace) { self = .problem("A web address cannot contain spaces."); return }
        let hasScheme = typed.range(of: #"^[a-z][a-z0-9+.-]*://"#, options: [.regularExpression, .caseInsensitive]) != nil
        // "javascript:alert(1)" and "mailto:a@b.c" have a scheme but no "//"; "localhost:8000" is a host
        let otherScheme = typed.range(of: #"^[a-z][a-z0-9+.-]*:"#, options: [.regularExpression, .caseInsensitive]) != nil
            && typed.range(of: #"^[^/]*:\d+(/|$)"#, options: .regularExpression) == nil
        if !hasScheme && otherScheme { self = .problem("Only http and https links can be added."); return }
        let url = hasScheme ? typed : "https://\(typed)"
        guard let parts = URLComponents(string: url), let host = parts.host, !host.isEmpty else {
            self = .problem("That is not a valid web address."); return
        }
        if !["http", "https"].contains(parts.scheme?.lowercased() ?? "") { self = .problem("Only http and https links can be added."); return }
        if !host.contains(".") && host != "localhost" { self = .problem("That is not a valid web address."); return }
        if parts.user != nil || parts.password != nil { self = .problem("Leave the user name and password out of the address."); return }
        if url.count > 2000 { self = .problem("The address is too long."); return }
        self = .url(url)
    }
}
