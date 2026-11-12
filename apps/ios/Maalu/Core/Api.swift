import Foundation

/// One server, one session. A 401 on a call that carried a token means the session ended, so `onSignedOut` runs.
struct Api: Sendable {
    let server: String
    var token: String?
    var onSignedOut: @Sendable () -> Void = {}

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()

    private static let urlSession: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 20
        return URLSession(configuration: configuration)
    }()

    func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async -> ApiResult<T> {
        decode(await perform(method: "GET", path: path, query: query))
    }

    func postJSON<T: Decodable>(_ path: String, body: some Encodable) async -> ApiResult<T> {
        guard let data = try? Api.encoder.encode(body) else {
            return .failed(status: 0, message: "The request could not be made.")
        }
        return decode(await perform(method: "POST", path: path, body: data, contentType: "application/json"))
    }

    func postForm<T: Decodable>(_ path: String, fields: [String: String]) async -> ApiResult<T> {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        let encoded = fields.map { key, value in
            "\(key)=\(value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")"
        }
        let body = Data(encoded.joined(separator: "&").utf8)
        return decode(await perform(method: "POST", path: path, body: body, contentType: "application/x-www-form-urlencoded"))
    }

    func post(_ path: String) async -> ApiResult<Void> {
        switch await perform(method: "POST", path: path, body: Data()) {
        case .ok(_, let total): .ok((), total: total)
        case .failed(let status, let message): .failed(status: status, message: message)
        }
    }

    private func perform(method: String, path: String, query: [URLQueryItem] = [], body: Data? = nil, contentType: String? = nil) async -> ApiResult<Data> {
        guard var components = URLComponents(string: "\(server)/api/v1/\(path)") else {
            return .failed(status: 0, message: "That does not look like an address.")
        }
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else {
            return .failed(status: 0, message: "That does not look like an address.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("Maalu-iOS/0.1", forHTTPHeaderField: "User-Agent")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        do {
            let (data, response) = try await Api.urlSession.data(for: request)
            let http = response as? HTTPURLResponse
            let status = http?.statusCode ?? 0
            guard (200..<300).contains(status) else {
                if status == 401 && token != nil { onSignedOut() }
                return .failed(status: status, message: Api.message(from: data, status: status))
            }
            return .ok(data, total: http?.value(forHTTPHeaderField: "X-Total-Count").flatMap(Int.init))
        } catch {
            return .failed(status: 0, message: "Cannot reach the server. Check the connection.")
        }
    }

    private func decode<T: Decodable>(_ result: ApiResult<Data>) -> ApiResult<T> {
        switch result {
        case .ok(let data, let total):
            do {
                return .ok(try Api.decoder.decode(T.self, from: data), total: total)
            } catch {
                return .failed(status: 200, message: "The server's answer was not what the app expected.")
            }
        case .failed(let status, let message):
            return .failed(status: status, message: message)
        }
    }

    /// FastAPI's `detail` is a string, or a list of `{msg}` for a validation error.
    static func message(from data: Data, status: Int) -> String {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let detail = json["detail"] as? String { return detail }
            if let details = json["detail"] as? [[String: Any]], let message = details.first?["msg"] as? String { return message }
        }
        return switch status {
        case 401: "Wrong email or password, or the session ended."
        case 429: "Too many attempts. Try again in a few minutes."
        default: "Something went wrong (\(status))."
        }
    }
}
