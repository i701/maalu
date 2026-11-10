@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.EventRepeat
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
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
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryItem
import app.maalu.data.IntervalUnits
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Ref
import app.maalu.data.RemindOptions
import app.maalu.data.SubField
import app.maalu.data.Subscription
import app.maalu.data.SubscriptionForm
import app.maalu.data.SubscriptionStatuses
import app.maalu.data.UserMe
import app.maalu.data.cleanAmount
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.shortDate
import app.maalu.data.subscriptionFormFrom
import app.maalu.data.tidyRate
import app.maalu.data.toJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.Section
import app.maalu.ui.components.TintChip
import app.maalu.ui.components.VendorPickerField
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.methodTint
import app.maalu.ui.theme.paletteTint
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** Add or edit a subscription: what it costs and how often, where it is paid from, its vendor and category, an optional end, a reminder. */
@Composable
fun SubscriptionFormScreen(api: Api, editing: Subscription?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(editing) { editing?.let(::subscriptionFormFrom) }
    var form by remember { mutableStateOf(before ?: SubscriptionForm()) }
    var accounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var categories by remember { mutableStateOf<List<CategoryItem>>(emptyList()) }
    var base by remember { mutableStateOf<String?>(null) }
    var errorField by remember { mutableStateOf<SubField?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pickingDate by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        accounts = (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.data.orEmpty()
        categories = (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty()
        base = (api.get<UserMe>("users/me") as? ApiResult.Ok)?.data?.baseCurrency
    }
    val baseCurrency = base ?: ""
    val account = accounts.firstOrNull { it.id == form.accountId }
    val currency = account?.currency ?: baseCurrency
    val foreign = base != null && currency != baseCurrency
    fun set(f: SubscriptionForm) { errorField = null; form = f }

    FormDialog(
        title = if (editing == null) "New subscription" else "Edit subscription", saveLabel = if (editing == null) "Add subscription" else "Save changes",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem(accounts, baseCurrency)
            if (problem != null) {
                errorField = problem.field; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editing != null && before != null) form.patchJson(before, accounts, baseCurrency) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; errorField = null
            scope.launch {
                val r = if (editing != null && patch != null) api.patchJson<Subscription>("subscriptions/${editing.id}", patch.toString())
                else api.postJson<Subscription>("subscriptions", form.toJson(accounts, baseCurrency).toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.EventRepeat, Accents.getValue("violet")) {
            CompactField(form.name, { set(form.copy(name = it.take(100))) }, "For example Netflix", enabled = !busy, isError = errorField == SubField.Name)
        }
        Section("Amount", Icons.Outlined.Numbers, Accents.getValue("orange")) {
            CompactField(
                form.amount, { set(form.copy(amount = cleanAmount(it))) }, "0.00",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == SubField.Amount, suffix = currency,
            )
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("The amount changes each time", style = MaterialTheme.typography.bodyMedium)
                    Text("A utility or server bill: payments are estimates until you enter the real amount.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = form.varies, onCheckedChange = { set(form.copy(varies = it)) }, enabled = !busy)
            }
        }
        Section("Pay from", Icons.Outlined.AccountBalance, Accents.getValue("green")) {
            PickerField(
                title = "Pay from", value = account?.let { Ref(it.id, it.name) }, placeholder = "No account chosen", anyLabel = "No account",
                entries = accounts.map { Ref(it.id, it.name) },
                detail = { r -> accounts.firstOrNull { it.id == r.id }?.let { app.maalu.data.formatMoney(it.balance, it.currency) } },
                onPick = { r -> set(form.copy(accountId = r?.id, rate = r?.let { p -> accounts.firstOrNull { it.id == p.id }?.let { tidyRate(it.exchangeRate) } } ?: "1")) },
            )
            if (foreign) CompactField(
                form.rate, { set(form.copy(rate = cleanAmount(it))) }, "Exchange rate: 1 $currency = ? $baseCurrency",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == SubField.Rate,
            )
        }
        Section("Vendor", Icons.Outlined.Storefront, Accents.getValue("pink")) {
            VendorPickerField(api, form.vendor, onPick = { name, picked -> set(form.copy(vendor = name, category = if (form.category.isBlank()) picked?.defaultCategory ?: form.category else form.category)) })
        }
        Section("Category", Icons.Outlined.Category, Accents.getValue("amber")) {
            PickerField(
                title = "Category", value = form.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Choose or type a category", anyLabel = null,
                searchable = true, allowCreate = true, entries = categories.map { Ref(it.id, it.name) }, onPick = { set(form.copy(category = it?.name ?: "")) },
                isError = errorField == SubField.Category,
            )
        }
        Section("Paid by", Icons.Outlined.Payments, Accents.getValue("slate")) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PaymentMethodLabels.forEach { (value, label) -> TintChip(methodTint(value), form.method == value, { set(form.copy(method = value)) }, { Text(label) }) }
            }
        }
        Section("How often", Icons.Outlined.Tune, Accents.getValue("blue")) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Every", style = MaterialTheme.typography.bodyMedium)
                CompactField(form.count, { set(form.copy(count = it.filter(Char::isDigit).take(2))) }, "1", Modifier.weight(0.35f), KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !busy, isError = errorField == SubField.Count)
            }
            SegmentedPills(IntervalUnits, form.unit, { set(form.copy(unit = it)) }, tint = { u -> paletteTint(IntervalUnits.indexOfFirst { it.first == u }) }, enabled = !busy)
        }
        Section("First payment", Icons.Outlined.CalendarMonth, Accents.getValue("lime")) {
            TintChip(Accents.getValue("lime"), true, { pickingDate = true }, { Text(shortDate(form.startDate) + ", " + LocalDate.parse(form.startDate).year) })
            Text("The schedule counts from this day.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Section("Number of payments", Icons.Outlined.Numbers, Accents.getValue("violet")) {
            CompactField(
                form.installments, { set(form.copy(installments = it.filter(Char::isDigit).take(3))) }, "Leave empty if it goes on",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !busy, isError = errorField == SubField.Installments,
            )
        }
        Section("Remind me", Icons.Outlined.Notifications, Accents.getValue("amber")) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RemindOptions.forEachIndexed { i, (days, label) -> TintChip(paletteTint(i), form.remind == days, { set(form.copy(remind = days)) }, { Text(label) }) }
            }
        }
        if (editing != null) Section("Status", Icons.Outlined.EventRepeat, Accents.getValue("green")) {
            SegmentedPills(SubscriptionStatuses, form.status, { set(form.copy(status = it)) }, tint = { s -> Accents.getValue(when (s) { "active" -> "green"; "paused" -> "amber"; else -> "slate" }) }, enabled = !busy)
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(form.startDate).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { set(form.copy(startDate = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString())) }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state) }
    }
}
