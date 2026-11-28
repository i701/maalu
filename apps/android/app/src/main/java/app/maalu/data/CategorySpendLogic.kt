package app.maalu.data

import java.math.BigDecimal
import java.time.LocalDate

// Ported from `spendByCategory` (lib/categories.ts) and `limitFor` / `limitColor` (lib/budget.ts) in the web app.

/** What a category spent in a month with its sub-categories' (the tree is one level), and whether those added anything. */
data class CategorySpend(val total: BigDecimal, val fromChildren: Boolean)

/** Expense per category id, refunds already taken off. A parent also gets its sub-categories'; no spending, no entry. */
fun spendByCategory(totals: List<CategoryTotal>): Map<String, CategorySpend> {
    val expenses = totals.filter { it.type == "expense" }
    val own = expenses.associate { it.categoryId to amountOf(it.total) }
    val subs = expenses.filter { it.parentId != null }.groupBy({ it.parentId.orEmpty() }, { amountOf(it.total) })
    return (own.keys + subs.keys).associateWith { id ->
        CategorySpend(subs[id].orEmpty().fold(own[id] ?: BigDecimal.ZERO, BigDecimal::add), id in subs)
    }
}

/** The Transactions filters behind a category's figure for a month; the API counts a parent's sub-categories in. */
fun categoryTransactions(categoryId: String, name: String, month: LocalDate): TxFilters {
    val (start, end) = monthBounds(month)
    return TxFilters(category = Ref(categoryId, name), dateFrom = "$start", dateTo = "$end")
}

/** Everything spent in the month, each category counted once. */
fun totalSpent(totals: List<CategoryTotal>): BigDecimal =
    totals.filter { it.type == "expense" }.fold(BigDecimal.ZERO) { sum, t -> sum + amountOf(t.total) }

private fun amountOf(text: String): BigDecimal = text.toBigDecimalOrNull() ?: BigDecimal.ZERO

/** A limit as the Categories screen shows it, whether it runs by period or for set dates. */
data class CategoryLimit(
    val id: String, val name: String, val spent: String, val total: BigDecimal, val percent: Int, val status: String,
    /** The limit's place among all the budget's limits, so it keeps its colour whichever month is picked. */
    val place: Int,
)

/**
 * The limit a category counts against in the period shown: one that lists it, else one that lists its parent. Monthly
 * limits come before limits for set dates. Null when none covers it.
 */
fun limitFor(budget: Budget, categoryId: String, parentId: String?): CategoryLimit? {
    val onShow = fixedInPeriod(budget)
    fun covering(id: String): CategoryLimit? {
        budget.lines.firstOrNull { line -> line.categories.any { it.id == id } }?.let { l ->
            val total = amountOf(l.amount) + amountOf(l.carried) + amountOf(l.movedIn) - amountOf(l.movedOut)
            return CategoryLimit(l.id, l.name, l.activity, total, l.percent, l.status, budget.lines.indexOf(l))
        }
        return onShow.firstOrNull { line -> line.categories.any { it.id == id } }?.let { f ->
            CategoryLimit(f.id, f.name, f.activity, amountOf(f.amount), f.percent, f.status, budget.lines.size + budget.fixedLines.indexOf(f))
        }
    }
    return covering(categoryId) ?: parentId?.let(::covering)
}

/** The day to ask the budget about: today's period for this month, else the period holding most of that month. */
fun budgetDay(month: LocalDate, today: LocalDate): LocalDate =
    if (monthBounds(month) == monthBounds(today)) today else month.withDayOfMonth(15)
