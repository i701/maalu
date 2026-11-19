/// A group with its summary and its transactions not in the trash, newest first.
struct GroupDetail: Decodable {
    let id: String
    let name: String
    let note: String?
    let transactionCount: Int
    let dateFrom: String?
    let dateTo: String?
    let moneyIn: String
    let moneyOut: String
    let net: String
    let currency: String
    let transactions: [Transaction]

    var summary: TransactionGroup {
        TransactionGroup(id: id, name: name, note: note, transactionCount: transactionCount, dateFrom: dateFrom, dateTo: dateTo,
                         moneyIn: moneyIn, moneyOut: moneyOut, net: net, currency: currency)
    }
}
