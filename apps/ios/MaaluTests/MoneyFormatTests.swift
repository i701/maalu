import Foundation
import Testing
@testable import Maalu

struct MoneyFormatTests {
    private func format(_ value: Decimal, short: Bool) -> String {
        MoneyFormat.string(value, currency: "MVR", short: short)
    }

    @Test func shortNumbersShortenFromAThousandUp() {
        #expect(format(1234.5, short: true).contains("1.23K"))
        #expect(format(-1_234_500, short: true).contains("1.23M"))
        #expect(format(-1_234_500, short: true).contains("-"))
        #expect(format(2_000_000_000, short: true).contains("2B"))
        #expect(format(999.99, short: true) == format(999.99, short: false))
        #expect(format(999.99, short: false).contains("999.99"))
    }

    @Test func offWritesEveryAmountInFull() {
        #expect(format(1_234_500, short: false).contains("1,234,500.00"))
    }
}
