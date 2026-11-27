@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Spacer
import app.maalu.data.detailsSummary
import app.maalu.data.hasDetails
import app.maalu.ui.components.SaveButtonRoom
import app.maalu.ui.components.FormSwitchRow
import app.maalu.ui.components.FormRowStyle
import app.maalu.ui.components.FloatingSave
import app.maalu.ui.components.DisclosureRow
import app.maalu.ui.components.Disclosure
import app.maalu.ui.components.BigAmountField
import app.maalu.ui.components.BackdropPage
import app.maalu.ui.components.glowTopBarColors
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Account
import app.maalu.data.AccountField
import app.maalu.data.AccountForm
import app.maalu.data.AccountGroupsInOrder
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CreditLimitGroups
import app.maalu.data.CurrencyList
import app.maalu.data.GroupHelp
import app.maalu.data.LiabilityGroups
import app.maalu.data.MarketRate
import app.maalu.data.Ref
import app.maalu.data.UserMe
import app.maalu.data.bankChoices
import app.maalu.data.cleanAmount
import app.maalu.data.cleanSigned
import app.maalu.data.formFrom
import app.maalu.data.groupLabel
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.spendableByGroup
import app.maalu.data.tidyRate
import app.maalu.data.toJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import kotlinx.coroutines.launch
import java.time.LocalDate

private class Lookups(val base: String, val currencies: List<String>)

/**
 * Add or edit an account as a full-screen form: its kind, name, currency (a foreign one brings a market rate to
 * start from), opening amount, bank and number, a credit limit and statement days for cards, and whether it counts as
 * everyday money or toward totals. Problems show as a snackbar with the field outlined; the form locks while saving.
 */
