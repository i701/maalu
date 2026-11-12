enum SubscriptionSheet: Identifiable {
    case add
    case edit(Subscription)
    case accept(SubscriptionCandidate)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let subscription): "edit-\(subscription.id)"
        case .accept(let candidate): "accept-\(candidate.id)"
        }
    }
}
