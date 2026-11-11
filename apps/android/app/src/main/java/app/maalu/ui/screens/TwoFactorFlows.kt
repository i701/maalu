@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PersistableBundle
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Dialpad
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.RecoveryCodes
import app.maalu.data.TwoFactorSetup
import app.maalu.data.codeProblem
import app.maalu.data.codeToSend
import app.maalu.data.confirmJson
import app.maalu.data.enableJson
import app.maalu.data.groupSecret
import app.maalu.data.isOtpauthUri
import app.maalu.data.recoveryText
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.OtpInput
import app.maalu.ui.components.QrCode
import app.maalu.ui.components.SecureWindow
import app.maalu.ui.components.Section
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/** Copies text, marked sensitive so Android does not show it in clipboard previews. */
private fun copySecret(context: Context, label: String, text: String) {
    val clip = ClipData.newPlainText(label, text)
    clip.description.extras = PersistableBundle().apply { putBoolean("android.content.extra.IS_SENSITIVE", true) }
    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(clip)
}

/**
 * Turn two-factor on: add Maalu to an authenticator app (open it from here, copy the key, or scan the QR from another
 * device), then type the code it shows. Success hands back the recovery codes, which are shown once.
 */
@Composable
fun TwoFactorSetupScreen(api: Api, onClose: () -> Unit, onEnabled: (List<String>) -> Unit) {
    var setup by remember { mutableStateOf<TwoFactorSetup?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var code by remember { mutableStateOf("") }
    var codeError by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        // asking again before it is confirmed gives the same key, so reopening this is safe
        when (val r = api.postJson<TwoFactorSetup>("auth/2fa/setup", "{}")) {
            is ApiResult.Ok -> setup = r.data
            is ApiResult.Failed -> loadError = r.message
        }
    }

    fun submit(entered: String) {
        if (setup == null || busy) return
        val problem = codeProblem(entered, allowRecovery = false)
        if (problem != null) {
            codeError = true; error = null
            scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem) }
            return
        }
        busy = true; error = null; codeError = false
        scope.launch {
            when (val r = api.postJson<RecoveryCodes>("auth/2fa/enable", enableJson(codeToSend(entered, false)!!).toString())) {
                is ApiResult.Ok -> onEnabled(r.data.recoveryCodes)
                is ApiResult.Failed -> { error = r.message; busy = false; code = ""; launch { snackbar.showSnackbar(r.message.lines().first()) } }
            }
        }
    }

    FormDialog(
        title = "Turn on two-factor", saveLabel = "Turn on", busy = busy, error = error ?: loadError, snackbar = snackbar, onClose = onClose, secure = true,
        onSave = { submit(code) },
    ) {
        val s = setup
        Section("1. Add Maalu to an authenticator app", Icons.Outlined.Key, Accents.getValue("violet")) {
            if (s == null) {
                if (loadError == null) Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                Text("Use any authenticator app, such as Google Authenticator, Aegis or 2FAS.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (isOtpauthUri(s.otpauthUri)) Button(
                    onClick = {
                        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.otpauthUri)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                        catch (e: ActivityNotFoundException) { scope.launch { snackbar.showSnackbar("No authenticator app found. Copy the key instead.") } }
                    },
                    shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                ) { Icon(Icons.Outlined.OpenInNew, null, Modifier.padding(end = 8.dp)); Text("Open in authenticator app") }
                Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Or type this key in by hand", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(groupSecret(s.secret), style = MaterialTheme.typography.titleMedium, fontFamily = FontFamily.Monospace)
                        OutlinedButton(
                            onClick = { copySecret(context, "Authenticator key", s.secret); scope.launch { snackbar.showSnackbar("Key copied") } },
                            shapes = ButtonDefaults.shapes(),
                        ) { Icon(Icons.Outlined.ContentCopy, null, Modifier.padding(end = 8.dp)); Text("Copy key") }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.QrCode2, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Or scan this from another device", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { QrCode(s.otpauthUri, description = "QR code for your authenticator app") }
            }
        }
        Section("2. Enter the code it shows", Icons.Outlined.Dialpad, Accents.getValue("green")) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                OtpInput(code, { code = it; codeError = false }, enabled = !busy && s != null, isError = codeError, onComplete = { submit(it) })
            }
            Text("Turning it on signs you out of your other devices. Next you will get recovery codes: keep them somewhere safe.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** The recovery codes, shown once. Only the button closes it, so they are not lost by a stray tap; the window cannot be screenshotted. */
@Composable
fun RecoveryCodesDialog(codes: List<String>, onDone: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = {},
        properties = DialogProperties(dismissOnClickOutside = false, dismissOnBackPress = false),
        title = { Text("Your recovery codes") },
        text = {
            SecureWindow()
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Each works once in place of an authenticator code, if you lose your phone. They will not be shown again.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        codes.chunked(2).forEach { pair ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                pair.forEach { Text(it, style = MaterialTheme.typography.titleSmall, fontFamily = FontFamily.Monospace, textAlign = TextAlign.Start) }
                            }
                        }
                    }
                }
                OutlinedButton(onClick = { copySecret(context, "Recovery codes", recoveryText(codes)) }, shapes = ButtonDefaults.shapes()) {
                    Icon(Icons.Outlined.ContentCopy, null, Modifier.padding(end = 8.dp)); Text("Copy all")
                }
            }
        },
        confirmButton = { TextButton(onClick = onDone) { Text("I have saved them") } },
    )
}