@Composable
fun AccountFormScreen(api: Api, existing: List<Account>, editing: Account?, onClose: () -> Unit, onSaved: () -> Unit) {
    var lookups by remember { mutableStateOf<Lookups?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    val before = remember(editing) { editing?.let(::formFrom) }
    // a new account's opening balance starts empty (it is sent as zero), so there is no 0 to delete first
    var form by remember { mutableStateOf(before ?: AccountForm(opening = "")) }
    var error by remember { mutableStateOf<String?>(null) }
    var errorField by remember { mutableStateOf<AccountField?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val me = api.get<UserMe>("users/me")
        val list = api.get<CurrencyList>("currencies")
        if (me is ApiResult.Ok) {
            lookups = Lookups(me.data.baseCurrency, (list as? ApiResult.Ok)?.data?.currencies.orEmpty())
            if (editing == null && form.currency.isBlank()) form = form.copy(currency = me.data.baseCurrency)
        } else loadError = (me as? ApiResult.Failed)?.message ?: "Could not load."
    }

    // a foreign currency starts from today's market rate, until the person types their own
    val base = lookups?.base
    LaunchedEffect(form.currency, base) {
        if (base == null || form.currency.isBlank() || form.currency == base || form.rateTouched) return@LaunchedEffect
        val r = api.get<MarketRate>("currencies/rate", mapOf("base" to form.currency, "quote" to base, "on" to "${LocalDate.now()}"))
        if (r is ApiResult.Ok && !form.rateTouched) form = form.copy(rate = tidyRate(r.data.rate))
    }

    Dialog(onDismissRequest = { if (!busy) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        BackdropPage {
            Scaffold(
                containerColor = androidx.compose.ui.graphics.Color.Transparent,
                // above the floating Save button
                snackbarHost = { SnackbarHost(snackbar, Modifier.padding(bottom = SaveButtonRoom)) },
                topBar = {
                    TopAppBar(
                        colors = glowTopBarColors(),
                        title = { Text(if (editing == null) "New account" else "Edit account") },
                        navigationIcon = { IconButton(onClick = onClose, enabled = !busy) { Icon(Icons.Outlined.Close, "Close") } },
                    )
                },
            ) { padding ->
                val l = lookups
                when {
                    loadError != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { Text(loadError ?: "", color = MaterialTheme.colorScheme.error) }
                    l == null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    else -> Box(Modifier.padding(padding).fillMaxSize().imePadding()) {
                        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            AccountFields(form, { errorField = null; form = it }, l, existing, errorField, !busy)
                            Spacer(Modifier.height(SaveButtonRoom))
                        }
                        FloatingSave(if (editing != null) "Save changes" else "Add account", busy, error, onClick = save@{
                            val problem = form.problem(l.base)
                            if (problem != null) {
                                errorField = problem.field; error = null
                                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                                return@save
                            }
                            val patch = if (editing != null && before != null) form.patchJson(before, l.base) else null
                            if (patch != null && patch.isEmpty()) { onClose(); return@save }
                            busy = true; error = null; errorField = null
                            scope.launch {
                                val result = if (editing != null && patch != null) api.patchJson<Account>("accounts/${editing.id}", patch.toString())
                                else api.postJson<Account>("accounts", form.toJson(l.base).toString())
                                when (val r = result) {
                                    is ApiResult.Ok -> onSaved()
                                    is ApiResult.Failed -> {
                                        error = r.message; busy = false
                                        snackbar.currentSnackbarData?.dismiss()
                                        launch { snackbar.showSnackbar(r.message.lines().first()) }
                                    }
                                }
                            }
                        }, modifier = Modifier.align(Alignment.BottomCenter))
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountFields(form: AccountForm, onForm: (AccountForm) -> Unit, l: Lookups, existing: List<Account>, errorField: AccountField?, enabled: Boolean) {
    val currency = form.currency.ifBlank { l.base }
    val foreign = currency != l.base
    val liability = form.group in LiabilityGroups
    val numbers = KeyboardOptions(keyboardType = KeyboardType.Decimal)

    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        BigAmountField(form.opening, { onForm(form.copy(opening = cleanSigned(it))) }, currency, enabled = enabled, isError = errorField == AccountField.Opening)
        Text(
            if (liability) "Opening balance. Enter what you owe as a negative number." else "Opening balance, before the first transaction you track.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
    }

    CompactField(form.name, { onForm(form.copy(name = it.take(100))) }, "Name", enabled = enabled, isError = errorField == AccountField.Name, placeholder = "For example BML Current")

    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        PickerField(
            title = "Kind of account", value = Ref(form.group, groupLabel(form.group)), placeholder = "Kind", anyLabel = null,
            entries = AccountGroupsInOrder.map { Ref(it, groupLabel(it)) },
            detail = { GroupHelp[it.id] },
            onPick = { r -> r?.let { onForm(form.copy(group = it.id)) } },
            row = FormRowStyle("Kind", Icons.Outlined.Category, first = true),
        )
        PickerField(
            title = "Currency", value = Ref(currency, currency), placeholder = l.base, anyLabel = null,
            searchable = true, entries = l.currencies.map { Ref(it, it) },
            onPick = { r -> r?.let { onForm(form.copy(currency = it.id, rateTouched = false, rate = "1")) } },
            row = FormRowStyle("Currency", Icons.Outlined.Payments),
        )
        PickerField(
            title = "Bank", value = form.bank.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Optional", anyLabel = "No bank",
            searchable = true, allowCreate = true, entries = bankChoices(existing).map { Ref(it, it) },
            onPick = { r -> onForm(form.copy(bank = r?.name ?: "")) },
            row = FormRowStyle("Bank", Icons.Outlined.AccountBalance, last = true),
        )
    }

    // only what this kind of account or currency needs
    if (foreign) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        CompactField(
            form.rate, { onForm(form.copy(rate = cleanAmount(it), rateTouched = true)) }, "Exchange rate",
            keyboard = numbers, enabled = enabled, isError = errorField == AccountField.Rate, placeholder = "1 $currency = ? ${l.base}",
        )
        FormSwitchRow(FormRowStyle("Keep this rate up to date", Icons.Outlined.Sync, first = true, last = true), "Follows the market every day", form.autoRate, enabled) { onForm(form.copy(autoRate = it)) }
    }
    if (form.group in CreditLimitGroups) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        CompactField(
            form.creditLimit, { onForm(form.copy(creditLimit = cleanAmount(it))) }, "Credit limit (optional)",
            keyboard = numbers, enabled = enabled, isError = errorField == AccountField.CreditLimit, suffix = currency,
        )
        if (form.group == "card") Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CompactField(form.statementDay, { onForm(form.copy(statementDay = it.filter(Char::isDigit).take(2))) }, "Statement day", Modifier.weight(1f), KeyboardOptions(keyboardType = KeyboardType.Number), enabled = enabled, isError = errorField == AccountField.Days)
            CompactField(form.dueDay, { onForm(form.copy(dueDay = it.filter(Char::isDigit).take(2))) }, "Due day", Modifier.weight(1f), KeyboardOptions(keyboardType = KeyboardType.Number), enabled = enabled, isError = errorField == AccountField.Days)
        }
    }

    // open from the start when something in it is already set (editing)
    val detailsSet = form.hasDetails()
    var open by rememberSaveable { mutableStateOf(detailsSet) }
    LaunchedEffect(detailsSet) { if (detailsSet) open = true }
    Column {
        DisclosureRow("More details", form.detailsSummary(), open) { open = !open }
        Disclosure(open) {
            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactField(form.number, { onForm(form.copy(number = it.take(34))) }, "Account number (optional)", enabled = enabled)
                CompactField(form.description, { onForm(form.copy(description = it.take(300))) }, "Add a note", Modifier.fillMaxWidth(), singleLine = false, enabled = enabled)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    if (!liability) FormSwitchRow(
                        FormRowStyle("I spend from it", Icons.Outlined.ShoppingBag, first = true), "Counts toward what you can spend",
                        form.spendable ?: spendableByGroup(form.group), enabled,
                    ) { onForm(form.copy(spendable = if (it == spendableByGroup(form.group)) null else it)) }
                    FormSwitchRow(
                        FormRowStyle("Leave out of totals", Icons.Outlined.VisibilityOff, first = liability, last = true), "Reports and budgets ignore it",
                        form.exclude, enabled,
                    ) { onForm(form.copy(exclude = it)) }
                }
            }
        }
    }
}
