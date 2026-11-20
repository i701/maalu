import Foundation
import Observation

/// A saved transaction's receipts and web links. Unlike a new transaction's, they go up and come off at once.
@MainActor @Observable
final class TransactionFilesModel {
    let transactionID: String
    private(set) var attachments: [Attachment] = []
    private(set) var links: [TransactionLink] = []
    private(set) var isBusy = false
    var errorMessage: String?
    /// A downloaded file being shown with Quick Look.
    var previewURL: URL?
    /// The Add Link alert and what is typed in it.
    var isAddingLink = false
    var typedLink = ""

    init(transactionID: String) {
        self.transactionID = transactionID
    }

    var canAddFile: Bool { attachments.count < PendingAttachment.maxCount }
    var canAddLink: Bool { links.count < PendingAttachment.maxCount }

    func load(using api: Api) async {
        async let files: ApiResult<[Attachment]> = api.get("transactions/\(transactionID)/attachments")
        async let addresses: ApiResult<[TransactionLink]> = api.get("transactions/\(transactionID)/links")
        let (fileResult, linkResult) = await (files, addresses)
        if case .ok(let list, _) = fileResult { attachments = list }
        if case .ok(let list, _) = linkResult { links = list }
        errorMessage = failure(fileResult) ?? failure(linkResult)
    }

    func upload(_ data: Data, filename: String, contentType: String, using api: Api) async {
        if data.count > PendingAttachment.maxBytes {
            errorMessage = String(localized: "A file can be at most 10 MB.")
            return
        }
        await run(api) {
            await api.upload("transactions/\(self.transactionID)/attachments", query: [URLQueryItem(name: "filename", value: filename)], data: data, contentType: contentType)
        }
    }

    func addLink(_ typed: String, using api: Api) async {
        switch ParsedLink(typed) {
        case .problem(let problem):
            errorMessage = String(localized: problem)
        case .url(let url):
            await run(api) {
                let result: ApiResult<TransactionLink> = await api.postJSON("transactions/\(self.transactionID)/links", body: ["url": url])
                if case .failed(let status, let message) = result { return .failed(status: status, message: message) }
                return .ok((), total: nil)
            }
        }
    }

    func remove(_ attachment: Attachment, using api: Api) async {
        await run(api) { await api.delete("attachments/\(attachment.id)") }
    }

    func remove(_ link: TransactionLink, using api: Api) async {
        await run(api) { await api.delete("links/\(link.id)") }
    }

    /// Downloads the file to a temporary folder, under its own name, and shows it.
    func open(_ attachment: Attachment, using api: Api) async {
        isBusy = true
        defer { isBusy = false }
        switch await api.data("attachments/\(attachment.id)") {
        case .failed(_, let message):
            errorMessage = message
        case .ok(let data, _):
            let folder = FileManager.default.temporaryDirectory.appending(path: attachment.id, directoryHint: .isDirectory)
            let file = folder.appending(path: attachment.filename)
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                try data.write(to: file, options: .atomic)
                previewURL = file
            } catch {
                errorMessage = String(localized: "The file could not be opened.")
            }
        }
    }

    /// Sends one change, then reloads the list so it shows what the server kept.
    private func run(_ api: Api, _ change: () async -> ApiResult<Void>) async {
        isBusy = true
        defer { isBusy = false }
        if case .failed(_, let message) = await change() {
            errorMessage = message
            return
        }
        await load(using: api)
    }

    private func failure<T>(_ result: ApiResult<T>) -> String? {
        if case .failed(_, let message) = result { message } else { nil }
    }
}
