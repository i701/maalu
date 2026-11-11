@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.DEFAULT_LAT
import app.maalu.data.DEFAULT_LNG
import app.maalu.data.PlaceHit
import app.maalu.data.PlaceSearch
import app.maalu.data.formatCoordinates
import app.maalu.data.parseCoordinates
import app.maalu.data.toCoordinate
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.MapFocus
import app.maalu.ui.components.OsmMap
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/** What the picker hands back: both coordinates to six decimals and an optional name; or null to remove the spot. */
data class Spot(val latitude: String, val longitude: String, val place: String)

/**
 * Mark where something happened: tap the map to drop the pin (tap again to move it), look a place up by name (only when you press Search,
 * never as you type), paste "lat, lng" from a map app, or use where you are now. The name is optional. Nothing is looked up by itself.
 */
@Composable
fun LocationDialog(api: Api, initial: Spot?, onClose: () -> Unit, onDone: (Spot?) -> Unit) {
    var pin by remember { mutableStateOf(initial?.let { (it.latitude.toDoubleOrNull() ?: DEFAULT_LAT) to (it.longitude.toDoubleOrNull() ?: DEFAULT_LNG) }) }
    var name by remember { mutableStateOf(initial?.place.orEmpty()) }
    var coords by remember { mutableStateOf(initial?.let { formatCoordinates(it.latitude, it.longitude) }.orEmpty()) }
    var query by remember { mutableStateOf("") }
    var hits by remember { mutableStateOf<List<PlaceHit>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var focus by remember { mutableStateOf<MapFocus?>(null) }
    var nonce by remember { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun place(lat: Double, lng: Double, zoom: Double? = null) {
        pin = lat to lng
        coords = formatCoordinates(toCoordinate(lat), toCoordinate(lng))
        if (zoom != null) focus = MapFocus(lat, lng, zoom, ++nonce)
    }
    fun say(text: String) { scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(text) } }

    /** Looks the typed text up (only when asked: the button or the keyboard's search key, never as you type). */
    fun runSearch() {
        if (query.trim().length < 2 || searching) return
        searching = true
        scope.launch {
            val q = buildMap<String, Any> { put("q", query.trim()); pin?.let { put("near_lat", it.first); put("near_lng", it.second) } }
            when (val r = api.get<PlaceSearch>("places/search", q)) {
                is ApiResult.Ok -> { hits = r.data.results; if (hits.isEmpty()) say("Nothing found for that.") }
                is ApiResult.Failed -> say(r.message.lines().first())
            }
            searching = false
        }
    }

    val askLocation = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (!granted) say("Allow location to use where you are, or tap the map instead.")
        else lastKnown(context)?.let { place(it.first, it.second, 17.0) } ?: say("Could not find where you are. Tap the map instead.")
    }

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = { TopAppBar(title = { Text("Mark the spot") }, navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Close") } }) },
        ) { padding ->
            Column(Modifier.padding(padding).fillMaxSize().imePadding()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(1f)) { CompactField(query, { query = it }, "Search for a place", keyboard = KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Search), actions = androidx.compose.foundation.text.KeyboardActions(onSearch = { runSearch() })) }
                    Button(enabled = query.trim().length >= 2 && !searching, shapes = ButtonDefaults.shapes(), onClick = ::runSearch) { Icon(Icons.Outlined.Search, "Search") }
                }
                if (hits.isNotEmpty()) Surface(Modifier.fillMaxWidth().padding(horizontal = 16.dp), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                    Column {
                        hits.forEach { h ->
                            TextButton(
                                onClick = {
                                    hits = emptyList()
                                    h.latitude.toDoubleOrNull()?.let { la -> h.longitude.toDoubleOrNull()?.let { lo -> place(la, lo, 17.0) } }
                                    if (name.isBlank()) name = h.name.take(100)
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) { Column(Modifier.fillMaxWidth()) { Text(h.name, style = MaterialTheme.typography.bodyMedium); Text(h.address, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1) } }
                        }
                    }
                }
                val primary = MaterialTheme.colorScheme.primary.toArgb()
                Box(Modifier.weight(1f).fillMaxWidth().padding(top = 6.dp)) {
                    OsmMap(
                        Modifier.fillMaxSize(), startLat = pin?.first ?: DEFAULT_LAT, startLng = pin?.second ?: DEFAULT_LNG, startZoom = if (pin != null) 16.0 else 15.0,
                        dark = isSystemInDarkTheme(), pin = pin, focus = focus,
                        spotColor = Accents.getValue("pink").toArgb(), selectedColor = primary, pinColor = primary,
                        onTap = { la, lo -> place(la, lo) },
                    )
                    if (pin == null) Surface(Modifier.align(Alignment.TopCenter).padding(12.dp), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.92f)) {
                        Text("Tap the map to drop the pin", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                    }
                }
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CompactField(name, { name = it.take(100) }, "Name of the place (optional)")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.weight(1f)) {
                            CompactField(
                                coords, { coords = it; parseCoordinates(it)?.let { (la, lo) -> pin = la to lo; focus = MapFocus(la, lo, 16.0, ++nonce) } },
                                "Or paste: 4.1755, 73.5093", isError = coords.isNotBlank() && parseCoordinates(coords) == null && pin == null,
                            )
                        }
                        OutlinedButton(
                            onClick = {
                                if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED)
                                    lastKnown(context)?.let { place(it.first, it.second, 17.0) } ?: say("Could not find where you are. Tap the map instead.")
                                else askLocation.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                            },
                            shapes = ButtonDefaults.shapes(),
                        ) { Icon(Icons.Outlined.MyLocation, null, Modifier.padding(end = 6.dp)); Text("Where I am") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (initial != null) OutlinedButton(onClick = { onDone(null) }, shapes = ButtonDefaults.shapes()) { Text("Remove") }
                        Button(
                            onClick = { pin?.let { onDone(Spot(toCoordinate(it.first), toCoordinate(it.second), name.trim())) } },
                            enabled = pin != null, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f),
                        ) { Icon(Icons.Outlined.LocationOn, null, Modifier.padding(end = 6.dp)); Text("Use this spot") }
                    }
                }
            }
        }
    }
}

/** The phone's last known position (the location is read once and not kept), or null. */
@SuppressLint("MissingPermission")
private fun lastKnown(context: Context): Pair<Double, Double>? {
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
    val best = lm.getProviders(true).mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time } ?: return null
    return best.latitude to best.longitude
}