enum class ConfirmAction { Disable, NewCodes }

/**
 * Asks for the password and a code before a sensitive change to two-factor: turning it off, or making new recovery codes (which
 * stops the old ones working). A recovery code can stand in for the authenticator code. [onDone] gets the new codes, or null.
 */
@Composable
fun ConfirmSecondFactorDialog(api: Api, action: ConfirmAction, onClose: () -> Unit, onDone: (RecoveryCodes?) -> Unit) {
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var recovery by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(if (action == ConfirmAction.Disable) "Turn off two-factor?" else "Make new recovery codes?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    if (action == ConfirmAction.Disable) "Signing in will need only your password again, and your other devices are signed out."
                    else "The old codes stop working. Your other devices are signed out.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                CompactField(password, { password = it; error = null }, "Your password", keyboard = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = !busy, hidden = true)
                if (recovery) CompactField(
                    code, { code = it.take(14); error = null }, "Recovery code",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Ascii), enabled = !busy, isError = error != null,
                ) else Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    OtpInput(code, { code = it; error = null }, enabled = !busy, isError = error != null)
                }
                TextButton(onClick = { recovery = !recovery; code = ""; error = null }, enabled = !busy) { Text(if (recovery) "Use an authenticator code" else "Use a recovery code instead") }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val send = codeToSend(code, allowRecovery = recovery)
                when {
                    password.isEmpty() -> { error = "Enter your password."; return@TextButton }
                    send == null -> { error = codeProblem(code, recovery); return@TextButton }
                }
                busy = true
                scope.launch {
                    val body = confirmJson(password, send!!).toString()
                    when (action) {
                        ConfirmAction.Disable -> when (val r = api.postJsonUnit("auth/2fa/disable", body)) {
                            is ApiResult.Ok -> onDone(null)
                            is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                        }
                        ConfirmAction.NewCodes -> when (val r = api.postJson<RecoveryCodes>("auth/2fa/recovery-codes", body)) {
                            is ApiResult.Ok -> onDone(r.data)
                            is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                        }
                    }
                }
            }) { Text(if (busy) "Working…" else if (action == ConfirmAction.Disable) "Turn off" else "Make new codes", color = if (action == ConfirmAction.Disable) MaterialTheme.colorScheme.error else androidx.compose.ui.graphics.Color.Unspecified) }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
