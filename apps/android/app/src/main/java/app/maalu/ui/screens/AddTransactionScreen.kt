@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Notes
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Account
import app.maalu.data.AddForm
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryItem
import app.maalu.data.FormField
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Ref
import app.maalu.data.TagItem
import app.maalu.data.Transaction
import app.maalu.data.UserMe
import app.maalu.data.VendorItem
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.formFrom
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.shortDate
import app.maalu.data.suggestedMethod
import app.maalu.data.tidyRate
import app.maalu.data.toJson
import app.maalu.data.withDate
import app.maalu.data.withVendor
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.Section
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import app.maalu.ui.theme.idTint
import app.maalu.ui.theme.methodTint
import app.maalu.ui.theme.paletteTint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

private class FormOptions(
    val me: UserMe,
    val accounts: List<Account>,
    val categories: List<CategoryItem>,
    val tags: List<TagItem>,
)

private val TYPES = listOf("expense" to "Expense", "income" to "Income", "transfer" to "Transfer")

/**
 * The new-transaction form as a full-screen dialog: type, amount, account, category, vendor, when, how
 * it was paid, tags and a note. Foreign accounts bring their rate along; a transfer between currencies asks
 * what arrived. The form locks while it saves and stays open, with what was typed, if the server refuses.
 */
@Composable
fun AddTransactionScreen(api: Api, onClose: () -> Unit, onSaved: () -> Unit, editing: Transaction? = null) {
    var options by remember { mutableStateOf<FormOptions?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    // editing starts from the saved transaction; the form to compare changes against stays as it was loaded
    val before = remember(editing) { editing?.let(::formFrom) }
    var form by remember { mutableStateOf(before ?: AddForm()) }
    var error by remember { mutableStateOf<String?>(null) }
    var errorField by remember { mutableStateOf<FormField?>(null) }
    val snackbar = remember { SnackbarHostState() }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val me = api.get<UserMe>("users/me")
        val accounts = api.get<List<Account>>("accounts")
        val categories = api.get<List<CategoryItem>>("categories")
        val tags = api.get<List<TagItem>>("tags")
        if (me is ApiResult.Ok && accounts is ApiResult.Ok) {
            val list = accounts.data
            options = FormOptions(me.data, list, (categories as? ApiResult.Ok)?.data.orEmpty(), (tags as? ApiResult.Ok)?.data.orEmpty())
            // a new transaction starts in the default account (or the first one), with its currency's rate and usual way of
            // paying; an edit keeps what the transaction has
            val start = list.firstOrNull { it.id == me.data.defaultAccountId } ?: list.firstOrNull { !it.isLiability } ?: list.firstOrNull()
            if (editing == null && start != null) form = form.copy(accountId = start.id, rate = tidyRate(start.exchangeRate), method = suggestedMethod(start.group))
        } else {
            loadError = (me as? ApiResult.Failed)?.message ?: (accounts as? ApiResult.Failed)?.message ?: "Could not load your accounts."
        }
    }

    androidx.compose.runtime.CompositionLocalProvider(LocalApi provides api) { Dialog(onDismissRequest = { if (!busy) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = {
                TopAppBar(
                    title = { Text((if (editing == null) "New " else "Edit ") + (TYPES.first { it.first == form.type }.second.lowercase())) },
                    navigationIcon = { IconButton(onClick = onClose, enabled = !busy) { Icon(Icons.Outlined.Close, "Close") } },
                )
            },
        ) { padding ->
            val o = options
            when {
                loadError != null -> Column(Modifier.fillMaxSize().padding(padding).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(loadError ?: "", color = MaterialTheme.colorScheme.error)
                    Button(onClick = onClose, shapes = ButtonDefaults.shapes(), modifier = Modifier.padding(top = 12.dp)) { Text("Close") }
                }
                o == null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                else -> Form(
                    o, editing?.splits?.isNotEmpty() == true, if (editing != null) "Save changes" else "Save", form, { errorField = null; form = it }, error, errorField, busy, Modifier.padding(padding),
                    onSave = {
                        val base = o.me.baseCurrency
                        val problem = form.problem(o.accounts, base)
                        if (problem != null) {
                            // the same message as a toast, with the field outlined
                            errorField = problem.field; error = null
                            scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                            return@Form
                        }
                        // nothing changed in an edit: just close
                        val patch = if (editing != null && before != null) form.patchJson(before, o.accounts, base) else null
                        if (patch != null && patch.isEmpty()) { onClose(); return@Form }
                        busy = true; error = null; errorField = null
                        scope.launch {
                            val result = if (editing != null && patch != null) api.patchJson<Transaction>("transactions/${editing.id}", patch.toString())
                            else api.postJson<Transaction>("transactions", form.toJson(o.accounts, base).toString())
                            when (val r = result) {
                                is ApiResult.Ok -> onSaved()
                                is ApiResult.Failed -> {
                                    error = r.message; busy = false
                                    errorField = fieldOf(r.fields.keys.firstOrNull())
                                    snackbar.currentSnackbarData?.dismiss()
                                    launch { snackbar.showSnackbar(r.message.lines().first()) }
                                }
                            }
                        }
                    },
                )
            }
        }
    } }
}

