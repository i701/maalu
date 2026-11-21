import Foundation

/// Where a one-time code is: being typed, being checked by the server, or accepted.
enum OtpState: Equatable {
    case typing, checking, verified
}
