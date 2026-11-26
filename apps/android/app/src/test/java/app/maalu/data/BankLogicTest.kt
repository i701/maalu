package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BankLogicTest {
    @Test fun knowsABankByItsNameInAnyCase() {
        assertEquals(BankBrand.Mib, bankBrand(" MIB "))
        assertEquals(BankBrand.Bml, bankBrand("bml"))
        assertNull(bankBrand("SBI"))
        assertNull(bankBrand(""))
    }

    @Test fun greetsOnlyAPersonWithAName() {
        assertEquals("Hi, Aisha", dashboardTitle("Aisha"))
        assertEquals("Dashboard", dashboardTitle(null))
        assertEquals("Dashboard", dashboardTitle(" "))
    }
}
