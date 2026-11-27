@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import app.maalu.ui.components.SaveButtonRoom
import app.maalu.ui.components.FloatingSave
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.components.BackdropPage
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.foundation.layout.ColumnScope
import app.maalu.ui.components.FormSwitchRow
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.runtime.saveable.rememberSaveable
import app.maalu.data.dateLabel
import app.maalu.data.detailsSummary
import app.maalu.data.hasDetails
import app.maalu.ui.components.DisclosureRow
import app.maalu.ui.components.Disclosure
import app.maalu.data.bankBrand
import app.maalu.ui.components.BankAvatar
import app.maalu.ui.components.BigAmountField
import app.maalu.ui.components.FormRow
import app.maalu.ui.components.FormRowStyle
import androidx.compose.material3.Surface
import androidx.compose.foundation.layout.height
import app.maalu.ui.components.elevation
import app.maalu.ui.components.glowTopBarColors
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
import app.maalu.ui.components.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import app.maalu.ui.components.DatePickerDialog
import app.maalu.ui.components.glowDatePickerColors
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
import app.maalu.ui.components.ChoiceChip
import app.maalu.ui.theme.MoneyStyle
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
        BackdropPage {
            Scaffold(
                 containerColor = androidx.compose.ui.graphics.Color.Transparent,
                // above the floating Save button
                snackbarHost = { SnackbarHost(snackbar, Modifier.padding(bottom = SaveButtonRoom)) },
                topBar = {
                    TopAppBar(
                        colors = glowTopBarColors(),
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

/** Each type's own colour, as on iOS: income green, expense red, transfer blue. */
@Composable
private fun typeTint(type: String): Color = when (type) {
    "income" -> ChartColors.IncomeLight
    "transfer" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.error
}

/** Names the form as it stands and saves it as a template: what is empty is left out, so the template does not fill it. */
@Composable
private fun SaveTemplateDialog(api: Api, form: AddForm, accounts: List<Account>, onClose: () -> Unit, onSaved: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    app.maalu.ui.components.AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Save as a template") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("It will fill in the type, account, category, vendor, way of paying, tags and note, and the amount if you typed one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CompactField(name, { name = it; error = null }, "Name", enabled = !busy, isError = error != null, placeholder = "For example Weekly shop")
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(shapes = ButtonDefaults.shapes(), enabled = !busy, onClick = {
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
        dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

@Composable
private fun Form(o: FormOptions, saveLabel: String, form: AddForm, onForm: (AddForm) -> Unit, error: String?, errorField: FormField?, busy: Boolean, modifier: Modifier, onSave: () -> Unit, onSaveAnother: (() -> Unit)? = null, extra: (@Composable () -> Unit)? = null) {
    val base = o.me.baseCurrency
    val account = o.accounts.firstOrNull { it.id == form.accountId }
    val toAccount = o.accounts.firstOrNull { it.id == form.toAccountId }
    val currency = account?.currency ?: base
    val foreign = form.type != "transfer" && currency != base
    val crossCurrency = form.type == "transfer" && account != null && toAccount != null && account.currency != toAccount.currency
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }

    Box(modifier.fillMaxSize().imePadding()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            // what it is
            SegmentedPills(
                options = TYPES,
                selected = form.type,
                onSelect = { value -> onForm(form.copy(type = value, toAccountId = if (value == "transfer") form.toAccountId else null)) },
                tint = { typeTint(it) },
                enabled = !busy,
            )

            if (form.type == "transfer") TransferSlabs(o.accounts, form, onForm, errorField, enabled = !busy)
            else Column(Modifier.fillMaxWidth()) {
                // with items the amount is their total: it is shown, not typed
                if (form.splitOn) Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    MoneyText(form.effectiveAmount(), currency, style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.SemiBold))
                    Text("Total of the items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else BigAmountField(form.amount, { onForm(form.copy(amount = cleanAmount(it))) }, currency, enabled = !busy, isError = errorField == FormField.Amount)
            }

            // what nearly every transaction needs; the rest waits under More details
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                if (form.type != "transfer") {
                    AccountField(o.accounts, account, errorField == FormField.Account) { a -> onForm(form.withAccount(a)) }
                    // with items each item has its own category, and the transaction takes the biggest item's
                    if (!form.splitOn) {
                        PickerField(
                            isError = errorField == FormField.Category,
                            title = "Category", value = form.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Choose a category",
                            anyLabel = null, searchable = true, allowCreate = true,
                            entries = o.categories.map { Ref(it.id, it.name) },
                            onPick = { r -> onForm(form.copy(category = r?.name ?: "")) },
                            row = FormRowStyle("Category", Icons.Outlined.Category),
                        )
                    }
                    VendorSection(form, onForm)
                }
                FormRow(FormRowStyle("Date", Icons.Outlined.CalendarMonth, first = form.type == "transfer", last = true), dateLabel(form.date, LocalDate.now()), "", onClick = { if (!busy) pickingDate = true })
            }
            if (foreign) CompactField(
                form.rate, { onForm(form.copy(rate = cleanAmount(it))) }, "Exchange rate",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == FormField.Rate,
                placeholder = "1 $currency = ? $base",
            )

            // open from the start when something in it is already set (editing, a template), and again when that changes
            val detailsSet = form.hasDetails()
            var detailsOpen by rememberSaveable { mutableStateOf(detailsSet) }
            LaunchedEffect(detailsSet, errorField) { if (detailsSet || errorField == FormField.Items) detailsOpen = true }
            Column {
                DisclosureRow("More details", form.detailsSummary(o.cards.firstOrNull { it.id == form.cardId }?.text()), detailsOpen) { detailsOpen = !detailsOpen }
                Disclosure(detailsOpen) {
                    // three short groups, one line per choice, so it can be read at a glance
                    Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (form.type != "transfer") FieldGroup("Payment") {
                            val cards = form.type == "expense" && o.cards.isNotEmpty()
                            PickerField(
                                title = "Paid by", value = Ref(form.method, PaymentMethodLabels[form.method] ?: form.method), placeholder = "Choose", anyLabel = null,
                                entries = PaymentMethodLabels.map { (value, label) -> Ref(value, label) },
                                onPick = { r -> if (r != null) onForm(form.copy(method = r.id, methodTouched = true)) },
                                row = FormRowStyle("Paid by", Icons.Outlined.Payments, first = true, last = !cards),
                            )
                            // a card spends from its own account: picking one sets the account and the way of paying (an expense only)
                            if (cards) {
                                val cardChoices = cardsForForm(o.cards, form.accountId)
                                PickerField(
                                    title = "Card", value = o.cards.firstOrNull { it.id == form.cardId }?.let { Ref(it.id, it.text()) }, placeholder = "Optional", anyLabel = "No card",
                                    entries = cardChoices.map { Ref(it.id, it.text()) },
                                    detail = { r -> cardChoices.firstOrNull { it.id == r.id }?.account?.name },
                                    onPick = { r -> val c = cardChoices.firstOrNull { it.id == r?.id }; onForm(if (c == null) form.copy(cardId = null) else form.withCard(c, o.accounts)) },
                                    row = FormRowStyle("Card", Icons.Outlined.CreditCard, last = true),
                                )
                            }
                        }

                        FieldGroup("Options") {
                            FormRow(
                                FormRowStyle("Time", Icons.Outlined.Schedule, first = true), form.time, "Optional", onClick = { if (!busy) pickingTime = true },
                                trailing = if (form.time == null) null else ({ IconButton(onClick = { onForm(form.copy(time = null)) }, enabled = !busy) { Icon(Icons.Outlined.Close, "Remove the time") } }),
                            )
                            FormSwitchRow(
                                FormRowStyle("Planned", Icons.Outlined.Event, last = form.type == "transfer"), "Not paid yet, so it isn't counted",
                                form.planned, !busy,
                            ) { onForm(form.copy(planned = it, plannedTouched = true)) }
                            if (form.type != "transfer") {
                                FormSwitchRow(FormRowStyle("Split by items", Icons.Outlined.ReceiptLong, last = true), "A category and price for each item", form.splitOn, !busy) { on ->
                                    onForm(form.copy(splitOn = on, items = if (on && form.items.isEmpty()) listOf(newItem(), newItem()) else form.items))
                                }
                                if (form.splitOn) ItemsEditor(form, onForm, o.categories, currency, busy)
                            }
                        }

                        FieldGroup("Extras") {
                            CompactField(form.note, { onForm(form.copy(note = it.take(500))) }, "Add a note", Modifier.fillMaxWidth().padding(bottom = 8.dp), singleLine = false, enabled = !busy)
                            if (form.type != "transfer" && o.tags.isNotEmpty()) FlowRow(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                o.tags.forEach { tag ->
                                    val on = tag.name in form.tags
                                    ChoiceChip(on, { onForm(form.copy(tags = if (on) form.tags - tag.name else form.tags + tag.name)) }, { Text(tag.name) })
                                }
                            }
                            // where it happened, marked on a map; the Places screen shows where spending went
                            val api = LocalApi.current
                            var marking by remember { mutableStateOf(false) }
                            val marked = form.latitude.isNotBlank() && form.longitude.isNotBlank()
                            FormRow(
                                FormRowStyle("Location", Icons.Outlined.LocationOn, first = true, last = true),
                                if (marked) app.maalu.data.placeLabel(form.place, form.latitude, form.longitude) else null, "Optional",
                                onClick = { if (!busy) marking = true },
                                trailing = if (!marked) null else ({ IconButton(onClick = { onForm(form.copy(latitude = "", longitude = "", place = "")) }, enabled = !busy) { Icon(Icons.Outlined.Close, "Remove the location") } }),
                            )
                            if (marking && api != null) LocationDialog(
                                api, initial = if (marked) Spot(form.latitude, form.longitude, form.place) else null,
                                onClose = { marking = false },
                                onDone = { spot -> marking = false; onForm(if (spot == null) form.copy(latitude = "", longitude = "", place = "") else form.copy(latitude = spot.latitude, longitude = spot.longitude, place = spot.place)) },
                            )
                        }
                        extra?.invoke()
                    }
                }
            }
            // the second way to save is the last thing in the form; only Save floats
            if (onSaveAnother != null) Button(
                onClick = onSaveAnother, enabled = !busy, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth().height(48.dp).elevation(1, CircleShape),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow, contentColor = MaterialTheme.colorScheme.primary),
            ) { Text("Save and add another") }
            // room to scroll the last row clear of the floating button
            Spacer(Modifier.height(SaveButtonRoom))
        }

        FloatingSave(saveLabel, busy, error, onSave, Modifier.align(Alignment.BottomCenter))
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(form.date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(shapes = ButtonDefaults.shapes(), onClick = {
                    state.selectedDateMillis?.let { ms -> onForm(form.withDate(Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate().toString())) }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state, colors = glowDatePickerColors()) }
    }
    if (pickingTime) {
        val state = rememberTimePickerState(is24Hour = true)
        AlertDialog(
            onDismissRequest = { pickingTime = false },
            confirmButton = {
                TextButton(shapes = ButtonDefaults.shapes(), onClick = { onForm(form.copy(time = "%02d:%02d".format(state.hour, state.minute))); pickingTime = false }) { Text("OK") }
            },
            dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = { pickingTime = false }) { Text("Cancel") } },
            text = { TimePicker(state) },
        )
    }
}

/** The vendor, picked from your own vendors; picking one fills its usual category and tags into what is still empty. */
@Composable
private fun VendorSection(form: AddForm, onForm: (AddForm) -> Unit) {
    val api = LocalApi.current ?: return
    VendorPickerField(api, form.vendor, onPick = { name, picked -> onForm(if (picked != null) form.withVendor(picked) else form.copy(vendor = name)) }, row = FormRowStyle("Vendor", Icons.Outlined.Storefront))
}

/** A few related choices under one small heading, their tiles 2dp apart. */
@Composable
private fun FieldGroup(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(title, Modifier.padding(start = 4.dp, bottom = 6.dp), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        content()
    }
}

/** The account as a row with its logo, balance and number, which tell look-alikes apart. */
@Composable
private fun AccountField(accounts: List<Account>, account: Account?, isError: Boolean, onPick: (Account) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val brand = account?.bank?.let(::bankBrand)
    FormRow(
        FormRowStyle("Account", Icons.Outlined.AccountBalance, first = true), account?.name, "Choose an account", onClick = { open = true }, detail = account?.let(::accountDetail),
        isError = isError, leading = brand?.let { { BankAvatar(it) } },
    )
    if (open) PickerSheet(
        title = "Account", anyLabel = null, entries = accounts.map { Ref(it.id, it.name) }, selectedId = account?.id, searchable = false, allowCreate = false,
        detail = { r -> accounts.firstOrNull { it.id == r.id }?.let(::accountDetail) }, onQuery = null,
        onPick = { r -> open = false; accounts.firstOrNull { it.id == r?.id }?.let(onPick) }, onDismiss = { open = false },
    )
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
                TextButton(shapes = ButtonDefaults.shapes(), onClick = { files.removeAt(i) }, enabled = !busy) { Text("Remove") }
            }
        }
        links.forEachIndexed { i, (url, title) ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(title.ifBlank { url }, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                TextButton(shapes = ButtonDefaults.shapes(), onClick = { links.removeAt(i) }, enabled = !busy) { Text("Remove") }
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
            TaxMode.entries.forEach { m -> ChoiceChip(form.taxMode == m, { onForm(form.copy(taxMode = m, items = unlocked(form.items))) }, { Text(m.label) }) }
        }
        if (form.taxMode != TaxMode.None) CompactField(
            form.taxRate, { onForm(form.copy(taxRate = cleanAmount(it), items = unlocked(form.items))) }, "GST rate (%)",
            keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy,
        placeholder = "For example 8")
        form.items.forEachIndexed { i, row ->
            androidx.compose.runtime.key(row.key) {
                androidx.compose.material3.Surface(modifier = Modifier.elevation(2, MaterialTheme.shapes.large), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
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
            TextButton(shapes = ButtonDefaults.shapes(), onClick = { onForm(form.copy(items = form.items + newItem())) }, enabled = !busy) { Text("Add item") }
            Spacer(Modifier.weight(1f))
            Text("Total ", style = MaterialTheme.typography.bodyMedium)
            MoneyText(splitTotal(lines).toPlainString(), currency, style = MaterialTheme.typography.titleSmall)
        }
    }
}
