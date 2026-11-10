package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.checkServer
import app.maalu.data.normalizeServer
import kotlinx.coroutines.launch

/** First launch: where is your Maalu? Saved only once the server answers. */
@Composable
fun ServerScreen(onConnected: (String) -> Unit) {
    var text by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var checking by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text("Maalu", style = MaterialTheme.typography.displaySmall)
        Text(
            "Enter the address of your Maalu server.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = text,
            onValueChange = { text = it; error = null },
            label = { Text("Server address") },
            placeholder = { Text("maalu.example.com") },
            singleLine = true,
            enabled = !checking,
            isError = error != null,
            supportingText = error?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            enabled = text.isNotBlank() && !checking,
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                val server = normalizeServer(text)
                checking = true
                scope.launch {
                    val problem = checkServer(server)
                    checking = false
                    if (problem == null) onConnected(server) else error = problem
                }
            },
        ) { Text(if (checking) "Connecting…" else "Connect") }
    }
}
