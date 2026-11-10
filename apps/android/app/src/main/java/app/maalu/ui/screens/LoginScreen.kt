@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Token
import app.maalu.data.TwoFactorChallenge
import kotlinx.coroutines.launch

/** Email and password, then (when two-factor is on) the 6-digit code or a recovery code. */
@Composable
fun LoginScreen(api: Api, server: String, onSignedIn: (String) -> Unit, onChangeServer: () -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var challenge by rememberSaveable { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun finish(result: ApiResult<Token>) {
        busy = false
        when (result) {
            is ApiResult.Failed -> error = result.message
            is ApiResult.Ok -> {
                val t = result.data
                when {
                    t.accessToken != null -> onSignedIn(t.accessToken)
                    t.twoFactorRequired && t.challengeToken != null -> { challenge = t.challengeToken; error = null }
                    else -> error = "The server's answer was not what the app expected."
                }
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterVertically),
    ) {
        Text("Maalu", style = MaterialTheme.typography.displaySmall)
        Text(server, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        if (challenge == null) {
            OutlinedTextField(
                value = email, onValueChange = { email = it; error = null }, label = { Text("Email") },
                singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            OutlinedTextField(
                value = password, onValueChange = { password = it; error = null }, label = { Text("Password") },
                singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
        } else {
            Text("Enter the code from your authenticator app, or a recovery code.", style = MaterialTheme.typography.bodyLarge)
            OutlinedTextField(
                value = code, onValueChange = { code = it; error = null }, label = { Text("Code") },
                singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
            )
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }

        Button(
            shapes = ButtonDefaults.shapes(),
            enabled = !busy && (if (challenge == null) email.isNotBlank() && password.isNotEmpty() else code.isNotBlank()),
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                busy = true; error = null
                scope.launch {
                    val c = challenge
                    if (c == null) {
                        finish(api.postForm("auth/login", mapOf("username" to email.trim(), "password" to password)))
                    } else {
                        finish(api.postJson("auth/login/2fa", AppJsonEncode(TwoFactorChallenge(c, code.trim()))))
                    }
                }
            },
        ) { Text(if (busy) "Signing in…" else if (challenge == null) "Sign in" else "Verify") }

        TextButton(onClick = { if (challenge != null) { challenge = null; code = "" } else onChangeServer() }, enabled = !busy) {
            Text(if (challenge != null) "Back" else "Use a different server")
        }
    }
}

private fun AppJsonEncode(c: TwoFactorChallenge): String = app.maalu.data.AppJson.encodeToString(TwoFactorChallenge.serializer(), c)
