@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.material3.OutlinedButton
import androidx.compose.material.icons.outlined.LocationOn
import app.maalu.ui.components.PickerSheet
import app.maalu.data.templateSummary
import app.maalu.data.templateNameProblem
import app.maalu.data.toTemplateJson
import app.maalu.data.formFromTemplate
import app.maalu.data.Template
import androidx.compose.material.icons.outlined.BookmarkAdd
import androidx.compose.material.icons.outlined.Bookmark
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
import androidx.compose.runtime.mutableStateListOf
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
import app.maalu.ui.components.MoneyText
import androidx.compose.foundation.layout.Spacer
import androidx.compose.material.icons.outlined.ReceiptLong
import app.maalu.data.splitTotal
import app.maalu.data.newItem
import app.maalu.data.lines
import app.maalu.data.effectiveAmount
import app.maalu.data.TaxMode
import app.maalu.data.ItemRow
import app.maalu.data.withCard
import app.maalu.data.text
import app.maalu.data.cardsForForm
import app.maalu.data.Card
import app.maalu.data.linkJson
import app.maalu.data.attachmentProblem
import app.maalu.data.humanSize
import app.maalu.data.TxLink
import app.maalu.data.Attachment
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
import app.maalu.data.seedAfterSave
import app.maalu.data.tidyRate
import app.maalu.data.toJson
import app.maalu.data.withAccount
import app.maalu.data.withDate
import app.maalu.data.withVendor
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.VendorPickerField
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
    val templates: List<Template>,
    val cards: List<Card> = emptyList(),
)

private val TYPES = listOf("expense" to "Expense", "income" to "Income", "transfer" to "Transfer")

/**
 * The new-transaction form as a full-screen dialog: type, amount, account, category, vendor, when, how
 * it was paid, tags and a note. Foreign accounts bring their rate along; a transfer between currencies asks
 * what arrived. The form locks while it saves and stays open, with what was typed, if the server refuses.
 */
