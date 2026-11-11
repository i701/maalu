package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Card
import app.maalu.data.Ref
import app.maalu.data.canHaveCards
import app.maalu.data.cardCreateJson
import app.maalu.data.cardDigitsProblem
import app.maalu.data.cardNameProblem
import app.maalu.data.cardUpdateJson
import app.maalu.data.cardsOf
import app.maalu.data.repayChoices
import app.maalu.data.repaymentForm
import app.maalu.data.text
import app.maalu.data.AddForm
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/**
 * An account's cards: the ones that spend from it (for a credit card account, the cards that make up its debt) and the credit cards that are
 * repaid from it. A credit card with a repayment account has Repay, which opens the transfer that pays it off.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccountCardsSection(api: Api, account: Account, accounts: List<Account>, cards: List<Card>, archived: Boolean, onRepay: (AddForm) -> Unit, onChanged: () -> Unit, say: (String) -> Unit) {
    val (own, repaid) = cardsOf(cards, account.id)
    // only an account that holds money you spend, or a credit card, has cards
    if (!canHaveCards(account.group) && own.isEmpty() && repaid.isEmpty()) return
    var dialog by remember { mutableStateOf<Pair<Boolean, Card?>?>(null) }
    var deleting by remember { mutableStateOf<Card?>(null) }
    val scope = rememberCoroutineScope()
    val credit = account.group == "card"

    Surface(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Cards", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                if (canHaveCards(account.group) && !archived) TextButton(onClick = { dialog = credit to null }) { Text(if (credit) "Add credit card" else "Add debit card") }
            }
            if (own.isEmpty() && repaid.isEmpty()) Text(
                if (credit) "Add the card to pick it on purchases. What you spend with it is owed here."
                else "Add the debit card for this account to pick it on purchases. It spends from this account.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            own.forEach { c ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(c.text(), style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            TintChip(Accents.getValue(if (c.kind == "credit") "orange" else "blue"), true, {}, { Text(if (c.kind == "credit") "Credit" else "Debit") })
                            c.repayAccount?.let { Text("Repaid from ${it.name}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                    repaymentForm(c)?.let { form -> if (!archived) TextButton(onClick = { onRepay(form) }) { Text("Repay") } }
                    IconButton(onClick = { dialog = credit to c }) { Icon(Icons.Outlined.Edit, "Edit ${c.name}") }
                    IconButton(onClick = { deleting = c }) { Icon(Icons.Outlined.Delete, "Delete ${c.name}") }
                }
            }
            repaid.forEach { c ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${c.text()} is repaid from this account", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    repaymentForm(c)?.let { form -> if (!archived) TextButton(onClick = { onRepay(form) }) { Text("Repay") } }
                }
            }
        }
    }

    dialog?.let { (isCredit, card) ->
        CardDialog(api, account, accounts, card, isCredit, onClose = { dialog = null }, onSaved = { dialog = null; say(if (card == null) "Card added." else "Card updated."); onChanged() })
    }
    deleting?.let { c ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete card?") },
            text = { Text("Delete \"${c.text()}\"? Its transactions stay, and keep their account.") },
            confirmButton = {
                TextButton(onClick = {
                    deleting = null
                    scope.launch {
                        when (val r = api.delete("cards/${c.id}")) {
                            is ApiResult.Ok -> { say("Card deleted."); onChanged() }
                            is ApiResult.Failed -> say(r.message.lines().first())
                        }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep it") } },
        )
    }
}

/** Add or change a card. The account decides the kind: a card on a credit card account is a credit card (repaid from a bank account you choose), any other is a debit card. */
@Composable
private fun CardDialog(api: Api, account: Account, accounts: List<Account>, card: Card?, credit: Boolean, onClose: () -> Unit, onSaved: () -> Unit) {
    var name by remember { mutableStateOf(card?.name.orEmpty()) }
    var digits by remember { mutableStateOf(card?.lastDigits.orEmpty()) }
    var repay by remember { mutableStateOf(card?.repayAccount?.id?.let { id -> card.repayAccount.name.let { Ref(id, it) } }) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val choices = repayChoices(accounts.filter { it.id != account.id }, account.id).map { Ref(it.id, it.name) }
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(if (card != null) "Edit card" else if (credit) "Add credit card" else "Add debit card") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    if (credit) "What you spend with this card is owed on ${account.name}." else "This card spends from ${account.name}: it has no balance of its own.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                CompactField(name, { name = it.take(100); error = null }, if (credit) "Name, for example BML Visa credit" else "Name, for example MIB Visa debit", enabled = !busy, isError = error != null)
                CompactField(digits, { digits = it.filter(Char::isDigit).take(4); error = null }, "Last 4 digits (optional)", enabled = !busy)
                if (credit) PickerField("Repaid from", repay, "Repaid from (optional)", choices, onPick = { repay = it }, anyLabel = "Not set")
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = cardNameProblem(name) ?: cardDigitsProblem(digits)
                if (error != null) return@TextButton
                busy = true
                scope.launch {
                    val result = if (card == null) api.postJson<Card>("cards", cardCreateJson(account, name, digits, repay?.id).toString())
                    else api.patchJson<Card>("cards/${card.id}", cardUpdateJson(credit, name, digits, repay?.id).toString())
                    when (result) {
                        is ApiResult.Ok -> onSaved()
                        is ApiResult.Failed -> { error = result.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
