package app.maalu.data

// Ported from apps/web/src/lib/transfer.ts: keep the two in step.

/**
 * The two ends of a transfer traded (a lone account moves to the other side). Between two currencies what left one account
 * is what arrived in the other, so the figures trade too. The new source brings its rate and way of paying.
 */
fun AddForm.swapTransfer(accounts: List<Account>): AddForm {
    val from = accounts.firstOrNull { it.id == accountId }
    val to = accounts.firstOrNull { it.id == toAccountId }
    val cross = from != null && to != null && from.currency != to.currency
    val swapped = (if (to != null) withAccount(to) else copy(accountId = null, cardId = null)).copy(toAccountId = accountId)
    return if (cross) swapped.copy(amount = toAmount, toAmount = amount) else swapped
}

/** [a] picked on one side. An account cannot be on both, so picking the one already on the other side swaps them. */
fun AddForm.pickTransferEnd(a: Account, source: Boolean, accounts: List<Account>): AddForm = when {
    a.id == (if (source) toAccountId else accountId) -> swapTransfer(accounts)
    source -> withAccount(a)
    else -> copy(toAccountId = a.id)
}