@Composable
fun AddTransactionScreen(api: Api, onClose: () -> Unit, onSaved: () -> Unit, editing: Transaction? = null, initial: AddForm? = null, onAdded: (() -> Unit)? = null) {
    var options by remember { mutableStateOf<FormOptions?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    // editing starts from the saved transaction; the form to compare changes against stays as it was loaded
    val before = remember(editing) { editing?.let(::formFrom) }
    var form by remember { mutableStateOf(before ?: initial ?: AddForm()) }
    var error by remember { mutableStateOf<String?>(null) }
    var errorField by remember { mutableStateOf<FormField?>(null) }
    val snackbar = remember { SnackbarHostState() }
    var busy by remember { mutableStateOf(false) }
    var pickingTemplate by remember { mutableStateOf(false) }
    var savingTemplate by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    // receipts and links picked while the transaction does not exist yet: they go up as soon as it is saved
    val pendingFiles = remember { mutableStateListOf<PickedFile>() }
    val pendingLinks = remember { mutableStateListOf<Pair<String, String>>() }
    var addingLink by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val me = api.get<UserMe>("users/me")
        val accounts = api.get<List<Account>>("accounts")
        val categories = api.get<List<CategoryItem>>("categories")
        val tags = api.get<List<TagItem>>("tags")
        // templates are offered only when the person has them switched on
        val templates = if ((me as? ApiResult.Ok)?.data?.startFromTemplate != false) (api.get<List<Template>>("templates") as? ApiResult.Ok)?.data.orEmpty() else emptyList()
        if (me is ApiResult.Ok && accounts is ApiResult.Ok) {
            val list = accounts.data
            options = FormOptions(me.data, list, (categories as? ApiResult.Ok)?.data.orEmpty(), (tags as? ApiResult.Ok)?.data.orEmpty(), templates, (api.get<List<Card>>("cards") as? ApiResult.Ok)?.data.orEmpty())
            // a new transaction starts in the default account (or the first one), with its currency's rate and usual way of
            // paying; an edit keeps what the transaction has
            val start = list.firstOrNull { it.id == me.data.defaultAccountId } ?: list.firstOrNull { !it.isLiability } ?: list.firstOrNull()
            if (editing == null && initial == null && start != null) form = form.copy(accountId = start.id, rate = tidyRate(start.exchangeRate), method = suggestedMethod(start.group))
            // a form started from somewhere (repaying a card) that has no source account yet takes an everyday one
            if (editing == null && initial != null && initial.accountId == null) {
                list.firstOrNull { !it.isLiability && it.id != initial.toAccountId }?.let { form = form.copy(accountId = it.id, rate = tidyRate(it.exchangeRate), method = suggestedMethod(it.group)) }
            }
        } else {
            loadError = (me as? ApiResult.Failed)?.message ?: (accounts as? ApiResult.Failed)?.message ?: "Could not load your accounts."
        }
    }

    // [another] keeps the form open for the next entry (same account, category, vendor and way of paying; the amount and note cleared)
    fun save(o: FormOptions, another: Boolean) {
        val base = o.me.baseCurrency
        val problem = form.problem(o.accounts, base)
        if (problem != null) {
            // the same message as a toast, with the field outlined
            errorField = problem.field; error = null
            scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
            return
        }
        // nothing changed in an edit: just close
        val patch = if (editing != null && before != null) form.patchJson(before, o.accounts, base) else null
        if (patch != null && patch.isEmpty()) { onClose(); return }
        busy = true; error = null; errorField = null
        scope.launch {
            val result = if (editing != null && patch != null) api.patchJson<Transaction>("transactions/${editing.id}", patch.toString())
            else api.postJson<Transaction>("transactions", form.toJson(o.accounts, base).toString())
            when (val r = result) {
                is ApiResult.Ok -> {
                    val problem = if (editing == null) attachPending(api, r.data.id, pendingFiles.toList(), pendingLinks.toList()) else null
                    pendingFiles.clear(); pendingLinks.clear()
                    if (problem != null) snackbar.showSnackbar(problem)
                    if (another) {
                    onAdded?.invoke()
                    form = seedAfterSave(form); busy = false
                    snackbar.currentSnackbarData?.dismiss()
                    launch { snackbar.showSnackbar("Saved. Ready for the next one.") }
                    } else onSaved()
                }
                is ApiResult.Failed -> {
                    error = r.message; busy = false
                    errorField = fieldOf(r.fields.keys.firstOrNull())
                    snackbar.currentSnackbarData?.dismiss()
                    launch { snackbar.showSnackbar(r.message.lines().first()) }
                }
            }
        }
    }

    androidx.compose.runtime.CompositionLocalProvider(LocalApi provides api) { Dialog(onDismissRequest = { if (!busy) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = {
                TopAppBar(
                    title = { Text((if (editing == null) "New " else "Edit ") + (TYPES.first { it.first == form.type }.second.lowercase())) },
                    navigationIcon = { IconButton(onClick = onClose, enabled = !busy) { Icon(Icons.Outlined.Close, "Close") } },
                    actions = {
                        // starting from a saved template, and saving what is on the form as one (a new transaction only)
                        if (editing == null && options != null) {
                            if (options?.templates?.isNotEmpty() == true) IconButton(onClick = { pickingTemplate = true }, enabled = !busy) { Icon(Icons.Outlined.Bookmark, "Start from a template") }
                            IconButton(onClick = { savingTemplate = true }, enabled = !busy) { Icon(Icons.Outlined.BookmarkAdd, "Save as a template") }
                        }
                    },
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
                    o, if (editing != null) "Save changes" else "Save", form, { errorField = null; form = it }, error, errorField, busy, Modifier.padding(padding),
                    extra = if (editing == null) ({
                        PendingReceipts(pendingFiles, pendingLinks, busy, onProblem = { m -> scope.launch { snackbar.showSnackbar(m) } }, onAddLink = { addingLink = true })
                    }) else null,
                    onSave = { save(o, false) },
                    onSaveAnother = if (editing == null && onAdded != null) ({ save(o, true) }) else null,
                )
            }
        }
        val o = options
        if (pickingTemplate && o != null) PickerSheet(
            title = "Start from a template", anyLabel = null, entries = o.templates.map { Ref(it.id, it.name) }, selectedId = null,
            searchable = o.templates.size > 8, allowCreate = false, detail = { r -> o.templates.firstOrNull { it.id == r.id }?.let(::templateSummary) },
            onQuery = null,
            onPick = { r ->
                pickingTemplate = false
                o.templates.firstOrNull { it.id == r?.id }?.let { t ->
                    val f = formFromTemplate(t, o.accounts)
                    // a template with no account of its own keeps the one the form already has
                    form = if (f.accountId != null) f else f.copy(accountId = form.accountId, rate = form.rate)
                    errorField = null
                }
            },
            onDismiss = { pickingTemplate = false },
        )
        if (addingLink) AddLinkDialog(pendingLinks.size, onClose = { addingLink = false }, onAdd = { url, title -> addingLink = false; pendingLinks += url to title })
        if (savingTemplate && o != null) SaveTemplateDialog(
            api, form, o.accounts, onClose = { savingTemplate = false },
            onSaved = { savingTemplate = false; scope.launch { snackbar.showSnackbar("Template saved.") } },
        )
    } }
}