@Composable
private fun typeTint(type: String): Color = when (type) {
    "income" -> ChartColors.IncomeLight
    "transfer" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.error
}

@Composable
private fun Form(o: FormOptions, hasItems: Boolean, saveLabel: String, form: AddForm, onForm: (AddForm) -> Unit, error: String?, errorField: FormField?, busy: Boolean, modifier: Modifier, onSave: () -> Unit) {
    val base = o.me.baseCurrency
    val account = o.accounts.firstOrNull { it.id == form.accountId }
    val toAccount = o.accounts.firstOrNull { it.id == form.toAccountId }
    val currency = account?.currency ?: base
    val foreign = form.type != "transfer" && currency != base
    val crossCurrency = form.type == "transfer" && account != null && toAccount != null && account.currency != toAccount.currency
    val tint = typeTint(form.type)
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }

    fun pickAccount(a: Account) = onForm(
        form.copy(accountId = a.id, rate = tidyRate(a.exchangeRate), method = if (form.methodTouched) form.method else suggestedMethod(a.group)),
    )

    Column(modifier.fillMaxSize().imePadding()) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            // what it is: each type in its own colour, the chosen one stronger
            SegmentedPills(
                options = TYPES,
                selected = form.type,
                onSelect = { value -> onForm(form.copy(type = value, toAccountId = if (value == "transfer") form.toAccountId else null)) },
                tint = { typeTint(it) },
                enabled = !busy,
            )

            // the amount: a regular field like the rest, with the currency at its end; the tile takes the type's colour
            Section("Amount", Icons.Outlined.Numbers, tint) {
                CompactField(
                    form.amount, { onForm(form.copy(amount = cleanAmount(it))) }, "0.00",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    enabled = !busy, isError = errorField == FormField.Amount, suffix = currency,
                )
            }

            Section(if (form.type == "transfer") "From" else "Account", Icons.Outlined.AccountBalance, Accents.getValue("violet")) {
                PickerField(
                    isError = errorField == FormField.Account,
                    title = "Account", value = account?.let { Ref(it.id, it.name) }, placeholder = "No account", anyLabel = null,
                    entries = o.accounts.map { Ref(it.id, it.name) },
                    detail = { r -> o.accounts.firstOrNull { it.id == r.id }?.let(::accountDetail) },
                    onPick = { r -> o.accounts.firstOrNull { it.id == r?.id }?.let(::pickAccount) },
                )
                if (foreign) CompactField(
                    form.rate, { onForm(form.copy(rate = cleanAmount(it))) }, "Exchange rate: 1 $currency = ? $base",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == FormField.Rate,
                )
            }

            if (form.type == "transfer") Section("To", Icons.Outlined.SwapHoriz, Accents.getValue("blue")) {
                PickerField(
                    isError = errorField == FormField.ToAccount,
                    title = "To account", value = toAccount?.let { Ref(it.id, it.name) }, placeholder = "Choose an account", anyLabel = null,
                    entries = o.accounts.filter { it.id != form.accountId }.map { Ref(it.id, it.name) },
                    detail = { r -> o.accounts.firstOrNull { it.id == r.id }?.let(::accountDetail) },
                    onPick = { r -> onForm(form.copy(toAccountId = r?.id)) },
                )
                if (crossCurrency) CompactField(
                    form.toAmount, { onForm(form.copy(toAmount = cleanAmount(it))) }, "Amount received in ${toAccount?.currency}",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == FormField.ToAmount,
                )
            }

            if (form.type != "transfer" && hasItems) Text(
                "This purchase is split into items. Edit the items on the web; the rest can be changed here.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (form.type != "transfer" && !hasItems) {
                Section("Category", Icons.Outlined.Category, Accents.getValue("amber")) {
                    PickerField(
                        isError = errorField == FormField.Category,
                        title = "Category", value = form.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Choose or type a category",
                        anyLabel = null, searchable = true, allowCreate = true,
                        entries = o.categories.map { Ref(it.id, it.name) },
                        onPick = { r -> onForm(form.copy(category = r?.name ?: "")) },
                    )
                }
                VendorSection(form, onForm)
            }

            Section("When", Icons.Outlined.CalendarMonth, Accents.getValue("blue")) {
                val today = LocalDate.now()
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TintChip(paletteTint(0), form.date == "$today", { onForm(form.withDate("$today")) }, { Text("Today") })
                    TintChip(paletteTint(1), form.date == "${today.minusDays(1)}", { onForm(form.withDate("${today.minusDays(1)}")) }, { Text("Yesterday") })
                    val custom = form.date != "$today" && form.date != "${today.minusDays(1)}"
                    TintChip(paletteTint(2), custom, { pickingDate = true }, { Text(if (custom) shortDate(form.date) else "Pick a date") })
                    TintChip(paletteTint(3), form.time != null, { if (form.time == null) pickingTime = true else onForm(form.copy(time = null)) }, { Text(form.time ?: "Add time") })
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                    // a wide gap before the switch, so the sub-text wraps instead of crowding it
                    Column(Modifier.weight(1f)) {
                        Text("Planned", style = MaterialTheme.typography.bodyMedium)
                        Text("Hasn't happened yet. It counts toward nothing until you mark it paid.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = form.planned, onCheckedChange = { onForm(form.copy(planned = it, plannedTouched = true)) }, enabled = !busy)
                }
            }

            if (form.type != "transfer") {
                Section("Paid by", Icons.Outlined.Payments, Accents.getValue("slate")) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PaymentMethodLabels.forEach { (value, label) ->
                            TintChip(methodTint(value), form.method == value, { onForm(form.copy(method = value, methodTouched = true)) }, { Text(label) })
                        }
                    }
                }
                if (o.tags.isNotEmpty()) Section("Tags", Icons.Outlined.Sell, Accents.getValue("pink")) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        o.tags.forEach { tag ->
                            val on = tag.name in form.tags
                            TintChip(idTint(tag.id), on, { onForm(form.copy(tags = if (on) form.tags - tag.name else form.tags + tag.name)) }, { Text(tag.name) })
                        }
                    }
                }
            }

            Section("Note", Icons.Outlined.Notes, Accents.getValue("lime")) {
                // a text area: the width of the screen and several lines tall
                CompactField(form.note, { onForm(form.copy(note = it.take(500))) }, "Add a note", Modifier.fillMaxWidth(), singleLine = false, enabled = !busy, minHeight = 112.dp)
            }
            Box(Modifier.padding(bottom = 8.dp))
        }

        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            Button(onClick = onSave, enabled = !busy, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) {
                Text(if (busy) "Saving…" else saveLabel)
            }
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(form.date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { ms -> onForm(form.withDate(Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate().toString())) }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state) }
    }
    if (pickingTime) {
        val state = rememberTimePickerState(is24Hour = true)
        AlertDialog(
            onDismissRequest = { pickingTime = false },
            confirmButton = {
                TextButton(onClick = { onForm(form.copy(time = "%02d:%02d".format(state.hour, state.minute))); pickingTime = false }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingTime = false }) { Text("Cancel") } },
            text = { TimePicker(state) },
        )
    }
}

