import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import H, { geo } from '@here/maps-api-for-javascript';
import { PinDialogComponent } from '../general/dialog/pin-dialog/pin-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent {
  private map?: H.Map;
  @Input() public zoom = 2;
  @Input() public lat = 0;
  @Input() public lng = 0;

  isMarker: boolean = false;
  markers: any=[];
  @ViewChild('map') mapDiv?: ElementRef;

  private timeoutHandle: any;
  @Output() notify = new EventEmitter();
  @Output() hitPoint = new EventEmitter();

  constructor(public dialog: MatDialog) {}

  openDialog( data : any) {
    const dialogRef = this.dialog.open(PinDialogComponent, {
      width: '600px',
      data: {data}
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      console.log(`Dialog result: ${result}`);
      this.isMarker = false;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    clearTimeout(this.timeoutHandle);
    this.timeoutHandle = setTimeout(() => {
      if (this.map) {
        if (changes['zoom'] !== undefined) {
          this.map.setZoom(changes['zoom'].currentValue);
        }
        if (changes['lat'] !== undefined) {
          this.map.setCenter({
            lat: changes['lat'].currentValue,
            lng: this.lng,
          });
        }
        if (changes['lng'] !== undefined) {
          this.map.setCenter({
            lat: this.lat,
            lng: changes['lng'].currentValue,
          });
        }
      }
    }, 100);
  }

  ngAfterViewInit(): void {
    let self = this;
    if (!this.map && this.mapDiv) {
      // Instantiate a platform, default layers and a map as usual.
      const platform = new H.service.Platform({
        apikey: 'KyObo0tFQfwTCFr5mtbgvvT6KxicyFV5tYSGNoz0_Fw',
      });
      const layers = platform.createDefaultLayers();
      const map = new H.Map(
        this.mapDiv.nativeElement,
        // Add type assertion to the layers object...
        // ...to avoid any Type errors during compilation.
        (layers as any).vector.normal.map,
        {
          pixelRatio: window.devicePixelRatio,
          center: { lat: 28, lng: 77 },
          zoom: 5,
        }
      );
      // add a resize listener to make sure that the map occupies the whole container
      window.addEventListener('resize', () => map.getViewPort().resize());

      // onResize(this.mapDiv.nativeElement, () => {
      //   map.getViewPort().resize();
      // });
      this.map = map;
      map.addEventListener('mapviewchange', (ev: H.map.ChangeEvent) => {
        this.notify.emit(ev);
      });
      map.addEventListener('tap', (ev: any) => {
        var coordinates = map.screenToGeo(
          ev.currentPointer.viewportX,
          ev.currentPointer.viewportY
        );
        this.reverseGeocode(map ,
          coordinates!.lat || 0,
          coordinates!.lng || 0,
          platform
        )

      });
      new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    }
  }

  /**
   *  Adds Pin on the specified coordinates
   * @param map
   * @param map map object
   * @param lat Latittude of pin
   * @param lng Longitude of pin
   * @param platform platform object intialised with API Key
   * @param title
   */
  addMarker(map: any , platform: any ,lat : any , lng : any , result : any){

    const self= this;
      // Put Marker on the latitude and longitude
      var icon = new H.map.Icon('../../assets/location-pin.png', {
        size: { w: 50, h: 50 },
      });


      var marker = new H.map.Marker(
        {
       lat , lng
        },
        { data: result, icon: icon }
      );

      marker.addEventListener('tap', function (evt: any) {
        self.openDialog(result);
        console.log(marker, 'pin');

        self.isMarker = true;
      });

      if (!self.isMarker) {
        console.log(marker);

        map.addObject(marker);
        self.markers.push(marker);
        this.hitPoint.emit(this.markers)
        console.log(map)
        self.isMarker = false;
      }
  }
  /**
   *
   * @param map map object
   * @param lat Latittude of pin
   * @param lng Longitude of pin
   * @param platform platform object intialised with API Key
   * @returns
   */
 reverseGeocode(map: any , lat: any, lng: any, platform?: any) {
    var geocoder = platform.getSearchService(),
      reverseGeocodingParameters = {
        at: lat + ',' + lng, // Berlin
        limit: '1',
      };
    let result;
    geocoder.reverseGeocode(
      reverseGeocodingParameters,
      (result: any) => {
        this.addMarker(map, platform, lat , lng , result.items[0]);
      },
      this.onError
    );
    return result;
  }
  onError(error: any) {
    alert("Can't reach the remote server");
  }
}
