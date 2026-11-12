import Foundation
import Observation

@MainActor @Observable
final class SubscriptionDetailModel {
    /// Returns a message when the server refused, nil on success.
    func setStatus(_ status: SubscriptionStatus, of subscription: Subscription, using api: Api) async -> String? {
        let result: ApiResult<Subscription> = await api.patchJSON("subscriptions/\(subscription.id)", body: StatusRequest(status: status))
        if case .failed(_, let message) = result { return message }
        return nil
    }

    func delete(_ subscription: Subscription, using api: Api) async -> String? {
        let result = await api.delete("subscriptions/\(subscription.id)")
        if case .failed(_, let message) = result { return message }
        return nil
    }

    private struct StatusRequest: Encodable {
        let status: SubscriptionStatus
    }
}
