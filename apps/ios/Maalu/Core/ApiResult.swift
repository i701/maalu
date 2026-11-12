enum ApiResult<Value> {
    case ok(Value, total: Int?)
    case failed(status: Int, message: String)
}
