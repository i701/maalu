package app.maalu.data

import app.maalu.data.DashboardSection.Available
import app.maalu.data.DashboardSection.Balance
import app.maalu.data.DashboardSection.Metrics
import app.maalu.data.DashboardSection.Spending
import org.junit.Assert.assertEquals
import org.junit.Test

class DashboardOrderLogicTest {
    private val visible = listOf(Available, Metrics, Spending, Balance)

    @Test fun followsTheSavedOrderAndPutsNewCardsLast() {
        assertEquals(visible, orderSections(null, visible))
        assertEquals(listOf(Spending, Available, Metrics, Balance), orderSections(listOf("spending", "gone", "available"), visible))
    }

    @Test fun savingKeepsTheCardsThisAppDidNotArrange() {
        val saved = listOf("metrics", "income-rule", "spending", "spending-trend")
        assertEquals(listOf("spending", "income-rule", "metrics", "spending-trend", "balance"), mergeOrder(saved, listOf(Spending, Metrics, Balance)))
        assertEquals(listOf("balance", "metrics"), mergeOrder(null, listOf(Balance, Metrics)))
    }

    @Test fun resettingSendsAnExplicitNull() {
        assertEquals("""{"dashboard_order":null}""", dashboardOrderJson(null).toString())
        assertEquals("""{"dashboard_order":["balance"]}""", dashboardOrderJson(listOf("balance")).toString())
    }
}
