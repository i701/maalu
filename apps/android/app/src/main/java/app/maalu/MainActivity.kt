package app.maalu

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import android.graphics.Color
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import app.maalu.data.ThemeMode
import app.maalu.data.ThemeStore
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
            val themes = remember { ThemeStore(applicationContext) }
            val themeScope = rememberCoroutineScope()
            val mode by themes.mode.collectAsState(initial = ThemeMode.System)
            val dark = when (mode) {
                ThemeMode.System -> isSystemInDarkTheme()
                ThemeMode.Light -> false
                ThemeMode.Dark -> true
            }
            // status and navigation bar icons follow the chosen theme, not only the phone's
            DisposableEffect(dark) {
                enableEdgeToEdge(
                    statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT) { dark },
                    navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT) { dark },
                )
                onDispose {}
            }
            MaaluTheme(darkTheme = dark) {
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
                            Shell(
                                api, current,
                                themeMode = mode,
                                onThemeMode = { themeScope.launch { themes.save(it) } },
                                onSignOut = { scope.launch { api.post("auth/logout"); signedOut() } },
                            )
                        }
                    }
                }
            }
        }
    }
}
