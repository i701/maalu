package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MoneyFlowGeometryTest {
    private fun cat(name: String, total: String, type: String = "expense") = CategoryTotal(name, name, "blue", total, type, 1, null)
    private fun flow(vararg c: CategoryTotal) = moneyFlow(c.toList())!!
    private val sample = flow(cat("Pay", "1000", "income"), cat("Rent", "600"), cat("Food", "300"))

    @Test fun incomingBandsEndAtTheSeamAndOutgoingOnesStartThere() {
        val l = layoutFlow(sample, 300.0, 200.0)
        for (link in l.links) {
            val (start, end) = l.span(link)
            assertTrue(start < end)
            if (link.link.target == "total") assertEquals(l.seam, end, 1e-9) else assertEquals(l.seam, start, 1e-9)
        }
        assertEquals((300.0 - 4.0) / 2 + 2.0, l.seam, 1e-9) // the middle of a 4-wide total bar
    }

    @Test fun aBandsCentreLineMeetsItsEndpoints() {
        val l = layoutFlow(flow(cat("Pay", "1000", "income"), cat("Rent", "600")), 300.0, 200.0)
        val rent = l.links.first { it.link.target == "out:0" }
        assertEquals(rent.y0, l.bandCenterY(rent, l.seam), 0.5)
        assertEquals(rent.y1, l.bandCenterY(rent, rent.x1), 0.5)
    }

    @Test fun aTapResolvesToTheNodeBehindTheBandOrBar() {
        val l = layoutFlow(sample, 300.0, 200.0)
        val bar = l.node("in:0")!!
        assertEquals("in:0", l.nodeIdAt(bar.x + 2, bar.y + bar.height / 2))
        val rent = l.links.first { it.link.target == "out:0" }
        val rentX = (l.seam + rent.x1) / 2
        assertEquals("out:0", l.nodeIdAt(rentX, l.bandCenterY(rent, rentX)))
        val income = l.links.first { it.link.target == "total" }
        val incomeX = (income.x0 + l.seam) / 2
        assertEquals("in:0", l.nodeIdAt(incomeX, l.bandCenterY(income, incomeX)))
        assertNull(l.nodeIdAt(150.0, -50.0))
    }

    @Test fun theTotalBarItselfIsNotTappable() {
        val l = layoutFlow(sample, 300.0, 200.0)
        val total = l.node("total")!!
        // nothing but the bands run through the middle, and the bar's own spot is not a target of its own
        assertTrue(l.nodeIdAt(total.x, total.y + total.height / 2) != "total")
    }

    @Test fun outgoingBandsStartAsTheIncomeBandTheyContinueFromAndEndAsTheirDestination() {
        val l = layoutFlow(sample, 300.0, 200.0)
        for (link in l.links) {
            val (from, to) = l.gradientKinds(link)
            if (link.link.target == "total") assertEquals(from, to) else assertEquals(FlowKind.Income, from)
        }
        assertEquals(FlowKind.Spending, l.gradientKinds(l.links.first { it.link.target == "out:0" }).second)
        assertEquals(FlowKind.Saved, l.gradientKinds(l.links.first { it.link.target == "saved" }).second)
    }

    @Test fun theShareReadsToOneDecimalAtMost() {
        assertEquals("30%", flowShareText(300.0, 1000.0))
        assertEquals("12.5%", flowShareText(125.0, 1000.0))
        assertEquals("33.3%", flowShareText(1.0, 3.0))
        assertEquals("0%", flowShareText(5.0, 0.0))
        assertEquals("100%", flowShareText(7.0, 7.0))
    }

    private val grouped = flow(
        cat("Pay", "1000", "income"), cat("Home", "100"),
        cat("Rent", "500").copy(parent = "Home", parentId = "Home"), cat("Power", "100").copy(parent = "Home", parentId = "Home"),
        cat("Food", "200"),
    )

    @Test fun aGroupSplitsIntoItsSubCategoriesInAFourthColumn() {
        assertEquals(3, grouped.lastColumn)
        assertEquals(listOf("Home" to 700.0, "Food" to 200.0), grouped.nodes.filter { it.column == 2 && it.kind == FlowKind.Spending }.map { it.label to it.value })
        assertEquals(listOf("Rent", "Power", "Home (other)"), grouped.nodes.filter { it.column == 3 }.map { it.label })
        assertEquals(2, sample.lastColumn)
    }

    @Test fun subCategoryBandsRunFromTheirGroupAndStayInside() {
        val l = layoutFlow(grouped, 400.0, 300.0)
        val rent = l.links.first { it.link.target == "out:0:0" }
        assertEquals(rent.x0 to rent.x1, l.span(rent))
        assertEquals("out:0:0", l.nodeIdAt((rent.x0 + rent.x1) / 2, l.bandCenterY(rent, (rent.x0 + rent.x1) / 2)))
        assertTrue(l.nodes.all { it.y >= -1e-9 && it.y + it.height <= 300.0 + 1e-9 })
    }

    @Test fun treeBlocksArePushedApartAndKeptInside() {
        // two groups centred at the same height would overlap: the second moves below the first
        assertEquals(listOf(40.0, 70.0), treeTops(listOf("a", "b"), mapOf("a" to 50.0, "b" to 50.0), listOf(20.0, 20.0), 10.0, 100.0))
        assertEquals(listOf(80.0), treeTops(listOf("a"), mapOf("a" to 100.0), listOf(20.0), 10.0, 100.0))
    }

    @Test fun everyLabelledNodeHasRoomForItsLabel() {
        val many = flow(*(listOf(cat("Pay", "10000", "income"), cat("Rent", "3000"), cat("Food", "10")) +
            (1..6).map { cat("Sub$it", "${it * 10}").copy(parent = "Food", parentId = "Food") }).toTypedArray())
        val l = layoutFlow(many, 300.0, 100.0, labelPitch = 38.0)
        l.nodes.filter { it.node.column != 1 }.groupBy { it.node.column }.values.forEach { column ->
            column.map { it.y + it.height / 2 }.sorted().zipWithNext().forEach { (a, b) -> assertTrue("$a $b", b - a >= 38.0 - 1e-9) }
        }
        // it grew to fit them, and nothing runs off either end
        assertTrue(l.height > 100.0)
        assertTrue(l.nodes.all { it.y >= -1e-9 && it.y + it.height <= l.height + 1e-9 })
    }
}
