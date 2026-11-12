import Observation

@MainActor @Observable
final class MoveHistoryModel {
    private(set) var periods: [MovePeriod] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    func load(lineID: String, using api: Api) async {
        let result: ApiResult<[BudgetMove]> = await api.get("budget/lines/\(lineID)/moves")
        isLoading = false
        switch result {
        case .ok(let moves, _): periods = MoveText.byPeriod(moves)
        case .failed(_, let message): errorMessage = message
        }
    }
}
