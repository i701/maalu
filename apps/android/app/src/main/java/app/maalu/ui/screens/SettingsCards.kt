@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.SessionRow
import app.maalu.data.codeProblem
import app.maalu.data.codeToSend
import app.maalu.data.describeDevice
import app.maalu.data.formatAgo
import app.maalu.data.passwordJson
import app.maalu.data.passwordProblem
import app.maalu.ui.components.CompactField
import kotlinx.coroutines.launch

/** A plain card with an icon tile, a title and room for rows. */
@Composable
fun SettingsGroup(title: String, icon: ImageVector, content: @Composable () -> Unit) {
    // calm on purpose: Settings is plain surfaces, with no accent colours
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainerHighest), contentAlignment = Alignment.Center) { Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                Text(title, style = MaterialTheme.typography.titleMedium)
            }
            content()
        }
    }
}

/** A label, a line of help and a switch. */
@Composable
fun SettingSwitch(title: String, help: String, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(help, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChange, enabled = enabled)
    }
}

/**
 * Change the password: the current one, the new one twice and, when two-factor is on, a code (or a recovery code). The other
 * devices are signed out by the server, which this device stays on.
 */
@Composable
fun ChangePasswordDialog(api: Api, twoFactor: Boolean, onClose: () -> Unit, onDone: () -> Unit) {
    var current by remember { mutableStateOf("") }
    var new by remember { mutableStateOf("") }
    var again by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var recovery by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val pw = KeyboardOptions(keyboardType = KeyboardType.Password)
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Change password") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Your other devices are signed out when it changes.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CompactField(current, { current = it; error = null }, "Current password", keyboard = pw, enabled = !busy, hidden = true)
                CompactField(new, { new = it; error = null }, "New password (8 or more characters)", keyboard = pw, enabled = !busy, hidden = true)
                CompactField(again, { again = it; error = null }, "New password again", keyboard = pw, enabled = !busy, hidden = true)
                if (twoFactor) {
                    if (recovery) CompactField(code, { code = it.take(14); error = null }, "Recovery code", keyboard = KeyboardOptions(keyboardType = KeyboardType.Ascii), enabled = !busy)
                    else Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { app.maalu.ui.components.OtpInput(code, { code = it; error = null }, enabled = !busy, isError = false) }
                    TextButton(onClick = { recovery = !recovery; code = ""; error = null }, enabled = !busy) { Text(if (recovery) "Use an authenticator code" else "Use a recovery code instead") }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = passwordProblem(current, new, again)
                if (error != null) return@TextButton
                val send = if (twoFactor) codeToSend(code, allowRecovery = recovery).also { if (it == null) error = codeProblem(code, recovery) } else null
                if (twoFactor && send == null) return@TextButton
                busy = true
                scope.launch {
                    when (val r = api.postJsonUnit("auth/password", passwordJson(current, new, send).toString())) {
                        is ApiResult.Ok -> onDone()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Working…" else "Change password") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

/** Where the person is signed in: this device first, a Sign out on each other one and one to leave them all. */
@Composable
fun SessionsList(sessions: List<SessionRow>, busy: Boolean, onEnd: (SessionRow) -> Unit, onEndOthers: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        sessions.forEach { s ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(describeDevice(s.userAgent) + if (s.current) " · this device" else "", style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "Last used ${formatAgo(s.lastUsedAt)}" + (s.ipAddress?.let { " · $it" } ?: ""),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (!s.current) TextButton(onClick = { onEnd(s) }, enabled = !busy) { Text("Sign out", color = MaterialTheme.colorScheme.error) }
            }
        }
        if (sessions.count { !it.current } > 0) TextButton(onClick = onEndOthers, enabled = !busy) { Text("Sign out all other devices", color = MaterialTheme.colorScheme.error) }
    }
}
