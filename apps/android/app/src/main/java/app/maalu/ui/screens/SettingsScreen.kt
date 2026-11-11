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
import androidx.compose.material.icons.outlined.Security
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
import app.maalu.data.UserMe
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/**
 * Settings, starting with security: whether two-factor sign-in is on, and the flows to turn it on (a key or QR for an
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
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(reload) {
        when (val r = api.get<UserMe>("users/me")) {
            is ApiResult.Ok -> { me = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
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
                item { Text("Security", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp)) }
                item {
                    TwoFactorCard(
                        on = user.twoFactorEnabled,
                        onSetUp = { settingUp = true },
                        onNewCodes = { confirming = ConfirmAction.NewCodes },
                        onTurnOff = { confirming = ConfirmAction.Disable },
                    )
                }
            }
        }
    }

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
    val tint = Accents.getValue(if (on) "green" else "slate")
    Surface(shape = MaterialTheme.shapes.extraLarge, color = tint.copy(alpha = 0.14f)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Security, null, tint = tint)
                }
                Column(Modifier.weight(1f)) {
                    Text("Two-factor sign-in", style = MaterialTheme.typography.titleMedium)
                    Text(if (on) "On" else "Off", style = MaterialTheme.typography.labelMedium, color = if (on) Accents.getValue("green") else MaterialTheme.colorScheme.onSurfaceVariant)
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
