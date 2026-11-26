@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.UnfoldMore
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.zIndex
import app.maalu.data.Account
import app.maalu.data.AddForm
import app.maalu.data.FormField
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.pickTransferEnd
import app.maalu.data.swapTransfer

/**
 * A transfer's two slabs, From over To, with an arrow on the seam that swaps them. Pressing a slab's account pill grows it over
 * the whole block into the list of accounts. After the iOS app's block (Bencho's Asset swap, MIT).
 */
@Composable
fun TransferSlabs(accounts: List<Account>, form: AddForm, onForm: (AddForm) -> Unit, errorField: FormField?, enabled: Boolean) {
    // 0 for the top slab, 1 for the bottom one, while its list is open
    var picking by rememberSaveable { mutableStateOf<Int?>(null) }
    var turns by remember { mutableIntStateOf(0) }
    val focus = LocalFocusManager.current
    val from = accounts.firstOrNull { it.id == form.accountId }
    val to = accounts.firstOrNull { it.id == form.toAccountId }
    val cross = from != null && to != null && from.currency != to.currency
    // taller with large text, so nothing is clipped
    val slab = 116.dp * LocalDensity.current.fontScale.coerceAtLeast(1f)
    val gap = 4.dp
    val block = slab * 2 + gap
    val spatial = MaterialTheme.motionScheme.defaultSpatialSpec<Float>()
    val turned by animateFloatAsState(turns * 360f, spatial, label = "swap")
    val hidden by animateFloatAsState(if (picking == null) 0f else 1f, MaterialTheme.motionScheme.fastEffectsSpec(), label = "squeeze")

    BackHandler(enabled = picking != null) { picking = null }

    Box(Modifier.fillMaxWidth().height(block)) {
        for (i in 0..1) {
            val source = i == 0
            val grown by animateFloatAsState(if (picking == i) 1f else 0f, spatial, label = "grow")
            val p = grown.coerceIn(0f, 1f)
            val bad = if (source) errorField == FormField.Amount || errorField == FormField.Account
            else errorField == FormField.ToAccount || errorField == FormField.ToAmount
            Surface(
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                border = if (bad) BorderStroke(2.dp, MaterialTheme.colorScheme.error) else null,
                modifier = Modifier
                    .zIndex(if (picking == i) 2f else 0f)
                    .offset(y = if (source) 0.dp else (slab + gap) * (1f - p))
                    .fillMaxWidth()
                    .height(lerp(slab, block, p))
                    // the other slab goes while this one's list is open
                    .alpha(if (picking != null && picking != i) 1f - hidden else 1f),
            ) {
                // one or the other, so a hidden face takes no taps and the two never show at once
                if (picking == i) AccountChoices(
                    if (source) "From" else "To", accounts, if (source) form.accountId else form.toAccountId,
                    onPick = { a -> onForm(form.pickTransferEnd(a, source, accounts)); picking = null },
                    onClose = { picking = null },
                    modifier = Modifier.alpha(((p - 0.4f) / 0.6f).coerceIn(0f, 1f)),
                ) else SlabFace(
                    role = if (source) "From" else "To",
                    account = if (source) from else to,
                    // in one currency the lower slab only repeats what was typed above
                    amount = if (source || !cross) form.amount else form.toAmount,
                    onAmount = when {
                        source -> { text -> onForm(form.copy(amount = cleanAmount(text))) }
                        cross -> { text -> onForm(form.copy(toAmount = cleanAmount(text))) }
                        else -> null
                    },
                    amountName = if (source) "Amount" else "What arrived",
                    enabled = enabled && picking == null,
                    onChoose = { focus.clearFocus(); picking = i },
                    // room for the arrow that overlaps the top of the lower slab
                    modifier = Modifier.padding(top = if (source) 0.dp else 12.dp),
                )
            }
        }
        if (picking == null) FilledTonalIconButton(
            onClick = { onForm(form.swapTransfer(accounts)); turns++ },
            enabled = enabled && (from != null || to != null),
            shapes = IconButtonDefaults.shapes(),
            colors = IconButtonDefaults.filledTonalIconButtonColors(
                // neutral, like the account pills
                containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                contentColor = MaterialTheme.colorScheme.onSurface,
                disabledContainerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            ),
            modifier = Modifier.align(Alignment.TopCenter).offset(y = slab + gap / 2 - 20.dp).size(40.dp).zIndex(1f),
        ) {
            // a full turn, so it always ends pointing the way the money goes
            Icon(Icons.Outlined.ArrowDownward, "Swap the accounts", Modifier.rotate(turned))
        }
    }
}

/** A shut slab: its role, the account's number and balance, the amount, and the pill that opens the list. */
@Composable
private fun SlabFace(role: String, account: Account?, amount: String, onAmount: ((String) -> Unit)?, amountName: String, enabled: Boolean, onChoose: () -> Unit, modifier: Modifier) {
    val quiet = MaterialTheme.colorScheme.onSurfaceVariant
    Column(modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(role, style = MaterialTheme.typography.bodySmall, color = quiet)
            Spacer(Modifier.weight(1f))
            if (account != null) Text(numberAndBalance(account), style = MaterialTheme.typography.bodySmall, color = quiet, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (account != null) Text(account.currency, style = MaterialTheme.typography.titleSmall, color = quiet, modifier = Modifier.alignByBaseline())
                val style = MaterialTheme.typography.headlineMedium.copy(color = if (amount.isEmpty()) quiet else MaterialTheme.colorScheme.onSurface)
                if (onAmount == null) Text(amount.ifEmpty { "0" }, style = style, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.alignByBaseline())
                else BasicTextField(
                    amount, onAmount, enabled = enabled, singleLine = true,
                    textStyle = style.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f).alignByBaseline().semantics { contentDescription = amountName },
                    decorationBox = { field -> Box { if (amount.isEmpty()) Text("0", style = style); field() } },
                )
            }
            Surface(
                onClick = onChoose, enabled = enabled, shape = CircleShape, color = MaterialTheme.colorScheme.surfaceContainerHighest,
                modifier = Modifier.semantics { contentDescription = "$role: ${account?.name ?: "no account"}. Choose another account" },
            ) {
                Row(Modifier.widthIn(max = 160.dp).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(account?.name ?: "Choose", style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    Icon(Icons.Outlined.UnfoldMore, null, Modifier.size(16.dp), tint = quiet)
                }
            }
        }
    }
}

@Composable
private fun AccountChoices(heading: String, accounts: List<Account>, selectedId: String?, onPick: (Account) -> Unit, onClose: () -> Unit, modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(8.dp)) {
        Row(Modifier.fillMaxWidth().padding(start = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(heading, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            IconButton(onClick = onClose, shapes = IconButtonDefaults.shapes()) { Icon(Icons.Outlined.Close, "Close") }
        }
        LazyColumn {
            items(accounts, key = { it.id }) { a ->
                Row(
                    Modifier.fillMaxWidth().clickable { onPick(a) }.heightIn(min = 52.dp).padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("${a.name}  ${a.currency}", style = MaterialTheme.typography.bodyMediumEmphasized, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(numberAndBalance(a), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (a.id == selectedId) Icon(Icons.Outlined.Check, "Selected", Modifier.size(20.dp))
                }
            }
        }
    }
}

/** What tells two accounts of one bank apart: "0123456789 · MVR 10,120.12". */
private fun numberAndBalance(a: Account): String =
    listOfNotNull(a.accountNumber?.takeIf { it.isNotBlank() }, formatMoney(a.balance, a.currency)).joinToString(" · ")
