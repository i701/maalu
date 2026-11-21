import SwiftUI

/// Six cells and one real field. The cells are drawn (`OtpCells`); the field is an invisible `TextField` over the row, so paste, autofill from the message and backspace stay the system's. A full row asks `onComplete` to check the code; `state` says how that went, and `failures` counts the wrong answers, each of which shivers the row and clears it.
struct OtpField: View {
    @Binding var code: String
    let state: OtpState
    let failures: Int
    let onComplete: () -> Void
    @FocusState private var isFocused: Bool
    @State private var merge: Double = 0
    @State private var shake: Double = 0
    @Environment(\.colorScheme) private var scheme

    static let length = 6

    var body: some View {
        ZStack {
            OtpCells(
                code: code,
                length: Self.length,
                isChecking: state == .checking,
                showsCaret: isFocused && state == .typing,
                cellColor: Color(.systemGray5),
                merge: merge,
                shake: shake
            )
            TextField("", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .focused($isFocused)
                .opacity(0.02)
                .tint(.clear)
                .frame(width: OtpCells.rowWidth(Self.length), height: OtpCells.height)
                .disabled(state != .typing)
                .accessibilityLabel(state == .verified ? "Verified" : "\(Self.length)-digit code")
        }
        .onChange(of: code) { _, new in
            let digits = String(new.filter(\.isNumber).prefix(Self.length))
            if digits != new { code = digits; return }
            if digits.count == Self.length, state == .typing { onComplete() }
        }
        .onChange(of: state) { _, new in
            switch new {
            case .verified:
                isFocused = false
                withAnimation(.spring(duration: 0.75, bounce: 0.35)) { merge = 1 }
            case .typing:
                withAnimation(.spring(duration: 0.5, bounce: 0.2)) { merge = 0 }
            case .checking:
                break
            }
        }
        .onChange(of: failures) { shiver() }
        .task {
            try? await Task.sleep(for: .milliseconds(350))
            isFocused = true
        }
        .sensoryFeedback(.success, trigger: state == .verified)
        .sensoryFeedback(.error, trigger: failures)
    }

    /// The row shivers and the digits fall out, then it is empty again for another try.
    private func shiver() {
        shake = 0
        withAnimation(.linear(duration: 0.62)) { shake = 1 }
        Task {
            try? await Task.sleep(for: .milliseconds(780))
            shake = 0
            code = ""
            isFocused = true
        }
    }
}
