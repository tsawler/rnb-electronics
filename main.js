let map;
let view;

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const baseLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHNhd2xlciIsImEiOiJja2E2dXV2OTIwZDRoMnZtbmIzaWN3MTUzIn0.ZsPf1wVUQskg_SfD6pXh1Q'
    })
})

document.addEventListener("DOMContentLoaded", function (event) {
    init();
    // document.getElementById("location").addEventListener('change', function () {
    //     performSearch();
    // })
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


    var attribution = new ol.control.Attribution({
        collapsible: true,
        collapsed: true,
    });



    view = new ol.View({
        center: nbMiddleMercator,
        zoom: 8,
        maxZoom: 20,
        minZoom: 2,

    })

    map = new ol.Map({
        view: view,
        layers: [
            baseLayer,
        ],
        target: 'js-map',
        keyboardEventTarget: document,
        controls: ol.control.defaults({ attribution: false }).extend([
            fullScreenControl,
            zoomSliderControl,
            zoomToExtentControl,
            attribution,
        ])
    })


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



function performSearch() {
    let searchField = document.getElementById("location");
    let searchTerm = searchField.value;
    let searchButton = document.getElementById("search-button");

    if (searchTerm !== "") {

        searchButton.innerHTML = "Searching...";
        searchField.setAttribute("disabled", "disabled");

        var dataURL;
        if (window.location.protocol != 'https:') {
            dataURL = window.location.protocol + '//' + window.location.hostname + ':8080/electronics?city=' + searchTerm;
        } else {
            dataURL = window.location.protocol + '//' + window.location.hostname + '/electronics?city=' + searchTerm;
        }

        fetch(dataURL)
            .then(response => response.json())
            .then(data => {

                document.getElementById("results").innerHTML = "";

                if (data.ok) {
                    let depotList = "";

                    let locations = data.locations;

                    var iconFeatures = [];

                    var count = 0;
                    locations.forEach(function (item) {
                        count = count + 1;
                        var iconFeature = new ol.Feature({
                            type: 'click',
                            itemId: count,
                            desc: item.description,
                            name: item.store,
                            address: item.address,
                            geometry: new ol.geom.Point(ol.proj.transform([item.lng, item.lat], 'EPSG:4326', 'EPSG:3857')),
                        });
                        iconFeatures.push(iconFeature);

                        var current = `
                        <div id="place-${count}" class="depot" style="width:100%; padding: 1em; margin-top:3px">
							<strong>
							${item.store}
							</strong><br>
                            ${item.address}
                            <br>
                            ${item.products}

                            <br>
                            <a class="btn btn-success btn-sm" href="javascript:" onclick="getDirections('${item.lat}', '${item.lng}')">Get Directions</a>
                            </div>
                            <hr>
                        `;
                        depotList = depotList + current;
                    });

                    document.getElementById("results").innerHTML = depotList;

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


                    // remove existng layers from previous search, if any
                    const layers = [...map.getLayers().getArray()]
                    layers.forEach((layer) => {
                        if (layer !== baseLayer) {
                            map.removeLayer(layer);
                        }
                    });

                    let vectorLayer = new ol.layer.Vector({
                        source: vectorSource,
                        style: iconStyle,
                        updateWhileAnimating: true,
                        updateWhileInteracting: true,
                    });

                    map.addLayer(vectorLayer);

                    map.on('singleclick', function (evt) {
                        var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
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

                            popupOverlay.setPosition(undefined);
                            closer.blur();
                            let depots = document.getElementsByClassName("depot");
                            for (let i = 0; i < depots.length; i++) {
                                depots[i].classList.remove("highlighted");
                            }
                            document.getElementById("place-" + props.itemId).classList.add("highlighted");

                            content.innerHTML = info;
                            popupOverlay.setPosition(coordinate);
                        }
                    });

                    let center = [data.lon, data.lat];
                    const centerCoords = ol.proj.fromLonLat(center);
                    addMapMarker(data.lat, data.lon);

                    view.animate({
                        center: centerCoords,
                        zoom: 12,
                        duration: 500
                    });
                    searchButton.innerHTML = "Find";
                    searchField.removeAttribute("disabled");

                } else {
                    Swal.fire(
                        '',
                        'Unable to find ' + searchTerm,
                        'error'
                    );

                    const nbMiddleLatLon = [-66.2861827, 46.512442];
                    const nbMiddleMercator = ol.proj.fromLonLat(nbMiddleLatLon);
                    searchButton.innerHTML = "Find";
                    searchField.removeAttribute("disabled");

                    view.animate({
                        center: nbMiddleMercator,
                        zoom: 7,
                        duration: 500
                    });
                }
            });
    }
}

function addMapMarker(lat, lng) {
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
                src: "./img/blue.svg"
            })
        })
    });

    map.addLayer(vectorLayer);

}

async function getDirections(lat, lon) {
    const { value: formValues } = await Swal.fire({
        title: '',
        html: `
        <form action="https://maps.google.com/maps" method="get" id="get-directions" target="_blank"> 
        <div class="form-group">
          <label for="start">Enter starting address</label>
          <input type="text" class="form-control" id="starting-point" name="saddr">
        </div>
        <input type="hidden" name="daddr" value="${lat},${lon}" />
      </form>
        `,
        focusConfirm: false,
        showConfirmButton: true,
        showCancelButton: true,
        preConfirm: () => {
            return [
              document.getElementById('starting-point').value,
            ]
          }
      })

      if (formValues) {
        document.getElementById("get-directions").submit();
      }
}