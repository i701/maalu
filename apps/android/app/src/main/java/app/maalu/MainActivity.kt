package app.maalu

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import app.maalu.data.Api
import app.maalu.data.ServerStore
import app.maalu.data.TokenStore
import app.maalu.ui.screens.LoginScreen
import app.maalu.ui.screens.ServerScreen
import app.maalu.ui.screens.Shell
import app.maalu.ui.theme.MaaluTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaaluTheme {
                Surface {
                    val servers = remember { ServerStore(applicationContext) }
                    val tokens = remember { TokenStore(applicationContext) }
                    val scope = rememberCoroutineScope()

                    // null until the saved values are read, so a signed-in person never sees a login flash
                    var loaded by remember { mutableStateOf(false) }
                    var server by remember { mutableStateOf<String?>(null) }
                    var token by remember { mutableStateOf<String?>(null) }
                    LaunchedEffect(Unit) {
                        server = servers.url.first()
                        token = tokens.token.first()
                        loaded = true
                    }

                    fun signedOut() { token = null; scope.launch { tokens.clear() } }

                    if (!loaded) return@Surface
                    val current = server
                    if (current == null) {
                        ServerScreen(onConnected = { server = it; scope.launch { servers.save(it) } })
                    } else {
                        val api = remember(current) { Api(current, { token }, onSignedOut = ::signedOut) }
                        val t = token
                        if (t == null) {
                            LoginScreen(
                                api, current,
                                onSignedIn = { token = it; scope.launch { tokens.save(it) } },
                                onChangeServer = { server = null; scope.launch { servers.clear() } },
                            )
                        } else {
                            Shell(api, current, onSignOut = {
                                scope.launch { api.post("auth/logout"); signedOut() }
                            })
                        }
                    }
                }
            }
        }
    }
}
