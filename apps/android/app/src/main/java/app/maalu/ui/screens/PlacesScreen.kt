@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.DEFAULT_LAT
import app.maalu.data.DEFAULT_LNG
import app.maalu.data.PlaceRange
import app.maalu.data.PlaceTotal
import app.maalu.data.PlaceTotals
import app.maalu.data.biggestSpend
import app.maalu.data.dayLabel
import app.maalu.data.placeLabel
import app.maalu.data.placeRangeBounds
import app.maalu.data.spotRadius
import app.maalu.ui.components.MapFocus
import app.maalu.ui.components.MapSpot
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.OsmMap
import app.maalu.ui.theme.Accents
import java.time.LocalDate

/**
 * Places: where spending went. Transactions marked on the map are grouped by spot (points within about 100 m), each drawn as a circle sized
 * by what was spent there, with the biggest first in the list below. Tap a circle or a row to pick a spot.
 */
@Composable
fun PlacesScreen(api: Api) {
    var range by rememberSaveable { mutableStateOf(PlaceRange.Month.name) }
    var data by remember { mutableStateOf<PlaceTotals?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var selected by remember { mutableIntStateOf(-1) }
    var focus by remember { mutableStateOf<MapFocus?>(null) }
    val listState = rememberLazyListState()
    val chosen = PlaceRange.valueOf(range)

    LaunchedEffect(range, reload) {
        val bounds = placeRangeBounds(chosen, LocalDate.now())
        val q = if (bounds == null) emptyMap() else mapOf("date_from" to "${bounds.first}", "date_to" to "${bounds.second}")
        when (val r = api.get<PlaceTotals>("transactions/places", q)) {
            is ApiResult.Ok -> { data = r.data; error = null; selected = -1 }
            is ApiResult.Failed -> error = r.message
        }
    }
    LaunchedEffect(selected) { if (selected >= 0) listState.animateScrollToItem(selected) }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp)) {
            ChipRow(PlaceRange.entries, chosen, { it.label }, Accents.getValue("pink")) { data = null; range = it.name }
        }
        ReportState(data, error, onRetry = { error = null; reload++ }) { d ->
            val biggest = biggestSpend(d.places)
            val spots = d.places.map { MapSpot(it.lat, it.lng, spotRadius(it.spent, biggest), placeLabel(it.place, it.latitude, it.longitude)) }
            val primary = MaterialTheme.colorScheme.primary.toArgb()
            Column(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxWidth().height(300.dp).padding(horizontal = 16.dp).clip(RoundedCornerShape(24.dp))) {
                    OsmMap(
                        Modifier.fillMaxSize(), startLat = DEFAULT_LAT, startLng = DEFAULT_LNG, dark = isSystemInDarkTheme(),
                        spots = spots, selected = selected, fitKey = d,
                        focus = focus, spotColor = Accents.getValue("pink").toArgb(), selectedColor = primary, pinColor = primary,
                        onSpotClick = { i -> selected = i; focus = MapFocus(d.places[i].lat, d.places[i].lng, 16.0, (focus?.nonce ?: 0) + 1) },
                    )
                }
                Text(
                    "Map tiles come from OpenStreetMap's public server, which learns which area you look at.",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                )
                if (d.places.isEmpty()) Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.LocationOn, null, Modifier.size(40.dp), tint = Accents.getValue("pink"))
                    Text("Nothing is marked on the map in this range", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Mark where a purchase happened with the pin button when you add or edit a transaction, and it shows up here.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    itemsIndexed(d.places, key = { i, p -> "$i-${p.latitude}-${p.longitude}" }) { i, p ->
                        SpotRow(p, d.currency, selected = i == selected, first = i == 0, last = i == d.places.lastIndex) {
                            selected = i; focus = MapFocus(p.lat, p.lng, 16.0, (focus?.nonce ?: 0) + 1)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SpotRow(p: PlaceTotal, currency: String, selected: Boolean, first: Boolean, last: Boolean, onClick: () -> Unit) {
    MorphTile(
        onClick = onClick, first = first, last = last, modifier = Modifier.fillMaxWidth(),
        color = if (selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(placeLabel(p.place, p.latitude, p.longitude), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    "${p.count} ${if (p.count == 1) "transaction" else "transactions"}" + (p.lastDate?.let { " · last ${dayLabel(it)}" } ?: ""),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            MoneyText(p.spent, currency, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
