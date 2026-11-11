package app.maalu.ui.components

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.view.MotionEvent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Overlay
import org.osmdroid.views.overlay.TilesOverlay
import java.io.File

/** A circle on the map: where, how big (dp) and what it is called. */
data class MapSpot(val lat: Double, val lng: Double, val radiusDp: Float, val label: String = "")

/** Move the map to a spot. A new [nonce] asks again, even for the same spot. */
data class MapFocus(val lat: Double, val lng: Double, val zoom: Double, val nonce: Int)

/**
 * An OpenStreetMap map (osmdroid) in Compose: circles for [spots], a pin for a chosen point, a tap to choose one ([onTap]) and to
 * select a circle ([onSpotClick]). Tiles come from OpenStreetMap's public server, which learns which area is looked at; they are cached on
 * the phone. [colors] are ARGB ints for the circles, the selected circle and the pin.
 */
@Composable
fun OsmMap(
    modifier: Modifier = Modifier,
    startLat: Double,
    startLng: Double,
    startZoom: Double = 12.0,
    dark: Boolean = false,
    spots: List<MapSpot> = emptyList(),
    selected: Int = -1,
    pin: Pair<Double, Double>? = null,
    fitKey: Any? = null,
    focus: MapFocus? = null,
    spotColor: Int,
    selectedColor: Int,
    pinColor: Int,
    onSpotClick: (Int) -> Unit = {},
    onTap: ((Double, Double) -> Unit)? = null,
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val map = remember { createMap(context) }
    DisposableEffect(lifecycle, map) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) { Lifecycle.Event.ON_RESUME -> map.onResume(); Lifecycle.Event.ON_PAUSE -> map.onPause(); else -> {} }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); map.onDetach() }
    }
    var lastFit: Any? = remember { Any() }
    var lastFocus: Int = remember { -1 }
    AndroidView(
        // the map draws its tiles over its whole canvas: clip it to its own box so it cannot cover what is around it
        modifier = modifier.clipToBounds(),
        factory = {
            map.controller.setZoom(startZoom)
            map.controller.setCenter(GeoPoint(startLat, startLng))
            map
        },
        update = { m ->
            m.overlayManager.tilesOverlay.setColorFilter(if (dark) TilesOverlay.INVERT_COLORS else null)
            m.overlays.clear()
            if (onTap != null) m.overlays.add(MapEventsOverlay(object : MapEventsReceiver {
                override fun singleTapConfirmedHelper(p: GeoPoint): Boolean { onTap(p.latitude, wrap(p.longitude)); return true }
                override fun longPressHelper(p: GeoPoint): Boolean = false
            }))
            m.overlays.add(SpotsOverlay(spots, selected, spotColor, selectedColor, m.context.resources.displayMetrics.density, onSpotClick))
            pin?.let { m.overlays.add(PinOverlay(it.first, it.second, pinColor, m.context.resources.displayMetrics.density)) }
            if (fitKey != lastFit) {
                lastFit = fitKey
                if (spots.size > 1) {
                    val box = BoundingBox.fromGeoPoints(spots.map { GeoPoint(it.lat, it.lng) })
                    m.post { m.zoomToBoundingBox(box, false, (48 * m.context.resources.displayMetrics.density).toInt()) }
                } else if (spots.size == 1) { m.controller.setZoom(15.0); m.controller.setCenter(GeoPoint(spots[0].lat, spots[0].lng)) }
            }
            if (focus != null && focus.nonce != lastFocus) {
                lastFocus = focus.nonce
                m.controller.animateTo(GeoPoint(focus.lat, focus.lng), focus.zoom, 600L)
            }
            m.invalidate()
        },
    )
}

private fun wrap(lng: Double): Double = (((lng + 180) % 360) + 360) % 360 - 180

private fun createMap(context: Context): MapView {
    val config = Configuration.getInstance()
    config.userAgentValue = context.packageName
    // tiles are cached in the app's own cache folder (nothing else is written)
    val base = File(context.cacheDir, "osmdroid").apply { mkdirs() }
    config.osmdroidBasePath = base
    config.osmdroidTileCache = File(base, "tiles").apply { mkdirs() }
    return MapView(context).apply {
        setTileSource(TileSourceFactory.MAPNIK)
        setMultiTouchControls(true)
        // the map's own +/- buttons are not needed on a touch screen
        zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
        minZoomLevel = 3.0
    }
}

/** Circles for the spots; a tap near one selects it. */
private class SpotsOverlay(
    private val spots: List<MapSpot>, private val selected: Int, private val color: Int, private val selectedColor: Int,
    private val density: Float, private val onClick: (Int) -> Unit,
) : Overlay() {
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 2f * density }
    private val point = android.graphics.Point()

    override fun draw(canvas: Canvas, map: MapView, shadow: Boolean) {
        if (shadow) return
        spots.forEachIndexed { i, s ->
            map.projection.toPixels(GeoPoint(s.lat, s.lng), point)
            val on = i == selected
            fill.color = (if (on) selectedColor else color) and 0x00FFFFFF or (0x88 shl 24)
            ring.color = if (on) selectedColor else color
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), s.radiusDp * density, fill)
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), s.radiusDp * density, ring)
        }
    }

    override fun onSingleTapConfirmed(e: MotionEvent, map: MapView): Boolean {
        // the nearest circle the finger is inside (the smallest wins, since it is drawn on top of a bigger one)
        var hit = -1; var best = Float.MAX_VALUE
        spots.forEachIndexed { i, s ->
            map.projection.toPixels(GeoPoint(s.lat, s.lng), point)
            val d = Math.hypot((e.x - point.x).toDouble(), (e.y - point.y).toDouble()).toFloat()
            val reach = maxOf(s.radiusDp * density, 20f * density)
            if (d <= reach && s.radiusDp < best) { best = s.radiusDp; hit = i }
        }
        if (hit >= 0) { onClick(hit); return true }
        return false
    }
}

/** A pin: a ring with a dot, centred on the point. */
private class PinOverlay(private val lat: Double, private val lng: Double, private val color: Int, private val density: Float) : Overlay() {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val point = android.graphics.Point()
    override fun draw(canvas: Canvas, map: MapView, shadow: Boolean) {
        if (shadow) return
        map.projection.toPixels(GeoPoint(lat, lng), point)
        val x = point.x.toFloat(); val y = point.y.toFloat()
        paint.style = Paint.Style.FILL; paint.color = 0xFFFFFFFF.toInt(); canvas.drawCircle(x, y, 14f * density, paint)
        paint.color = color; canvas.drawCircle(x, y, 11f * density, paint)
        paint.color = 0xFFFFFFFF.toInt(); canvas.drawCircle(x, y, 4f * density, paint)
    }
}
