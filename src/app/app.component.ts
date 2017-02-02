import {Component, ChangeDetectionStrategy, AfterViewInit, OnInit, ViewEncapsulation} from "@angular/core";
import {OAuthService} from "angular2-oauth2/oauth-service";
import {OAuthConfigStore} from "./kubernetes/store/oauth-config-store";
import {Observable} from "rxjs";

@Component({
  host:{
    'class':'app app-component flex-container in-column-direction flex-grow-1'
  },
  selector: 'f8-app',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class AppComponent implements OnInit, AfterViewInit {
  name = 'Fabric8 Console';

  title = 'Fabric8 Console';
  url = 'https://www.twitter.com/fabric8io';
  loggedIn = true;

  constructor(private oauthService: OAuthService, private oauthConfigStore: OAuthConfigStore) {

    // set the scope for the permissions the client should request
    this.oauthService.scope = "user:full";

    // set to true, to receive also an id_token via OpenId Connect (OIDC) in addition to the
    // OAuth2-based access_token
    // setting to true doesn't work with openshift oauth
    this.oauthService.oidc = false;

    // Use setStorage to use sessionStorage or another implementation of the TS-type Storage
    // instead of localStorage
    this.oauthService.setStorage(localStorage);
//    this.oauthService.setStorage(sessionStorage);

    this.oauthService.redirectUri = window.location.origin;
    this.oauthService.clientId = "fabric8";
  }

  ngOnInit(): void {
  }


  protected configureOAuth() {
  }


  ngAfterViewInit() {
    if (this.oauthConfigStore.config.authorizeUri) {
      this.checkLoggedIn();
    } else {
      console.log("Not loaded the OAuthConfig yet so lets check again when its loaded");
      this.oauthConfigStore.resource.subscribe(config => {
        var authorizeUri = config.authorizeUri;
        console.log("OAuthConfig loaded with URI: " + authorizeUri);
        if (authorizeUri) {
          this.checkLoggedIn();
        }
      });
    }


    $(document).ready(function () {
      // matchHeight the contents of each .card-pf and then the .card-pf itself
      $(".row-cards-pf > [class*='col'] > .card-pf .card-pf-title").matchHeight();
      $(".row-cards-pf > [class*='col'] > .card-pf > .card-pf-body").matchHeight();
      $(".row-cards-pf > [class*='col'] > .card-pf > .card-pf-footer").matchHeight();
      $(".row-cards-pf > [class*='col'] > .card-pf").matchHeight();

      // Initialize the vertical navigation
      $().setupVerticalNavigation(true);
    });
  }

  protected checkLoggedIn() {
    let config = this.oauthConfigStore.config;

    this.oauthService.loginUrl = config.authorizeUri;
    this.oauthService.issuer = config.issuer;
    this.oauthService.logoutUrl = config.logoutUri;
    this.oauthService.clientId = config.clientId || "fabric8";

    let token = this.oauthService.getAccessToken();
    if (this.oauthService.hasValidAccessToken()) {
      console.log("has valid OAuth token from auth URI: " + config.authorizeUri);
    } else {
      console.log("no valid OAuth token at auth URI: " + config.authorizeUri);
      token = null;
    }

    if (token) {
      // lets setup a timer for when the token expires

      // TODO when this code is merged:
      // https://github.com/manfredsteyer/angular2-oauth2/issues/25
      // lets use:
      //
      //let expiresAt = this.oauthService.expiresAt;
      let expires = expiresAt();
      if (expires) {
        console.log("The token expires at " + expires);
        Observable.timer(expires).subscribe(() => {
          console.log("OAuth token has expired so lets login again");
          if (!this.oauthService.tryLogin({
              onTokenReceived: context => {
                if (context) {
                  token = context.accessToken;
                }
              }
            })) {
            this.oauthService.initImplicitFlow();
          }
        });
      }
    }
    if (!token && config.authorizeUri) {
      if (!this.oauthService.tryLogin({
          onTokenReceived: context => {
            if (context) {
              token = context.accessToken;
            }
          }
        })) {
        this.oauthService.initImplicitFlow();
      }
    }
    return token;
  }
}

function expiresAt(): Date {
  var expiresAt = localStorage.getItem("expires_at");
  if (expiresAt) {
      var i = parseInt(expiresAt);
      if (i) {
          return new Date(i);
      }
  }
  return null;
}
