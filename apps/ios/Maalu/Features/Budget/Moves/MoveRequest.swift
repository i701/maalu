struct MoveRequest: Encodable {
    let toLineId: String
    let fromLineId: String?
    let amount: String
    let on: String
    let note: String?
}
