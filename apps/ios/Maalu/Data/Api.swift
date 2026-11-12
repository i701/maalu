import Foundation

/// What a call came to. Errors carry text for a person (the API's `detail`).
enum ApiResult<T> {
    case ok(T, total: Int?)
    case failed(status: Int, message: String)
}

/// One server, one session. `token` is read on every call; a 401 on a signed-in call means the session
/// ended, so `onSignedOut` runs. (A wrong password on `/auth/login` is also 401 and is made with no token.)
struct Api {
    let server: String
    var token: String?
    var onSignedOut: @Sendable () -> Void = {}

    private static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 20
        return URLSession(configuration: c)
    }()

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private func request(_ method: String, _ path: String, query: [String: String] = [:], body: Data? = nil, contentType: String? = nil) throws -> URLRequest {
        guard var parts = URLComponents(string: "\(server)/api/v1/\(path)") else { throw URLError(.badURL) }
        if !query.isEmpty { parts.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) } }
        guard let url = parts.url else { throw URLError(.badURL) }
        var r = URLRequest(url: url)
        r.httpMethod = method
        r.setValue("Maalu-iOS/0.1", forHTTPHeaderField: "User-Agent")
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { r.httpBody = body; r.setValue(contentType, forHTTPHeaderField: "Content-Type") }
        return r
    }

    private func send<T: Decodable>(_ r: URLRequest, as: T.Type) async -> ApiResult<T> {
        do {
            let (data, response) = try await Api.session.data(for: r)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            let total = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "X-Total-Count").flatMap(Int.init)
            guard (200..<300).contains(code) else {
                if code == 401 && token != nil { onSignedOut() }
                return .failed(status: code, message: Api.detail(data, code: code))
            }
            if T.self == Empty.self { return .ok(Empty() as! T, total: total) }
            do { return .ok(try Api.decoder.decode(T.self, from: data), total: total) }
            catch { return .failed(status: code, message: "The server's answer was not what the app expected.") }
        } catch {
            return .failed(status: 0, message: "Cannot reach the server. Check the connection.")
        }
    }

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async -> ApiResult<T> {
        guard let r = try? request("GET", path, query: query) else { return .failed(status: 0, message: "Bad address.") }
        return await send(r, as: T.self)
    }

    func postJSON<T: Decodable, B: Encodable>(_ path: String, _ body: B) async -> ApiResult<T> {
        let enc = JSONEncoder()
        enc.keyEncodingStrategy = .convertToSnakeCase
        guard let data = try? enc.encode(body), let r = try? request("POST", path, body: data, contentType: "application/json") else { return .failed(status: 0, message: "Bad request.") }
        return await send(r, as: T.self)
    }

    func postForm<T: Decodable>(_ path: String, _ fields: [String: String]) async -> ApiResult<T> {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        let body = fields.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")" }.joined(separator: "&")
        guard let r = try? request("POST", path, body: Data(body.utf8), contentType: "application/x-www-form-urlencoded") else { return .failed(status: 0, message: "Bad request.") }
        return await send(r, as: T.self)
    }

    func post(_ path: String) async -> ApiResult<Empty> {
        guard let r = try? request("POST", path, body: Data(), contentType: nil) else { return .failed(status: 0, message: "Bad request.") }
        return await send(r, as: Empty.self)
    }

    /// FastAPI's `detail` is a string, or a list of `{msg}` for a validation error.
    static func detail(_ data: Data, code: Int) -> String {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let s = json["detail"] as? String { return s }
            if let list = json["detail"] as? [[String: Any]], let msg = list.first?["msg"] as? String { return msg }
        }
        switch code {
        case 401: return "Wrong email or password, or the session ended."
        case 429: return "Too many attempts. Try again in a few minutes."
        default: return "Something went wrong (\(code))."
        }
    }
}

struct Empty: Decodable {}
