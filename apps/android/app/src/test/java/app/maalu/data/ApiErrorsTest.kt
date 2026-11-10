package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ApiErrorsTest {
    @Test fun aPlainStringIsShownAsIs() {
        assertEquals("Category is in use", parseDetail("""{"detail":"Category is in use"}""", "x").message)
    }

    @Test fun validationNamesTheFieldAndKeepsTheMessage() {
        val body = """{"detail":[{"type":"greater_than","loc":["body","amount"],"msg":"Input should be greater than 0"}]}"""
        val e = parseDetail(body, "x")
        assertEquals("Amount: Input should be greater than 0", e.message)
        assertEquals("Input should be greater than 0", e.fields["amount"])
    }

    @Test fun aRuleAcrossTheBodyLosesItsPrefix() {
        val body = """{"detail":[{"type":"value_error","loc":["body"],"msg":"Value error, category is required"}]}"""
        assertEquals("Category is required", parseDetail(body, "x").message)
    }

    @Test fun severalProblemsAreListedOneToALine() {
        val body = """{"detail":[
            {"loc":["body","amount"],"msg":"Field required"},
            {"loc":["body","transaction_date"],"msg":"Field required"}]}"""
        val e = parseDetail(body, "x")
        assertEquals("Amount: Field required\nDate: Field required", e.message)
        assertEquals(setOf("amount", "transaction_date"), e.fields.keys)
    }

    @Test fun anythingElseFallsBack() {
        assertEquals("fallback", parseDetail("not json", "fallback").message)
        assertEquals("fallback", parseDetail("""{"other":1}""", "fallback").message)
        assertEquals("fallback", parseDetail("""{"detail":[]}""", "fallback").message)
    }
}
