import Foundation

struct DocLibrary: Decodable {
    let version: Int
    let docs: [Doc]

    /// The guides bundled with the app, made by `just docs-json` from the web's; empty if the file is missing.
    static let bundled: [Doc] = {
        guard let url = Bundle.main.url(forResource: "docs", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let library = try? JSONDecoder().decode(DocLibrary.self, from: data)
        else { return [] }
        return library.docs
    }()
}
