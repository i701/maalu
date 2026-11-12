import Foundation
import Observation

@MainActor @Observable
final class SubscriptionsModel {
    private(set) var subscriptions: [Subscription] = []
    private(set) var summary: SubscriptionSummary?
    private(set) var candidates: [SubscriptionCandidate] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var status: SubscriptionStatus?
    var search = ""

    func subscription(id: String) -> Subscription? {
        subscriptions.first { $0.id == id }
    }

    /// What the status filter and the search leave; the list is small, so both are done here.
    var visible: [Subscription] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return subscriptions.filter { subscription in
            (status == nil || subscription.status == status)
                && (typed.isEmpty
                    || subscription.name.localizedStandardContains(typed)
                    || subscription.category.localizedStandardContains(typed)
                    || (subscription.vendor?.name.localizedStandardContains(typed) ?? false))
        }
    }

    func load(using api: Api) async {
        async let listResult: ApiResult<[Subscription]> = api.get("subscriptions")
        async let summaryResult: ApiResult<SubscriptionSummary> = api.get("subscriptions/summary")
        async let candidatesResult: ApiResult<[SubscriptionCandidate]> = api.get("subscriptions/candidates")
        let (list, summary, candidates) = await (listResult, summaryResult, candidatesResult)
        guard !Task.isCancelled else { return }
        isLoading = false
        switch list {
        case .ok(let value, _):
            subscriptions = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
        if case .ok(let value, _) = summary { self.summary = value }
        if case .ok(let value, _) = candidates { self.candidates = value }
    }

    /// Returns a message when the server refused, nil on success.
    func dismiss(_ candidate: SubscriptionCandidate, using api: Api) async -> String? {
        let result = await api.postJSONNoContent("subscriptions/candidates/dismiss", body: SuggestionRequest(candidate))
        if case .failed(_, let message) = result { return message }
        candidates.removeAll { $0.id == candidate.id }
        return nil
    }
}