/**
 * The vendor, picked from your own vendors: a sheet that searches them as you type (the server does the
 * searching), with the usual category and tags filled in on pick. A name that matches none can be created.
 */
@Composable
private fun VendorSection(form: AddForm, onForm: (AddForm) -> Unit) {
    val api = LocalApi.current
    var known by remember { mutableStateOf<List<VendorItem>>(emptyList()) }
    var query by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(query) {
        val q = query ?: return@LaunchedEffect
        if (api == null) return@LaunchedEffect
        if (q.isNotEmpty()) delay(250) // wait for a pause in typing
        known = (api.get<List<VendorItem>>("vendors", buildMap { if (q.isNotEmpty()) put("q", q); put("limit", "30") }) as? ApiResult.Ok)?.data.orEmpty()
    }
    Section("Vendor", Icons.Outlined.Storefront, Accents.getValue("orange")) {
        PickerField(
            title = "Vendor",
            value = form.vendor.takeIf { it.isNotBlank() }?.let { Ref("", it) },
            placeholder = "Choose or add a vendor (optional)",
            anyLabel = "No vendor",
            entries = known.map { Ref(it.id, it.name) },
            searchable = true,
            allowCreate = true,
            detail = { r -> known.firstOrNull { it.id == r.id }?.defaultCategory },
            onQuery = { query = it },
            onPick = { r ->
                val picked = known.firstOrNull { it.id == r?.id }
                onForm(if (picked != null) form.withVendor(picked) else form.copy(vendor = r?.name ?: ""))
            },
        )
    }
}

/** What the account list shows under a name: the balance, then the bank and number that tell look-alikes apart. */
fun accountDetail(a: Account): String =
    listOfNotNull(formatMoney(a.balance, a.currency), a.bank, a.accountNumber).joinToString(" · ")

/** The form field an API field name belongs to, so a server refusal can outline it too. */
private fun fieldOf(apiName: String?): FormField? = when (apiName) {
    "amount" -> FormField.Amount
    "account_id" -> FormField.Account
    "to_account_id" -> FormField.ToAccount
    "to_amount" -> FormField.ToAmount
    "category" -> FormField.Category
    "exchange_rate" -> FormField.Rate
    else -> null
}

/** The signed-in API, for the vendor search deep inside the form. */
private val LocalApi = androidx.compose.runtime.staticCompositionLocalOf<Api?> { null }
