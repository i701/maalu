@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Account
import app.maalu.data.EmailStatus
import app.maalu.data.EndedSessions
import app.maalu.data.NumberPrefs
import app.maalu.data.Ref
import app.maalu.data.SessionRow
import app.maalu.data.UserMe
import app.maalu.data.defaultAccountJson
import app.maalu.data.describeDevice
import app.maalu.data.groupLabel
import app.maalu.data.switchJson
import app.maalu.ui.components.PickerField
import kotlinx.serialization.json.JsonObject
import kotlinx.coroutines.launch

/**
 * Settings: preferences, notifications and security. Security is whether two-factor sign-in is on, and the flows to turn it on (a key or QR for an
 * authenticator app, a code to confirm, recovery codes shown once), turn it off, or make new recovery codes.
 */
@Composable
fun SettingsScreen(api: Api) {
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var me by remember { mutableStateOf<UserMe?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var settingUp by remember { mutableStateOf(false) }
    var confirming by remember { mutableStateOf<ConfirmAction?>(null) }
    var codes by remember { mutableStateOf<List<String>?>(null) }
    // what to say once the recovery codes have been saved
    var afterCodes by remember { mutableStateOf("") }
    var changingPassword by remember { mutableStateOf(false) }
    var accounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var sessions by remember { mutableStateOf<List<SessionRow>>(emptyList()) }
    var emailOn by remember { mutableStateOf<EmailStatus?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<UserMe>("users/me")) {
            is ApiResult.Ok -> { me = r.data; error = null; NumberPrefs.short = r.data.compactNumbers }
            is ApiResult.Failed -> error = r.message
        }
        // the rest is extra: a failure leaves that card empty rather than the whole screen
        (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.let { accounts = it.data.filter { a -> !a.isLiability } }
        (api.get<List<SessionRow>>("auth/sessions") as? ApiResult.Ok)?.let { sessions = it.data }
        (api.get<EmailStatus>("email/status") as? ApiResult.Ok)?.let { emailOn = it.data }
        refreshing = false
    }

    /** Changes one setting at once on screen, asks the server, and puts it back with a message if that fails. */
    fun save(change: (UserMe) -> UserMe, body: JsonObject) {
        val before = me ?: return
        me = change(before)
        scope.launch {
            when (val r = api.patchJson<UserMe>("users/me", body.toString())) {
                is ApiResult.Ok -> { me = r.data; NumberPrefs.short = r.data.compactNumbers }
                is ApiResult.Failed -> { me = before; NumberPrefs.short = before.compactNumbers; say(r.message.lines().first()) }
            }
        }
    }

    val user = me
    when {
        error != null && user == null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        user == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    SettingsGroup("Preferences", Icons.Outlined.Tune) {
                        SettingSwitch("Short numbers", "Write amounts of a thousand and over as 1.23K or 4.5M. The full figure is always in the details.", user.compactNumbers) { on ->
                            NumberPrefs.short = on
                            save({ it.copy(compactNumbers = on) }, switchJson("compact_numbers", on))
                        }
                        SettingSwitch("Start from a template", "Offer your saved templates when adding a transaction.", user.startFromTemplate) { on ->
                            save({ it.copy(startFromTemplate = on) }, switchJson("start_from_template", on))
                        }
                        PickerField(
                            title = "Default account", value = accounts.firstOrNull { it.id == user.defaultAccountId }?.let { Ref(it.id, it.name) },
                            placeholder = "No default account", anyLabel = "No default account",
                            entries = accounts.map { Ref(it.id, it.name) },
                            detail = { r -> accounts.firstOrNull { it.id == r.id }?.let { a -> groupLabel(a.group) + " · " + a.currency } },
                            onPick = { r -> save({ it.copy(defaultAccountId = r?.id) }, defaultAccountJson(r?.id)) },
                        )
                        Text("A new transaction starts in this account.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                item {
                    SettingsGroup("Notifications", Icons.Outlined.Notifications) {
                        SettingSwitch("Payments", "A planned payment that is due soon or late, and when the money would run out.", user.notifyPayments) { on -> save({ it.copy(notifyPayments = on) }, switchJson("notify_payments", on)) }
                        SettingSwitch("Budget", "A spending limit that is close or over.", user.notifyBudget) { on -> save({ it.copy(notifyBudget = on) }, switchJson("notify_budget", on)) }
                        SettingSwitch("Goals", "A savings goal you have reached.", user.notifyGoals) { on -> save({ it.copy(notifyGoals = on) }, switchJson("notify_goals", on)) }
                        val mail = emailOn
                        if (mail != null && mail.configured) SettingSwitch("Email me", "A digest to ${user.email} when there is something new.", user.notifyEmail) { on -> save({ it.copy(notifyEmail = on) }, switchJson("notify_email", on)) }
                        else if (mail != null) Text("Email is not set up on this server.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                item { Text("Security", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp)) }
                item {
                    SettingsGroup("Password", Icons.Outlined.Key) {
                        Text("Change it any time. Your other devices are signed out.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Button(onClick = { changingPassword = true }, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.filledTonalButtonColors()) { Text("Change password") }
                    }
                }
                item {
                    TwoFactorCard(
                        on = user.twoFactorEnabled,
                        onSetUp = { settingUp = true },
                        onNewCodes = { confirming = ConfirmAction.NewCodes },
                        onTurnOff = { confirming = ConfirmAction.Disable },
                    )
                }
                item {
                    SettingsGroup("Where you are signed in", Icons.Outlined.Devices) {
                        if (sessions.isEmpty()) Text("Could not load your devices. Pull down to try again.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        else SessionsList(
                            sessions, busy,
                            onEnd = { s ->
                                busy = true
                                scope.launch {
                                    when (val r = api.delete("auth/sessions/${s.id}")) {
                                        is ApiResult.Ok -> { sessions = sessions.filter { it.id != s.id }; say("Signed out ${describeDevice(s.userAgent)}.") }
                                        is ApiResult.Failed -> say(r.message.lines().first())
                                    }
                                    busy = false
                                }
                            },
                            onEndOthers = {
                                busy = true
                                scope.launch {
                                    when (val r = api.postJson<EndedSessions>("auth/sessions/end-others", "{}")) {
                                        is ApiResult.Ok -> { sessions = sessions.filter { it.current }; say("Signed out ${r.data.ended} other device${if (r.data.ended == 1) "" else "s"}.") }
                                        is ApiResult.Failed -> say(r.message.lines().first())
                                    }
                                    busy = false
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    if (changingPassword) ChangePasswordDialog(
        api, twoFactor = user?.twoFactorEnabled == true, onClose = { changingPassword = false },
        onDone = { changingPassword = false; reload++; say("Password changed. Your other devices were signed out.") },
    )
    if (settingUp) TwoFactorSetupScreen(
        api, onClose = { settingUp = false },
        onEnabled = { c -> settingUp = false; afterCodes = "Two-factor is on. Your other devices were signed out."; codes = c; reload++ },
    )
    confirming?.let { action ->
        ConfirmSecondFactorDialog(
            api, action, onClose = { confirming = null },
            onDone = { c ->
                confirming = null; reload++
                if (c == null) scope.launch { snackbar?.showSnackbar("Two-factor is off. Your other devices were signed out.") }
                else { afterCodes = "New recovery codes made. The old ones no longer work."; codes = c.recoveryCodes }
            },
        )
    }
    codes?.let { c ->
        RecoveryCodesDialog(c, onDone = { codes = null; scope.launch { snackbar?.showSnackbar(afterCodes) } })
    }
}

@Composable
private fun TwoFactorCard(on: Boolean, onSetUp: () -> Unit, onNewCodes: () -> Unit, onTurnOff: () -> Unit) {
    val tint = MaterialTheme.colorScheme.onSurfaceVariant
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainerHighest), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Security, null, tint = tint)
                }
                Column(Modifier.weight(1f)) {
                    Text("Two-factor sign-in", style = MaterialTheme.typography.titleMedium)
                    Text(if (on) "On" else "Off", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(
                if (on) "Signing in asks for a code from your authenticator app as well as your password. Recovery codes work if you lose your phone."
                else "Add a second step to signing in: a 6-digit code from an authenticator app, so a stolen password alone is not enough.",
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (on) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onNewCodes, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Text("New recovery codes") }
                OutlinedButton(onClick = onTurnOff, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Turn off") }
            } else Button(onClick = onSetUp, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) { Text("Set up two-factor") }
        }
    }
}
