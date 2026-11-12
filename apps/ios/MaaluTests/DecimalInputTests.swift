import Testing
@testable import Maalu

struct DecimalInputTests {
    @Test func keepsDigitsAndOneSeparator() {
        #expect(DecimalInput.sanitized("1234.56", separator: ".") == "1234.56")
        #expect(DecimalInput.sanitized("1.2.3", separator: ".") == "1.23")
        #expect(DecimalInput.sanitized("Health300", separator: ".") == "300")
        #expect(DecimalInput.sanitized("12,5", separator: ",") == "12,5")
        #expect(DecimalInput.sanitized("-5 ", separator: ".") == "5")
        #expect(DecimalInput.sanitized("", separator: ".") == "")
    }
}