/** Names the form as it stands and saves it as a template: what is empty is left out, so the template does not fill it. */
@Composable
private fun SaveTemplateDialog(api: Api, form: AddForm, accounts: List<Account>, onClose: () -> Unit, onSaved: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    androidx.compose.material3.AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Save as a template") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("It will fill in the type, account, category, vendor, way of paying, tags and note, and the amount if you typed one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CompactField(name, { name = it; error = null }, "Name, for example Weekly shop", enabled = !busy, isError = error != null)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = templateNameProblem(name)
                if (error != null) return@TextButton
                busy = true
                scope.launch {
                    when (val r = api.postJson<Template>("templates", form.toTemplateJson(name, accounts).toString())) {
                        is ApiResult.Ok -> onSaved()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

@Composable
private fun typeTint(type: String): Color = when (type) {
    "income" -> ChartColors.IncomeLight
    "transfer" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.error
}

@Composable
private fun Form(o: FormOptions, saveLabel: String, form: AddForm, onForm: (AddForm) -> Unit, error: String?, errorField: FormField?, busy: Boolean, modifier: Modifier, onSave: () -> Unit, onSaveAnother: (() -> Unit)? = null, extra: (@Composable () -> Unit)? = null) {
    val base = o.me.baseCurrency
    val account = o.accounts.firstOrNull { it.id == form.accountId }
    val toAccount = o.accounts.firstOrNull { it.id == form.toAccountId }
    val currency = account?.currency ?: base
    val foreign = form.type != "transfer" && currency != base
    val crossCurrency = form.type == "transfer" && account != null && toAccount != null && account.currency != toAccount.currency
    val tint = typeTint(form.type)
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }

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
                // with items the amount is their total: it is shown, not typed
                if (form.splitOn && form.type != "transfer") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MoneyText(form.effectiveAmount(), currency, style = MaterialTheme.typography.titleLarge)
                        Text("  total of the items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else CompactField(
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
                    // built from the form as it is now: a function reference to a local helper kept an older copy of the form
                    onPick = { r -> o.accounts.firstOrNull { it.id == r?.id }?.let { a -> onForm(form.withAccount(a)) } },
                )
                // a card spends from its own account: picking one sets the account and the way of paying (an expense only)
                val cardChoices = cardsForForm(o.cards, form.accountId)
                if (form.type == "expense" && o.cards.isNotEmpty()) PickerField(
                    title = "Card", value = o.cards.firstOrNull { it.id == form.cardId }?.let { Ref(it.id, it.text()) }, placeholder = "Card (optional)", anyLabel = "No card",
                    entries = cardChoices.map { Ref(it.id, it.text()) },
                    detail = { r -> cardChoices.firstOrNull { it.id == r.id }?.account?.name },
                    onPick = { r -> val c = cardChoices.firstOrNull { it.id == r?.id }; onForm(if (c == null) form.copy(cardId = null) else form.withCard(c, o.accounts)) },
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

            if (form.type != "transfer") {
                // with items each item has its own category, and the transaction takes the biggest item's
                if (!form.splitOn) Section("Category", Icons.Outlined.Category, Accents.getValue("amber")) {
                    PickerField(
                        isError = errorField == FormField.Category,
                        title = "Category", value = form.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Choose or type a category",
                        anyLabel = null, searchable = true, allowCreate = true,
                        entries = o.categories.map { Ref(it.id, it.name) },
                        onPick = { r -> onForm(form.copy(category = r?.name ?: "")) },
                    )
                }
                VendorSection(form, onForm)
                Section("Items", Icons.Outlined.ReceiptLong, Accents.getValue("orange")) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text("Split by items", style = MaterialTheme.typography.bodyMedium)
                            Text("List what was bought, each with its own category and price. The items make the amount.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(
                            checked = form.splitOn, enabled = !busy,
                            onCheckedChange = { on -> onForm(form.copy(splitOn = on, items = if (on && form.items.isEmpty()) listOf(newItem(), newItem()) else form.items)) },
                        )
                    }
                    if (form.splitOn) ItemsEditor(form, onForm, o.categories, currency, busy)
                }
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
            Section("Location", Icons.Outlined.LocationOn, Accents.getValue("pink")) {
                // where it happened, marked on a map; the Places screen shows where spending went
                val api = LocalApi.current ?: return@Section
                var marking by remember { mutableStateOf(false) }
                val marked = form.latitude.isNotBlank() && form.longitude.isNotBlank()
                if (!marked) OutlinedButton(onClick = { marking = true }, enabled = !busy, shapes = ButtonDefaults.shapes()) {
                    Icon(Icons.Outlined.LocationOn, null, Modifier.padding(end = 6.dp)); Text("Add location")
                } else Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TintChip(Accents.getValue("pink"), selected = true, onClick = { marking = true }, label = { Text(app.maalu.data.placeLabel(form.place, form.latitude, form.longitude), maxLines = 1) }, modifier = Modifier.weight(1f, fill = false))
                    IconButton(onClick = { onForm(form.copy(latitude = "", longitude = "", place = "")) }, enabled = !busy) { Icon(Icons.Outlined.Close, "Remove the location") }
                }
                if (marking) LocationDialog(
                    api, initial = if (marked) Spot(form.latitude, form.longitude, form.place) else null,
                    onClose = { marking = false },
                    onDone = { spot -> marking = false; onForm(if (spot == null) form.copy(latitude = "", longitude = "", place = "") else form.copy(latitude = spot.latitude, longitude = spot.longitude, place = spot.place)) },
                )
            }
            extra?.invoke()
            Box(Modifier.padding(bottom = 8.dp))
        }

        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            Button(onClick = onSave, enabled = !busy, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) {
                Text(if (busy) "Saving…" else saveLabel)
            }
            if (onSaveAnother != null) OutlinedButton(onClick = onSaveAnother, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("Save and add another") }
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

/** The vendor, picked from your own vendors; picking one fills its usual category and tags into what is still empty. */
@Composable
private fun VendorSection(form: AddForm, onForm: (AddForm) -> Unit) {
    val api = LocalApi.current ?: return
    Section("Vendor", Icons.Outlined.Storefront, Accents.getValue("orange")) {
        VendorPickerField(api, form.vendor, onPick = { name, picked -> onForm(if (picked != null) form.withVendor(picked) else form.copy(vendor = name)) })
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

/** Receipts and links picked on a form for a transaction that is not saved yet: listed here, removable, and sent after it is saved. */
@Composable
private fun PendingReceipts(files: MutableList<PickedFile>, links: MutableList<Pair<String, String>>, busy: Boolean, onProblem: (String) -> Unit, onAddLink: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Receipts and links", style = MaterialTheme.typography.titleSmall)
        files.forEachIndexed { i, f ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("${f.name} · ${humanSize(f.bytes.size.toLong())}", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                TextButton(onClick = { files.removeAt(i) }, enabled = !busy) { Text("Remove") }
            }
        }
        links.forEachIndexed { i, (url, title) ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(title.ifBlank { url }, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                TextButton(onClick = { links.removeAt(i) }, enabled = !busy) { Text("Remove") }
            }
        }
        AddReceiptButtons(
            enabled = !busy, onProblem = onProblem, onLink = onAddLink,
            onFile = { f ->
                val problem = attachmentProblem(f.bytes.size.toLong(), files.size)
                if (problem != null) onProblem(problem) else files += f
            },
        )
    }
}

/** Sends the receipts and links picked on the form to the transaction that was just made. Returns a sentence about what did not go up, or null. */
private suspend fun attachPending(api: Api, id: String, files: List<PickedFile>, links: List<Pair<String, String>>): String? {
    val failed = mutableListOf<String>()
    for (f in files) if (api.upload<Attachment>("transactions/$id/attachments", f.name, f.bytes) is ApiResult.Failed) failed += f.name
    for ((url, title) in links) if (api.postJson<TxLink>("transactions/$id/links", linkJson(url, title).toString()) is ApiResult.Failed) failed += title.ifBlank { url }
    return if (failed.isEmpty()) null else "Saved, but could not attach: ${failed.joinToString(", ")}. Add them from the transaction."
}

/** The item-by-item table: a GST choice, then a card per item (name, quantity, price each, category and its line total) and the total. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ItemsEditor(form: AddForm, onForm: (AddForm) -> Unit, categories: List<CategoryItem>, currency: String, busy: Boolean) {
    val lines = form.lines()
    // changing how GST applies recalculates every row from its typed price
    fun unlocked(rows: List<ItemRow>) = rows.map { it.copy(lockedAmount = null, lockedTax = null) }
    fun edit(key: String, change: (ItemRow) -> ItemRow) = onForm(form.copy(items = form.items.map { if (it.key == key) change(it) else it }))
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TaxMode.entries.forEach { m -> TintChip(paletteTint(m.ordinal), form.taxMode == m, { onForm(form.copy(taxMode = m, items = unlocked(form.items))) }, { Text(m.label) }) }
        }
        if (form.taxMode != TaxMode.None) CompactField(
            form.taxRate, { onForm(form.copy(taxRate = cleanAmount(it), items = unlocked(form.items))) }, "GST rate (%), for example 8",
            keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy,
        )
        form.items.forEachIndexed { i, row ->
            androidx.compose.runtime.key(row.key) {
                androidx.compose.material3.Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            CompactField(row.name, { v -> edit(row.key) { it.copy(name = v.take(200)) } }, "Item", Modifier.weight(1f), enabled = !busy)
                            androidx.compose.material3.IconButton(onClick = { onForm(form.copy(items = form.items.filter { it.key != row.key })) }, enabled = !busy && form.items.size > 1) {
                                androidx.compose.material3.Icon(Icons.Outlined.Close, "Remove item ${i + 1}")
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CompactField(row.quantity, { v -> edit(row.key) { it.copy(quantity = cleanAmount(v), lockedAmount = null, lockedTax = null) } }, "Qty", Modifier.weight(0.35f), keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy)
                            CompactField(row.price, { v -> edit(row.key) { it.copy(price = cleanAmount(v), lockedAmount = null, lockedTax = null) } }, "Price each", Modifier.weight(0.65f), keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, suffix = currency)
                        }
                        PickerField(
                            title = "Category", value = row.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Category",
                            anyLabel = null, searchable = true, allowCreate = true, entries = categories.map { Ref(it.id, it.name) },
                            onPick = { r -> edit(row.key) { it.copy(category = r?.name ?: "") } },
                        )
                        val line = lines[i]
                        Text(
                            if (line == null) "Enter quantity and price" else formatMoney(line.amount.toPlainString(), currency) + (line.tax?.let { " (GST ${formatMoney(it.toPlainString(), currency)})" } ?: ""),
                            style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End),
                        )
                    }
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = { onForm(form.copy(items = form.items + newItem())) }, enabled = !busy) { Text("Add item") }
            Spacer(Modifier.weight(1f))
            Text("Total ", style = MaterialTheme.typography.bodyMedium)
            MoneyText(splitTotal(lines).toPlainString(), currency, style = MaterialTheme.typography.titleSmall)
        }
    }
}
