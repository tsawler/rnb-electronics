let map;
let view;

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

document.addEventListener("DOMContentLoaded", function (event) {
	init();
	document.getElementById("location").addEventListener('change', function () {
		performSearch();
	})
})

closer.onclick = function () {
	popupOverlay.setPosition(undefined);
	closer.blur();
	return false;
};

const popupOverlay = new ol.Overlay({
	element: container,
	autoPan: true,
	autoPanAnimation: {
		duration: 250
	}
});

function init() {

	// Controls
	const fullScreenControl = new ol.control.FullScreen();
	const zoomSliderControl = new ol.control.ZoomSlider();
	const zoomToExtentControl = new ol.control.ZoomToExtent();

	const nbMiddleLatLon = [-66.2861827, 46.512442];
	const nbMiddleMercator = ol.proj.fromLonLat(nbMiddleLatLon);

	view = new ol.View({
		center: nbMiddleMercator,
		zoom: 7,
		maxZoom: 20,
		minZoom: 2,
	})

	map = new ol.Map({
		view: view,
		layers: [
			new ol.layer.Tile({
				source: new ol.source.OSM(),
				zIndex: 0,
			})
		],
		target: 'js-map',
		keyboardEventTarget: document,
		controls: ol.control.defaults().extend([
			fullScreenControl,
			zoomSliderControl,
			zoomToExtentControl,
		])
	})

	//addMapMarker(map, 45.99639632131496, -66.76388278666946)

	map.addOverlay(popupOverlay);

	map.on("pointermove", function (evt) {
		var hit = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
			return true;
		});
		if (hit) {
			this.getTargetElement().style.cursor = 'pointer';
		} else {
			this.getTargetElement().style.cursor = '';
		}
	});

}

function addMapMarker(m, lat, lng) {
	var vectorLayer = new ol.layer.Vector({
		source: new ol.source.Vector({
			features: [new ol.Feature({
				geometry: new ol.geom.Point(ol.proj.transform([parseFloat(lng), parseFloat(lat)], 'EPSG:4326', 'EPSG:3857')),
			})]
		}),
		style: new ol.style.Style({
			image: new ol.style.Icon({
				anchor: [0.5, 0.5],
				anchorXUnits: "fraction",
				anchorYUnits: "fraction",
				src: "img/pin.svg"
			})
		})
	});

	m.addLayer(vectorLayer);
}


function performSearch() {
	let searchTerm = document.getElementById("location").value;

	fetch('http://' + window.location.hostname + ':8080/electronics?city=' + searchTerm)
		.then(response => response.json())
		.then(data => {
			let locations = data.locations;

			var iconFeatures = [];

			locations.forEach(function (item) {
				// addMapMarker(map, item.lat, item.lng)
				var iconFeature = new ol.Feature({
					type: 'click',
					desc: item.description,
					name: item.store,
					address: item.address,
					geometry: new ol.geom.Point(ol.proj.transform([item.lng, item.lat], 'EPSG:4326', 'EPSG:3857')),
				});
				iconFeatures.push(iconFeature);
			});

			var vectorSource = new ol.source.Vector({
				features: iconFeatures
			});

			var iconStyle = new ol.style.Style({
				image: new ol.style.Icon({
					anchor: [0.5, 0.5],
					anchorXUnits: 'fraction',
					anchorYUnits: 'fraction',
					src: "img/pin.svg"
				})
			});

			var vectorLayer = new ol.layer.Vector({
				source: vectorSource,
				style: iconStyle,
				updateWhileAnimating: true,
				updateWhileInteracting: true,
			});

			map.addLayer(vectorLayer);

			map.on('singleclick', function(evt) {
				var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
					return feature;
				});
		
				if (feature) {
					var coordinate = feature.getGeometry().getCoordinates();
					var props = feature.getProperties();
					var info = '<div style="width:220px; margin-top:3px">' 
						+ '<strong>'
						+ props.name 
						+ '</strong><br>'
						+ props.address
						+ '</div>';
					// console.log(props.desc);

					popupOverlay.setPosition(undefined);
					closer.blur();

					content.innerHTML = info;
					popupOverlay.setPosition(coordinate);
				}
			});

			let center = [data.lon, data.lat];
			const centerCoords = ol.proj.fromLonLat(center);
			view.setCenter(centerCoords);
			view.setZoom(10);
		});
}