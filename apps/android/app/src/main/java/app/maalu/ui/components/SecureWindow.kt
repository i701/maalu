package app.maalu.ui.components

import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider

/**
 * Put inside a dialog that shows a secret (an authenticator key, recovery codes): the window cannot be screenshotted
 * or recorded, and does not show in the recent-apps preview.
 */
@Composable
fun SecureWindow() {
    val window = (LocalView.current.parent as? DialogWindowProvider)?.window
    DisposableEffect(window) {
        window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        onDispose { }
    }
}
